"""Ricâl kayıt defteri: kütüphanedeki biyografi sözlükleri (bölüm başlıkları kişi adı olan kitaplar) ve râvi bağları.
1) Biyografik kitap: bölüm başlıklarının ≥%40'ı kişi adı biçiminde (X b. Y, Ebû X, İbn X) ve ≥100 madde.
2) Başlık temizliği: harekeler, sayılar, ayraçlar, rumuzlar (ع، خ م د س gibi tek-iki harfli işaretler) atılır.
3) Anahtar: "ism b. baba" (bileşik isimler: عبد/أبو + kelime tek isim sayılır) ilk üç birim; varsa dede dördüncü birim.
4) Râviler (data/k4/raviler.json; elle verilmiş tam ad > Takrîb tam adı > kayıt adı) anahtarla aranır; künye/nisbe adları (أبو هريرة, عكرمة مولى ابن عباس) başlık başıyla; bir kitapta 3'ten fazla aynı adlı madde
   varsa dede ile daraltılır, yine çoksa o kitapta bağlanmaz (yanlış kişiye bağlamaktansa boş bırakmak).
Çıktı: site/data/k4/rical.json = {"kitap": {id: [tr_ad, ar_ad, müellif, vefat]}, "ravi": {ravi_id: eser_sayısı}, "istatistik": {...}}
       site/data/k4/rc/{ravi_id}.json = [{"k": kitap, "m": [[bölüm, başlık]], "b": [diğer baskılar], "tur": biyografi|musned}]  ve /home/claude/lib/rical/adlar.json (tüm maddeler: anahtar → [[kitap, bölüm, başlık]])"""
import json, re, collections
L = '/home/claude/lib/rical'; SITE = '/home/claude/vahiy-/site/data'
d = json.load(open(f'{L}/dizinler.json')); E, D = d['eser'], d['dizin']
def temiz(t):
    t = re.sub(r'[ً-ْٰـ¬]', '', t or '')
    t = re.sub(r'[\d٠-٩]+', ' ', t); t = re.sub(r'[\[\]\(\)\{\}«»\*\-–:،,\.؛/"\']', ' ', t)
    t = re.sub('[أإآ]', 'ا', t).replace('ى', 'ي').replace('ة', 'ه')
    w = t.split()
    while w and (len(w[0]) <= 2 and w[0] not in ('ام',)): w.pop(0)   # rumuz: ع خ م د س ق ت 4 ...
    return w
def birimler(w):
    out, i = [], 0
    while i < len(w):
        x = w[i]
        if x in ('عبد', 'ابو', 'ابي', 'ام', 'ذو', 'ذي') and i + 1 < len(w): out.append(x.replace('ابي', 'ابو') + ' ' + w[i + 1]); i += 2; continue
        out.append(x); i += 1
    return out
def anahtar(t):
    b = birimler(temiz(t))
    if len(b) >= 3 and b[1] in ('بن', 'ابن', 'بنت'): return ' '.join([b[0], 'بن', b[2]]), (b[4] if len(b) >= 5 and b[3] in ('بن', 'ابن') else '')
    return None, ''
def kisi(t):
    w = temiz(t); return len(w) >= 2 and (len(w) >= 3 and w[1] in ('بن', 'ابن', 'بنت') or w[0] in ('ابو', 'ابي', 'ابن', 'ام'))
BIO = {}
for i, b in D.items():
    if not b: continue
    tt = [x for x in b if x[3]]
    k = sum(1 for x in tt if kisi(x[1]))
    if k >= 100 and k / max(1, len(tt)) >= 0.4: BIO[i] = b
IDX = collections.defaultdict(list)
for i, b in BIO.items():
    for si, x in enumerate(b):
        if not x[3]: continue
        k, dede = anahtar(x[1])
        if k: IDX[k].append((i, si, dede, re.sub(r'\s+', ' ', x[1])[:60]))
# tek isim ya da künye ile kayıtlı, kimliği selef_tr.json'da belirlenmiş râvilerin tam adları (elle; Takrîb ve Tehzîb'deki madde adları)
ELLE = {'211972': 'عائشة بنت أبي بكر الصديق', '212025': 'غزوان أبو مالك الغفاري', '211969': 'سعد بن مالك بن سنان', '212047': 'باذام أبو صالح',
        '212051': 'سفيان بن سعيد بن مسروق', '211978': 'أبي بن كعب بن قيس', '211988': 'مقاتل بن سليمان', '212069': 'صدي بن عجلان',
        '212024': 'عويمر بن زيد بن قيس', '212027': 'الحسن بن أبي الحسن', '9269': 'سليمان بن مهران', '212062': 'عبد الله بن قيس بن سليم',
        '212075': 'جندب بن جنادة', '212091': 'علي بن أبي طالب', '212099': 'لاحق بن حميد', '211958': 'هند بنت أبي أمية',
        '212019': 'عطية بن الحارث', '212052': 'معمر بن راشد', '212042': 'عبد الله بن وهب بن مسلم', '212370': 'خالد بن زيد بن كليب',
        '211986': 'عبد الله بن زيد بن عمرو', '1632': 'عبد الله بن حبيب بن ربيعة', '212110': 'عبد الرحمن بن عمرو بن يحمد',
        '704': 'إبراهيم بن يزيد بن شريك', '212015': 'عبد الله بن عثمان بن عامر', '212055': 'علقمة بن قيس بن عبد الله', '212016': 'رفيع بن مهران'}
# künye/nisbe ile anılanlar için ön ek dizini: temiz başlığın ilk iki-üç kelimesi
ONEK = collections.defaultdict(list)
for i, b in BIO.items():
    for si, x in enumerate(b):
        if x[3]:
            w = temiz(x[1])
            for n in (2, 3):
                if len(w) >= n: ONEK[' '.join(w[:n])].append((i, si, '', re.sub(r'\s+', ' ', x[1])[:60]))
R = json.load(open(f'{SITE}/k4/raviler.json'))['raviler']
OUT = collections.defaultdict(list); ist = collections.Counter()
for rid, r in R.items():
    ad = ELLE.get(rid) or (r.get('takrib') or {}).get('metin') or r['ad']
    k, dede = anahtar(ad)
    if not k: k, dede = anahtar(r['ad'])
    by = collections.defaultdict(list)
    if k:
        for m in IDX.get(k, []): by[m[0]].append(m)
    else:
        w = temiz(ad)[:3]
        if len(w) < 2 or len(' '.join(w)) < 7: ist['anahtar_yok'] += 1; continue   # tek isim: belirsiz, bağlanmaz
        for m in ONEK.get(' '.join(w), []): by[m[0]].append(m)
        ist['onek'] += 1
    if rid in ELLE: ist['elle'] += 1
    for i, ms in by.items():
        if len(ms) > 3 and dede: ms = [m for m in ms if m[2] == dede]
        if not ms or len(ms) > 3: ist['cok_aday'] += 1; continue
        for m in ms: OUT[rid].append([m[0], m[1], m[3]])
    ist['bagli' if OUT.get(rid) else 'bulunamadi'] += 1
# aynı eserin baskıları tek eser: ilk baskı (en çok bağlı olan) kalır, diğerleri "baskı" olarak eklenir
def eser_ad(i): return re.sub(r'\s*[-–]\s*(ط|ت)\s.*$|\s*\(.*?\)\s*$', '', E[i][1]).strip()
import os, gzip
os.makedirs(f'{SITE}/k4/rc', exist_ok=True)
for f in os.listdir(f'{SITE}/k4/rc'): os.remove(f'{SITE}/k4/rc/{f}')
KUL = {}
for rid, L_ in OUT.items():
    grup = collections.OrderedDict()
    for x in sorted(L_, key=lambda x: E[x[0]][3] or 9999):
        grup.setdefault(eser_ad(x[0]), []).append(x)
    kayit = []
    for ad, xs in grup.items():
        ana = collections.Counter(x[0] for x in xs).most_common(1)[0][0]
        kayit.append({'k': ana, 'm': [[x[1], x[2]] for x in xs if x[0] == ana], 'b': sorted({x[0] for x in xs} - {ana}),
                      'tur': 'musned' if E[ana][4] == 'hadis' else 'biyografi'})
        for x in xs: KUL[x[0]] = E[x[0]][:4]
    json.dump(kayit, open(f'{SITE}/k4/rc/{rid}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({'kitap': KUL, 'ravi': {rid: len(open(f'{SITE}/k4/rc/{rid}.json').read()) and len(json.load(open(f'{SITE}/k4/rc/{rid}.json'))) for rid in OUT},
           'istatistik': {**ist, 'biyografi_kitabi': len(BIO), 'madde': sum(len(v) for v in IDX.values())}},
          open(f'{SITE}/k4/rical.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({'kitap': {i: E[i][:4] for i in BIO}, 'ad': IDX}, open(f'{L}/adlar.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(dict(ist), 'biyografi kitabı', len(BIO), 'anahtarlı madde', sum(len(v) for v in IDX.values()), 'bağ', sum(len(v) for v in OUT.values()))
