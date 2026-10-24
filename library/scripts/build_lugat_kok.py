"""Lügat ↔ Kur'an kökü eşleştirmesi (madde başlığı kök olan sözlükler).
Kaynak: kütüphanedeki lügat/garîb kitaplarının bölüm dizinleri (R2 kitap/{id}.json).
Bir kitap, bölüm başlıklarının çoğu farklı kök biçimindeyse (≥%40, ≥500 bölüm) "madde başlıklı" sayılır.
Başlık → aday kök: harekeler, köşeli/yuvarlak ayraçlar atılır; hemzeler ء; ى→ي; son harf illetliyse (ا/ى/و/ي) iki biçim de denenir;
iki harfli başlık muzaaf kök sayılır (أب → أبب). Kur'an kökleri: site/data/k0/dizin.json (Quranic Arabic Corpus).
Metin düzeyi (METIN listesi): madde "kök:" satırıyla başlar; bölüm indeksi maddenin geçtiği bölümdür.
Çıktı: site/data/k0/lugat.json = {"kitap": {id: [tr_ad, ar_ad, vefat]}, "kok": {kök: [[id, bölüm, başlık], ...]}}"""
import json, re, gzip, urllib.request, collections
from concurrent.futures import ThreadPoolExecutor
SITE = '/home/claude/vahiy-/site/data'
K = json.load(open(f'{SITE}/k0/dizin.json'))['kok']
def n(t):
    t = re.sub(r'[ً-ْٰـ\[\]\(\)\{\}«»:\.\-،\*\d٠-٩]', '', t or '').strip()
    return re.sub('[أإآؤئٱ]', 'ء', t).replace('ى', 'ي').replace('ة', 'ه')
KN = collections.defaultdict(list)
for k in K: KN[n(k)].append(k)
def kokvari(t):
    t = re.sub(r'^\s*(مقلوبه|مقلوب|باب|مادة)\s*[:：]?', '', t or '').replace('هـ', 'ه')
    t = re.sub(r'\s*·.*$', '', t)
    if re.fullmatch(r'\s*(?:[ء-يأإآؤئ]\s+){1,3}[ء-يأإآؤئ]\s*[:：]?\s*', re.sub(r'[ً-ْٰ()\[\]]', '', t)): t = re.sub(r'\s+', '', t)
    t = n(t)
    return t if ' ' not in t and 2 <= len(t) <= 4 and re.fullmatch('[ء-ي]+', t) and not (t.startswith('ال') and len(t) > 3) else ''
def adaylar(t):
    t = kokvari(t)
    if not t: return []
    c = {t}
    if len(t) == 2: c.add(t + t[1])
    if t[-1] in 'اوي': c |= {t[:-1] + x for x in 'وي'}
    if len(t) == 3 and t[1] == 'ا': c |= {t[0] + x + t[2] for x in 'وي'}
    return [k for x in c for k in KN.get(x, [])]
def al(i):
    try:
        j = urllib.request.urlopen(urllib.request.Request(f'https://vahiy.bunyaminatalay07.workers.dev/r2/kitap/{i}.json', headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read()
        try: return i, json.loads(gzip.decompress(j))['b']
        except Exception: return i, json.loads(j)['b']
    except Exception: return i, None
E = {}
for raf in ('lugat', 'ulum', 'hadisusul', 'tefsir', 'genel'):
    for e in json.load(open(f'{SITE}/kutuphane/{raf}.json'))['eserler']:
        if raf == 'lugat' or re.search('غريب|مفردات|معجم|لغة|ألفاظ', e['ad_ar']): E[e['id']] = e
with ThreadPoolExecutor(16) as ex: D = dict(ex.map(al, E))
OUT = {'kitap': {}, 'kok': collections.defaultdict(list)}
for i, b in D.items():
    if not b or len(b) < 500 or i in ('sh150964',): continue  # Teymûr: âmmiyye sözlüğü
    es = [(si, x[1], adaylar(x[1])) for si, x in enumerate(b) if x[3]]
    kv = [kokvari(x[1]) for x in es]; say = collections.Counter(k for k in kv if k)
    oran = len(say) / max(1, len(es))  # farklı kök biçimli başlık oranı (فصل gibi tekrarlar sayılmaz)
    if oran < 0.4: continue
    e = E[i]; OUT['kitap'][i] = [e.get('ad') or '', e['ad_ar'], e.get('vefat')]
    goren = set()
    for si, t, ks in es:
        for k in ks:
            if (k, i) in goren: continue  # aynı kitapta kökün ilk maddesi
            goren.add((k, i)); OUT['kok'][k].append([i, si, re.sub(r'\s+', ' ', t)[:30]])
    print(i, e['ad_ar'][:40], len(b), round(oran, 2), flush=True)
# Metin düzeyi: madde başı "kök: ..." satırıyla başlayan sözlükler (Lisânü'l-Arab, el-Ayn).
# Kabul: kök harekesiz 2–4 harf, ardından iki nokta; iki noktadan sonraki ilk kelime kökün ilk iki harfini taşır (قال: gibi sözler elenir).
import zlib
METIN = ['sh1687', 'sh1682']
def bin_al(i):
    return urllib.request.urlopen(urllib.request.Request(f'https://vahiy.bunyaminatalay07.workers.dev/r2/kitap/{i}.bin', headers={'User-Agent': 'Mozilla/5.0'}), timeout=900).read()
for i in METIN:
    b = D.get(i) or al(i)[1]
    if not b: continue
    B = bin_al(i); e = E[i]; OUT['kitap'][i] = [e.get('ad') or '', e['ad_ar'], e.get('vefat')]; goren = set(); m = 0
    for si, x in enumerate(b):
        if not x[3]: continue
        try: t = zlib.decompress(B[x[2]:x[2] + x[3]], 31).decode('utf8', 'replace')
        except Exception: continue
        for satir in re.sub('\x01[^\x01]*\x01', '', t).split('\n'):
            r = re.match(r'^\s*([ء-يأإآؤئ]{2,4})\s*:\s*(\S+)', satir)
            if not r: continue
            ilk = re.sub('^(وال|ال|و)', '', n(r.group(2)))
            kk = n(r.group(1))
            if len(ilk) < 2 or kk[0] not in ilk[:3]: continue
            for k in adaylar(r.group(1)):
                if (k, i) in goren: continue
                goren.add((k, i)); OUT['kok'][k].append([i, si, r.group(1)]); m += 1
    print(i, e['ad_ar'][:40], 'metin düzeyi madde', m, flush=True)
# aynı eserin birden çok baskısı: en çok maddesi olan kalır
say = collections.Counter(r[0] for v in OUT['kok'].values() for r in v); tek = {}
for i in sorted(OUT['kitap'], key=lambda i: -say[i]): tek.setdefault(OUT['kitap'][i][1].split(' - ')[0].strip(), i)
kalan = set(tek.values()); OUT['kitap'] = {i: v for i, v in OUT['kitap'].items() if i in kalan}
for k in list(OUT['kok']): OUT['kok'][k] = [r for r in OUT['kok'][k] if r[0] in kalan]
for k in OUT['kok']: OUT['kok'][k].sort(key=lambda r: OUT['kitap'][r[0]][2] or 9999)
json.dump(OUT, open(f'{SITE}/k0/lugat.json', 'w'), ensure_ascii=False, separators=(',', ':'))
kap = sum(1 for k in K if OUT['kok'].get(k))
print('kitap', len(OUT['kitap']), 'kök kapsamı', kap, '/', len(K), 'ortalama', round(sum(len(v) for v in OUT['kok'].values()) / max(1, kap), 1))
