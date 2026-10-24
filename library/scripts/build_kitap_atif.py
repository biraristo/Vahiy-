"""Kitaptan ayete ters bağ: her kitabın her bölümünde geçen ayetler (kutup_tara.py hits-*.tsv'den).
Çıktı: /home/claude/lib/atif/r2/kitap/{id}.json (gzip) → R2 atif/kitap/{id}.json
  {"t": toplam_yer, "a": ayet_sayısı, "b": {bölüm: [[sure, ayet, yer_sayısı, sayfa], ...]}}
Okuyucu bölüm açıldığında bu bölümde alıntılanan ayetleri listeler; eser sayfası ayet haritasını çizer."""
import os, json, gzip, glob, collections, xml.etree.ElementTree as ET
ATIF = '/home/claude/lib/atif'; OUT = f'{ATIF}/r2/kitap'
root = ET.parse('/home/claude/lib/raw/tanzil/quran-simple-clean.xml').getroot()
IDX = [(int(s.get('index')), int(a.get('index'))) for s in root for a in s]
DZ = json.load(open('/home/claude/vahiy-/site/data/kutuphane/dizin.json'))
B = collections.defaultdict(lambda: collections.defaultdict(dict))
for f in sorted(glob.glob(f'{ATIF}/hits-*.tsv')):
    for line in open(f, encoding='utf8'):
        p = line.split('\t', 8)
        if len(p) < 9: continue
        k = DZ['y'].get(p[0], p[0]); b = int(p[1])
        for ai in range(int(p[4]), int(p[5]) + 1):
            d = B[k][b].get(ai)
            if d: d[0] += 1
            else: B[k][b][ai] = [1, p[3]]
os.makedirs(OUT, exist_ok=True)
for k, S in B.items():
    o = {'b': {str(b): [[*IDX[ai], n, sf] for ai, (n, sf) in sorted(A.items())] for b, A in sorted(S.items())}}
    o['t'] = sum(r[2] for v in o['b'].values() for r in v); o['a'] = len({ai for A in S.values() for ai in A})
    with gzip.open(f'{OUT}/{k}.json', 'wt', encoding='utf8', compresslevel=9) as w: json.dump(o, w, ensure_ascii=False, separators=(',', ':'))
print('kitap', len(B))
