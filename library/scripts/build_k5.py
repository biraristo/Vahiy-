"""Katman 5: kavramlar — kök başına klasik lügat maddeleri.
Lügatler (OpenITI, CC BY-NC-SA): madde başları her eserin kendi işaretlemesinden ayrıştırılır;
madde → kök eşleştirmesi harf karşılaştırmasıyla yapılır (mekanik). Kök listesi: Katman 0 (Quranic Arabic Corpus).
Çıktı: site/data/k5/r/{kök_no}.json.gz, site/data/k5/index.json"""
import json, gzip, re, zipfile, os, collections
RAW = '/home/claude/lib/raw'
OUT = '/home/claude/vahiy-/site/data/k5'
os.makedirs(f'{OUT}/r', exist_ok=True)
z = zipfile.ZipFile(f'{RAW}/openiti_pri_data.zip')
D = json.load(open('/home/claude/vahiy-/site/data/k0/dizin.json'))
ROOTS = list(D['kok'])
HZ = str.maketrans({'أ': 'ء', 'إ': 'ء', 'آ': 'ء', 'ٱ': 'ء', 'ؤ': 'ء', 'ئ': 'ء', 'ى': 'ي', 'ة': 'ه'})
HAR = re.compile(r'[ً-ٰٟـ]')
def rk(x):
    return re.sub(r'[^ء-ي]', '', HAR.sub('', x).translate(HZ))
RK = {rk(r): r for r in ROOTS}
# kelime biçimi → kök (Kur'an'daki biçimlerden)
FORM = {}
for s in range(1, 115):
    for a in json.load(open(f'/home/claude/vahiy-/site/data/k0/s/{s}.json'))['ayetler']:
        for w in a['kelimeler']:
            if w.get('kok'):
                f = rk(w['ar']); FORM.setdefault(f, w['kok'])
                if f.startswith('ال'): FORM.setdefault(f[2:], w['kok'])
def resolve(head, mode):
    h = rk(head)
    if mode == 'kok':
        return RK.get(h)
    cands = [c for c in (h, h[2:] if h.startswith('ال') else None) if c]
    for c in cands:
        if c in RK: return RK[c]
        if len(c) == 2 and c + c[-1] in RK: return RK[c + c[-1]]
    for c in cands:
        r = FORM.get(c)
        if r and len(c) >= 3:
            strong = [x for x in rk(r) if x not in 'ويء']
            it = iter(c)
            if all(x in it for x in strong):
                return r
    return None

def text_of(fn):
    raw = z.read(fn).decode('utf8', 'replace').split('#META#Header#End#', 1)[-1]
    return raw.replace('\n~~', ' ')
def clean(t):
    t = re.sub(r'PageV\d+P\d+|ms\d+|@\w+@|@\d+@', ' ', t)
    t = t.replace('~~', ' ').replace('### $', '').replace('###', '').replace('#', '\n').replace('|', ' ').replace('%', ' ')
    t = re.sub(r'[ \t]+', ' ', t); t = re.sub(r'\n\s*', '\n', t)
    return t.strip()

LEX = [
    # anahtar, dosya, ad, müellif, vefat, bölme deseni, eşleme türü
    ('ayn', '0170KhalilFarahidi.Cayn.JK000930-ara1', 'كتاب العين', 'الخليل بن أحمد', 170, None, None),
    ('maqayis', '0395IbnFarisQazwini.MucjamMaqayis.JK008008-ara1', 'معجم مقاييس اللغة', 'ابن فارس', 395, r'\(\s*([ء-ي]{2,5})\s*\)(?=\s*\|?\s*(?:~~)?\s*(?:ال[ء-ي]+\s+و|[^\n]{0,60}أصل))', 'kok'),
    ('mufradat', '0502RaghibIsbahani.Mufradat.JK001150-ara1', 'المفردات في غريب القرآن', 'الراغب الأصفهاني', 502, r'\n# ([ء-يٱ]{2,8}) :', 'kelime'),
    ('mukhtar', '0666IbnAbiBakrZaynDinRazi.MukhtarSihah.JK000107-ara1', 'مختار الصحاح', 'زين الدين الرازي', 666, r'\n# ((?:[ء-ي] ){1,4}[ء-ي])(?= )', 'kok'),
    ('lisan', '0711IbnManzurIfriqi.LisanCarab.Shamela0001687-ara1.mARkdown', 'لسان العرب', 'ابن منظور', 711, r'\n### \$\s+([^:\n]{2,12}):', 'kelime'),
    ('basair', '0817MajdDinFiruzabadi.BasairDhawiTamyiz.Shamela0009856-ara1', 'بصائر ذوي التمييز', 'الفيروزآبادي', 817, r'\n### \| بصيرة ف[يى] ([ء-ي]{2,10})', 'kelime'),
]
CAP = 20000
entries = collections.defaultdict(dict); stats = {}
for key, fn, ad, mu, vf, pat, mode in LEX:
    if not pat:
        continue
    t = text_of(fn)
    ms = list(re.finditer(pat, t))
    hit = 0
    for i, m in enumerate(ms):
        root = resolve(m.group(1), mode)
        if not root:
            continue
        end = ms[i + 1].start() if i + 1 < len(ms) else len(t)
        body = clean(t[m.start():end])
        if key in entries[root]:
            entries[root][key]['metin'] += '\n…\n' + body
        else:
            entries[root][key] = {'bas': m.group(1).strip(), 'metin': body}
        hit += 1
    stats[key] = {'madde': len(ms), 'koke_baglanan': hit, 'kok': sum(1 for r in entries if key in entries[r])}
    print(key, stats[key], flush=True)
META = {k: {'ad': ad, 'muellif': mu, 'vefat': vf, 'openiti': fn} for k, fn, ad, mu, vf, pat, m in LEX if pat}
idx = {}
for n, r in enumerate(ROOTS):
    e = entries.get(r)
    if not e:
        continue
    for v in e.values():
        if len(v['metin']) > CAP:
            v['metin'] = v['metin'][:CAP] + '\n[…madde devam ediyor; tamamı OpenITI metninde]'
    idx[r] = n
    with gzip.open(f'{OUT}/r/{n}.json.gz', 'wt', encoding='utf8') as f:
        json.dump({'kok': r, 'lugat': e}, f, ensure_ascii=False, separators=(',', ':'))
json.dump({'version': 'k5-2026.10.23', 'lugatler': META, 'kokler': idx, 'istatistik': stats, 'yontem': 'madde başı → kök: harf karşılaştırması (makine)'},
          open(f'{OUT}/index.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(idx), 'kök /', len(ROOTS))
