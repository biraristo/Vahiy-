"""OpenITI'den Şâmile'de olmayan eser adaylarını çıkarır.
Kurallar (doğruluk önce):
- Şâmile kaynaklı sürümler (sürüm adında Shamela) atlanır: o eser Şâmile'den alınır.
- Düzeltilmemiş OCR (uncorrected_OCR=True) ve el yazması OCR alt külliyatı (MSS) yayına alınmaz; ayrı listeye yazılır.
- Hindawi: yalnız vefatı h. 1350 ve öncesi müellifler.
- Aynı eserin birden çok sürümü: öncelik Masaha/GRAR (düzeltilmiş) > Shia/Zaydiyya/İbâdiyye > diğer > JK/ShamAY.
- Her adayın imzası: metnin ilk ~6000 harfinden 5'li kelime dizileri (Şâmile ile içerik karşılaştırması için).
Çıktı: /home/claude/lib/raf/openiti_aday.json, /home/claude/lib/raf/openiti_ocr_disi.json"""
import csv, re, json, zipfile, hashlib, collections
csv.field_size_limit(10 ** 9)
R = list(csv.DictReader(open('/home/claude/lib/raw/openiti_pri_meta.tsv'), delimiter='\t'))
Z = zipfile.ZipFile('/home/claude/lib/raw/openiti_pri_data.zip')
ZN = {}
for n in Z.namelist():
    b = n.rsplit('/', 1)[-1]
    if b and '.' in b and not b.endswith(('.yml', '.md')): ZN.setdefault(b, n)
ONCELIK = [('Masaha', 0), ('GRAR', 0), ('Shia', 1), ('Zaydiyya', 1), ('ShamIbadiyya', 1), ('JK', 4), ('ShamAY', 4), ('ShamY', 4)]
def oncelik(v):
    kay = v.split('.')[2]
    for k, p in ONCELIK:
        if kay.startswith(k): return p
    return 2
def norm(t):
    t = re.sub(r'[ً-ْٰـ]', '', t); t = re.sub('[أإآٱ]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^ء-يپچگکی ]+', ' ', t).split()
def imza(ws):
    return sorted({int(hashlib.md5(' '.join(ws[i:i + 5]).encode()).hexdigest()[:12], 16) for i in range(0, max(0, len(ws) - 5))})[:400]
gruplar = collections.defaultdict(list); disi = []
for r in R:
    v = r['version_uri']; dil = r['language']
    if not (dil.startswith('ara') or dil.startswith('per')): continue
    if 'Shamela' in v: continue
    try: vef = int(v[:4])
    except ValueError: vef = None
    kay = v.split('.')[2]
    if r['uncorrected_OCR'] == 'True' or r['subcorpus'] == 'MSS' or kay.startswith(('Kraken', 'AOCP')):
        disi.append({'v': v, 'neden': 'OCR', 'baslik': r['title_ar']}); continue
    if kay.startswith('Hindawi') and (vef is None or vef > 1350):
        disi.append({'v': v, 'neden': 'Hindawi modern', 'baslik': r['title_ar']}); continue
    gruplar[r['book']].append(r)
aday = []
for book, L in gruplar.items():
    L.sort(key=lambda r: (oncelik(r['version_uri']), -int(r['tok_length'] or 0)))
    r = L[0]; v = r['version_uri']
    n = ZN.get(v)
    if not n: continue
    t = Z.read(n).decode('utf8', 'replace')
    i = t.find('#META#Header#End#'); t = t[i + 17:] if i >= 0 else t
    ws = norm(re.sub(r'PageV\d+P\d+|ms\d+|#|~~|\|', ' ', t[:20000]))[:1200]
    tags = r['tags']
    kat = (re.search(r'Shamela@([^:]+?)\s*(?:::|$)', tags) or re.search(r'JK@([^:]+?)\s*(?:::|$)', tags))
    aday.append({'v': v, 'book': book, 'dil': r['language'][:3], 'vefat': int(v[:4]) if v[:4].isdigit() else None, 'baslik': r['title_ar'], 'muellif': r['author_ar'],
                 'kategori': kat.group(1).strip() if kat else '', 'tags': tags[:600], 'tok': int(r['tok_length'] or 0), 'diger_surum': [x['version_uri'] for x in L[1:]], 'imza': imza(ws)})
json.dump(aday, open('/home/claude/lib/raf/openiti_aday.json', 'w'), ensure_ascii=False)
json.dump(disi, open('/home/claude/lib/raf/openiti_ocr_disi.json', 'w'), ensure_ascii=False)
print(len(aday), 'aday;', len(disi), 'yayına alınmayan', collections.Counter(d['neden'] for d in disi), collections.Counter(a['dil'] for a in aday))
