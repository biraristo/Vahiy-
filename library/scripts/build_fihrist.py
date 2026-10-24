"""kuranfihristi.net konu fihristi → site/data/fh/
  etiket.json: {"kaynak", "etiketler": [[ad, ["s:a", ...]], ...]}  (sıra = etiket no)
  {s}.json:    {"ayetler": {"a": [etiket no, ...]}}  (sure şeridi için)
Ham veri: /home/claude/lib/raw/kuranfihristi/fihrist_ham.json (fihrist_cek.py)."""
import json, re, os, unicodedata, collections
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'data')
F = json.load(open('/home/claude/lib/raw/kuranfihristi/fihrist_ham.json'))
S = json.load(open(f'{D}/k0/surahs.json'))['sureler']
def n(t):
    t = unicodedata.normalize('NFKD', t.lower().replace('ı', 'i')); t = ''.join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z]", '', t)
AD = {n(x['tr']): x['n'] for x in S}
AD.update({n(k): v for k, v in {'Fatihâ': 1, 'Al-i İmran': 3, 'Kıyamet': 75, 'Cum\'a': 62, 'Kaari\'a': 101, 'Zelzele': 99, 'Kadir': 97, 'Mesed': 111, 'Tebbet': 111, 'Müddesir': 74, 'Nazi\'at': 79, 'İnşirah': 94, 'Buruc': 85, 'Ma\'un': 107}.items()})
eksik = collections.Counter(); E = []; AY = collections.defaultdict(lambda: collections.defaultdict(list))
for ad in sorted(F, key=lambda x: x.lower()):
    refs = []
    for s, a in F[ad]['ayetler']:
        isim = re.split(r'\s*\n\s*', s.strip())[-1].strip(" '’\t")
        k = AD.get(n(isim))
        if not k: eksik[isim] += 1; continue
        if k == 1: a = min(a + 1, 7)  # kaynak Fâtiha'yı besmelesiz numaralar ve son ayeti ikiye böler: 1–6 → 2–7, 7 → 7
        if not 1 <= a <= S[k - 1]['ayet']: eksik[f'{isim} {a} (ayet yok)'] += 1; continue
        r = f'{k}:{a}'
        if r not in refs: refs.append(r)
    if not refs: continue
    i = len(E); E.append([ad, refs])
    for r in refs: s, a = r.split(':'); AY[int(s)][a].append(i)
os.makedirs(f'{D}/fh', exist_ok=True)
json.dump({'kaynak': 'KuranFihristi.net konu fihristi', 'url': 'https://www.kuranfihristi.net/', 'etiketler': E}, open(f'{D}/fh/etiket.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for s in range(1, 115):
    json.dump({'ayetler': AY.get(s, {})}, open(f'{D}/fh/{s}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
kap = sum(len(v) for v in AY.values())
print('etiket', len(E), 'atıf', sum(len(r) for _, r in E), 'etiketli ayet', kap, '/ 6236', 'eşleşmeyen', eksik.most_common(10))
