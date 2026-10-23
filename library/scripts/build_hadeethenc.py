"""HadeethEnc (Hadis Ansiklopedisi) → ayetler. Hadis metni, şerhi ve faydalarındaki ayet alıntıları k3_scan
yöntemiyle bulunur (en az 6 kelime ya da tam kısa ayet). Arapça asıl + Türkçe çeviri/şerh birlikte saklanır.
Çıktı: site/data/k4/he/{sure}.json  {"ayet": {"s:a": [id,...]}, "hadis": {id: {...}}}"""
import json, os, glob, io, sys, collections, re
sys.argv = ['x', '-1', '1']
exec(open('/home/claude/lib/scripts/k3_scan.py').read().split('def openiti_jobs')[0])
R = '/home/claude/lib/raw/hadeethenc'
OUT = '/home/claude/vahiy-/site/data/k4/he'
os.makedirs(OUT, exist_ok=True)
AY = [ayah_len[0]]  # yer tutucu
SOFF2 = {}
IDX2 = []
for s in range(1, 115):
    pass
import xml.etree.ElementTree as ET
root = ET.parse('/home/claude/lib/raw/tanzil/quran-simple-clean.xml').getroot()
for sura in root:
    for aya in sura:
        IDX2.append(f"{sura.get('index')}:{aya.get('index')}")
cat = {c['id']: c['title'] for c in json.load(open(f'{R}/kategoriler.json'))['tr']}
cat_ar = {c['id']: c['title'] for c in json.load(open(f'{R}/kategoriler.json'))['ar']}
links = collections.defaultdict(set); recs = {}
for f in glob.glob(f'{R}/ar/*.json'):
    a = json.load(open(f)); i = a['id']
    t = json.load(open(f'{R}/tr/{i}.json')) if os.path.exists(f'{R}/tr/{i}.json') else {}
    txt = ' '.join([a.get('hadeeth') or '', a.get('explanation') or '', ' '.join(a.get('hints') or [])])
    out = io.StringIO()
    scan(txt.split(), [], out, 'he', lambda j: (0, 0))
    found = set()
    for line in out.getvalue().splitlines():
        p = line.split('\t'); fa, la = int(p[3]), int(p[4])
        for k in range(fa, la + 1): found.add(IDX2[k])
    for k in found: links[k].add(i)
    recs[i] = {'id': i, 'ar': {k: a.get(k) for k in ('title', 'hadeeth', 'attribution', 'grade', 'explanation', 'hints', 'reference')},
               'tr': {k: t.get(k) for k in ('title', 'hadeeth', 'attribution', 'grade', 'explanation', 'hints', 'words_meanings')} if t else None,
               'kategori': [cat.get(c) or cat_ar.get(c) for c in a.get('categories') or []], 'ayetler': sorted(found, key=lambda x: tuple(map(int, x.split(':')))),
               'url': f'https://hadeethenc.com/tr/browse/hadith/{i}'}
n = 0
for s in range(1, 115):
    A = {k: sorted(v, key=int) for k, v in links.items() if k.startswith(f'{s}:')}
    ids = {x for v in A.values() for x in v}
    json.dump({'kaynak': 'HadeethEnc — Hadis Ansiklopedisi (hadeethenc.com)', 'ayet': A, 'hadis': {x: recs[x] for x in ids}},
              open(f'{OUT}/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    n += len(A)
print(len(recs), 'hadis;', sum(1 for r in recs.values() if r['ayetler']), 'hadis ayete bağlı;', n, 'ayet;', sum(1 for r in recs.values() if r['tr']), 'Türkçe')
