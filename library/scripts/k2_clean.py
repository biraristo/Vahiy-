"""Katman 2 temizliği (build_k2.py'den sonra çalışır).
Quranpedia bazı eserlerin fihrist, künye ve cilt sonu dizin sayfalarını son ayetlere (çoğu 114:1) bağlamış.
1) Dizin/fihrist/künye sayfaları atılır (sayısal yoğunluk ve başlık işaretleriyle).
2) Tek bir ayete 3+ cilt yayılan blok tutarsızdır: yalnızca o surenin başlığından başlayan ilk cilt parçası tutulur.
3) Atılan sayfaya işaret eden tekrar referansları da atılır; ayet dizini (i/) yeniden sayılır.
Rapor: data/k2/temizlik.json"""
import json, gzip, glob, re, collections, os
R = '/home/claude/vahiy-/site/data/k2'
SN = [x['ar'] for x in json.load(open('/home/claude/vahiy-/site/data/k0/surahs.json'))['sureler']]
DIG = re.compile(r'[0-9٠-٩]'); FOOT = re.compile(r'\(\s*[0-9٠-٩]{1,3}\s*\)')
def is_index(t):
    h = t[:300]
    if 'فهرس' in h or 'حقوق الطبع' in t[:120] or 'رقم الآية الآية المفسرة' in h: return True
    u = FOOT.sub('', t)
    return len(u) > 200 and len(DIG.findall(u)) / len(u) > 0.08
rep = collections.Counter(); blocks = []
files = sorted(glob.glob(f'{R}/t/*/*.json.gz'))
data = {}
for f in files:
    s, a = map(int, re.findall(r't/(\d+)/(\d+)', f)[0])
    data[(s, a)] = json.load(gzip.open(f))
# 1+2
for (s, a), d in data.items():
    P = d['p']; keep = []; g = collections.defaultdict(list)
    for r in P:
        if isinstance(r[3], str) and is_index(r[3]):
            rep['dizin_sayfasi'] += 1; continue
        keep.append(r)
        if isinstance(r[3], str): g[r[0]].append(r)
    drop = set()
    for w, x in g.items():
        cil = [r[1] for r in x]
        if len(set(cil)) >= 3:
            name = SN[s - 1].replace('سُورَةُ ', '')
            st = next((i for i, r in enumerate(x) if 'سورة ' + name in r[3]), 0)
            c0 = x[st][1]; ok = []
            for r in x[st:]:
                if r[1] != c0: break
                ok.append(id(r))
            for r in x:
                if id(r) not in set(ok): drop.add(id(r))
            blocks.append({'ayet': f'{s}:{a}', 'eser': w, 'cilt_sayisi': len(set(cil)), 'sayfa': len(x), 'tutulan': len(ok)})
    rep['tutarsiz_blok_sayfasi'] += len(drop)
    d['p'] = [r for r in keep if id(r) not in drop]
# 3
have = {k: {(r[0], r[1], r[2]) for r in d['p'] if isinstance(r[3], str)} for k, d in data.items()}
for (s, a), d in data.items():
    nw = []
    for r in d['p']:
        if isinstance(r[3], dict):
            ts, ta = map(int, r[3]['ref'].split(':'))
            if (r[0], r[1], r[2]) not in have.get((ts, ta), ()):
                rep['kopan_referans'] += 1; continue
        nw.append(r)
    d['p'] = nw
for (s, a), d in data.items():
    with gzip.open(f'{R}/t/{s}/{a}.json.gz', 'wt', encoding='utf8', compresslevel=9) as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
for s in range(1, 115):
    p = f'{R}/i/{s}.json'; I = json.load(open(p))
    for k in I['ayetler']:
        a = int(k.split(':')[1])
        I['ayetler'][k] = [[w, n] for w, n in collections.Counter(r[0] for r in data[(s, a)]['p']).items()]
    json.dump(I, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
out = dict(rep); out['bloklar'] = blocks
json.dump(out, open('/home/claude/vahiy-/data/k2/temizlik.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'bloklar'}, ensure_ascii=False), len(blocks), blocks[:6])
# Elle: qp335 (el-Mevsûatü'l-Kur'âniyye) 114:1 bloğu sîret/mushaf tarihi sayfalarıdır, tamamen çıkarıldı (bkz. temizlik.json 'elle').
