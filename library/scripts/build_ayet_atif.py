"""Ayet atıf dizini: kutup_tara.py çıktısından (hits-*.tsv) ayet başına kitap listesi.
Çıktı (R2'ye atif_yukle.py ile; statik dosya sınırı yüzünden):
  /home/claude/lib/atif/r2/{s}/{a}.json   : {"g": {grup: [[kitap_id, yer_sayısı, [[cilt, sayfa, bölüm, tam], ...]], ...]}}
  /home/claude/lib/atif/r2/p/{s}/{a}.json : {kitap_id: [parça, ...]}  (açılınca yüklenir)
  site/data/y/k.json          : {kitap_id: [tr_ad, ar_ad, müellif, vefat, raf]}
  site/data/y/ozet.json       : ayet başına toplam yer ve kitap sayısı; en çok alıntılanan ayetler
  /home/claude/lib/atif/kitap_ayet.json : kitap → {ayet_idx: sayı} (eserin ayet haritası için)
Grup: rafın ruhuna göre (tefsir, hadis, fikih, kelam, tasavvuf, tarih, dil, ulum, cagdas); h. 1343 sonrası → cagdas.
Kitap başına en çok 3 parça saklanır (tam ayet ve uzun alıntı önce), yer sayısı tamdır."""
import sys, os, json, gzip, glob, collections, xml.etree.ElementTree as ET
SITE = '/home/claude/vahiy-/site/data'; OUT = f'{SITE}/y'; ATIF = '/home/claude/lib/atif'; R2 = os.environ.get('R2', f'{ATIF}/r2')
root = ET.parse('/home/claude/lib/raw/tanzil/quran-simple-clean.xml').getroot()
IDX = [(int(s.get('index')), int(a.get('index'))) for s in root for a in s]
DZ = json.load(open(f'{SITE}/kutuphane/dizin.json'))
META = {}
for raf, *_ in DZ['raflar']:
    p = f'{SITE}/kutuphane/{raf}.json'
    if not os.path.exists(p): continue
    for e in json.load(open(p))['eserler']:
        META[e['id']] = [e.get('ad') or '', e.get('ad_ar') or '', e.get('muellif') or e.get('muellif_ar') or '', e.get('vefat'), raf]
for e in json.load(open(f'{SITE}/kutuphane/tefsir.json'))['eserler']:  # tam metni rafta ayrıca gösterilmeyen tefsirler
    if e.get('tam') and e['tam'] not in META:
        META[e['tam']] = [e.get('ad') or '', e.get('ad_ar') or '', e.get('muellif') or e.get('muellif_ar') or '', e.get('vefat'), 'tefsir']
GRUP = {'tefsir': 'tefsir', 'ulum': 'ulum', 'hadis': 'hadis', 'hadisusul': 'hadis', 'tabakat': 'tarih', 'tarih': 'tarih', 'kelam': 'kelam',
        'felsefe': 'kelam', 'fikih': 'fikih', 'usul': 'fikih', 'tasavvuf': 'tasavvuf', 'lugat': 'dil', 'edebiyat': 'dil', 'farsca': 'tasavvuf', 'genel': 'ulum'}
def grup(k):
    m = META.get(k)
    if not m: return None
    if (m[3] or 0) >= 1343: return 'cagdas'
    return GRUP.get(m[4], 'ulum')
A = collections.defaultdict(dict)   # ayet_idx → kitap → [sayı, parçalar]
KA = collections.defaultdict(collections.Counter)
say = collections.Counter(); yok = collections.Counter()
for f in sorted(glob.glob(f'{ATIF}/hits-*.tsv')):
    for line in open(f, encoding='utf8'):
        p = line.rstrip('\n').split('\t', 8)
        if len(p) < 9: continue
        k = DZ['y'].get(p[0], p[0])
        if k not in META: yok[p[0]] += 1; continue
        c, sf, b, fa, la, n, tam, sn = p[2], p[3], int(p[1]), int(p[4]), int(p[5]), int(p[6]), p[7] == '1', p[8]
        for ai in range(fa, la + 1):
            d = A[ai].get(k)
            if d is None: d = A[ai][k] = [0, []]
            d[0] += 1; KA[k][ai] += 1
            h = d[1]
            if len(h) < 3: h.append((tam, n, c, sf, b, sn))
            else:
                w = min(range(3), key=lambda i: (h[i][0], h[i][1]))
                if (tam, n) > (h[w][0], h[w][1]): h[w] = (tam, n, c, sf, b, sn)
        say['satir'] += 1
os.makedirs(OUT, exist_ok=True)
OZ = {}
for ai, (s, a) in enumerate(IDX):
    G = collections.defaultdict(list); P = {}
    for k, (n, h) in A.get(ai, {}).items():
        g = grup(k)
        h = sorted(h, key=lambda x: (int(x[2]) if x[2].isdigit() else 0, int(x[3]) if x[3].isdigit() else 0))
        G[g].append([k, n, [[x[2], x[3], x[4], int(x[0])] for x in h]]); P[k] = [x[5] for x in h]
    for g in G: G[g].sort(key=lambda r: (META[r[0]][3] or 9999, r[0]))
    for d, v in ((f'{R2}/{s}', {'g': G}), (f'{R2}/p/{s}', P)):
        os.makedirs(d, exist_ok=True)
        with gzip.open(f'{d}/{a}.json', 'wt', encoding='utf8', compresslevel=9) as o: json.dump(v, o, ensure_ascii=False, separators=(',', ':'))
    OZ[f'{s}:{a}'] = [sum(len(v) for v in G.values()), sum(r[1] for v in G.values() for r in v)]
json.dump({k: m for k, m in META.items() if k in KA}, open(f'{OUT}/k.json', 'w'), ensure_ascii=False, separators=(',', ':'))
top = sorted(OZ.items(), key=lambda x: -x[1][0])[:200]
json.dump({'ayetler': OZ, 'en_cok': top, 'kitap_sayisi': len(KA), 'satir': say['satir']}, open(f'{OUT}/ozet.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({k: dict(v) for k, v in KA.items()}, open(f'{ATIF}/kitap_ayet.json', 'w'), separators=(',', ':'))
print('satır', say['satir'], 'kitap', len(KA), 'eşlenmeyen kitap', len(yok), sum(yok.values()), list(yok.most_common(5)))
