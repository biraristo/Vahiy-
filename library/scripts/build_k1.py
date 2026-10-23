"""Katman 1: Kur'an içi ağ.

Bağ türleri (her biri ayrı etiketli):
  benzer_ifade  — kaynaklı: Quranpedia müteşâbih/benzer ifade grupları (not metniyle)
  konu          — kaynaklı: Quranpedia konu dizini (4.574 konu, 800 üst başlık)
  ortak_ifade   — mekanik: iki ayette art arda gelen en az 3 ortak lemma (Katman 0 morfolojisinden)
  ayni_bolum    — kaynaklı: Corpus Coranicum (Hartwig–Neuwirth) bölüm yapısında aynı bölüm
Girdi: Katman 0 sure dosyaları; Quranpedia similar/topics.
Çıktı: site/data/k1/{sure}.json, site/data/k1/konular.json, data/k1/report.json
"""
import json, gzip, os, collections, itertools

RAW = '/home/claude/lib/raw'
REPO = '/home/claude/vahiy-'
K0 = f'{REPO}/site/data/k0/s'
OUT = f'{REPO}/site/data/k1'
os.makedirs(OUT, exist_ok=True)
os.makedirs(f'{REPO}/data/k1', exist_ok=True)
VERSION = 'k1-2026.10.23'

ayahs = {}
for s in range(1, 115):
    for a in json.load(open(f'{K0}/{s}.json'))['ayetler']:
        ayahs[a['id']] = a
ids = list(ayahs)

links = collections.defaultdict(lambda: collections.defaultdict(list))

# 1) Quranpedia benzer ifade grupları
groups = 0
for x in json.load(gzip.open(f'{RAW}/qp/similar.json.gz'))['data']:
    me = f"{x['surah']}:{x['ayah']}"
    for g in x['similar']:
        members = [f"{a['info']['surah_id']}:{a['info']['number']}" for a in g.get('ayahs') or []]
        members = [m for m in members if m in ayahs]
        if len(members) < 2:
            continue
        groups += 1
        links[me]['benzer_ifade'].append({'not': (g.get('notes') or '').strip(), 'ayetler': [m for m in members if m != me]})

# 2) Quranpedia konu dizini
topics = {}
for x in json.load(gzip.open(f'{RAW}/qp/topics.json.gz'))['data']:
    me = f"{x['surah']}:{x['ayah']}"
    for t in x['topics']:
        rel = [r.strip() for r in (t.get('related_ayahs') or '').split(',') if r.strip() in ayahs]
        topics.setdefault(t['id'], {'ad': t['name'], 'ust': (t.get('parent') or {}).get('name'), 'ayetler': rel})
        links[me]['konu'].append(t['id'])

# 3) Mekanik ortak ifade: art arda ≥3 ortak lemma
lem = {i: [w.get('lemma') or w['ar'] for w in a['kelimeler']] for i, a in ayahs.items()}
grams = collections.defaultdict(set)
for i, seq in lem.items():
    for k in range(len(seq) - 2):
        grams[tuple(seq[k:k + 3])].add(i)
common_cut = 60  # çok yaygın üçlüler (ör. besmele kalıbı) aday üretmesin
pairs = collections.defaultdict(set)
for g, occ in grams.items():
    if 2 <= len(occ) <= common_cut:
        for x, y in itertools.combinations(sorted(occ), 2):
            pairs[x].add(y); pairs[y].add(x)


def longest_run(a, b):
    best, end = 0, 0
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1] + 1
                if cur[j] > best:
                    best, end = cur[j], i
        prev = cur
    return best, a[end - best:end]


mech_pairs = 0
for x, ys in pairs.items():
    out = []
    for y in ys:
        n, run = longest_run(lem[x], lem[y])
        if n >= 3:
            # ortak ifadenin x ayetindeki Arapça yazımı
            seq = lem[x]
            start = next(k for k in range(len(seq) - n + 1) if seq[k:k + n] == run)
            words = ' '.join(w['ar'] for w in ayahs[x]['kelimeler'][start:start + n])
            out.append({'ayet': y, 'uzunluk': n, 'ifade': words})
    if out:
        grp = collections.OrderedDict()
        for r in sorted(out, key=lambda r: (-r['uzunluk'], tuple(map(int, r['ayet'].split(':'))))):
            g = grp.setdefault(r['ifade'], {'ifade': r['ifade'], 'uzunluk': r['uzunluk'], 'ayetler': []})
            g['ayetler'].append(r['ayet'])
        links[x]['ortak_ifade'] = list(grp.values())[:20]
        links[x]['ortak_ifade_toplam'] = len(out)
        links[x]['ortak_ifade_grup'] = len(grp)
        mech_pairs += len(out)

# 4) Aynı bölüm (Corpus Coranicum)
by_sec = collections.defaultdict(list)
for i, a in ayahs.items():
    secs = {c.get('bolum') for c in a.get('cc_yapi') or [] if c.get('bolum') is not None}
    for sct in secs:
        by_sec[(a['s'], sct)].append(i)
for (s, sct), mem in by_sec.items():
    for i in mem:
        links[i]['ayni_bolum'] = {'bolum': sct, 'ayetler': mem}

# yaz
for s in range(1, 115):
    out = {}
    for a in range(1, 1000):
        k = f'{s}:{a}'
        if k not in ayahs:
            break
        L = links.get(k, {})
        out[k] = {kk: vv for kk, vv in L.items()}
    json.dump({'version': VERSION, 'ayetler': out}, open(f'{OUT}/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'version': VERSION, 'kaynak': 'Quranpedia konu dizini', 'konular': topics}, open(f'{OUT}/konular.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

rep = {'version': VERSION,
       'benzer_ifade_grubu': groups, 'benzer_ifadeli_ayet': sum(1 for v in links.values() if v.get('benzer_ifade')),
       'konu': len(topics), 'konulu_ayet': sum(1 for v in links.values() if v.get('konu')),
       'ortak_ifade_bagi': mech_pairs // 2, 'ortak_ifadeli_ayet': sum(1 for v in links.values() if v.get('ortak_ifade')),
       'bolumlu_ayet': sum(1 for v in links.values() if v.get('ayni_bolum')),
       'en_az_bir_bagli_ayet': sum(1 for k in ayahs if any(links.get(k, {}).get(t) for t in ('benzer_ifade', 'konu', 'ortak_ifade')))}
json.dump(rep, open(f'{REPO}/data/k1/report.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(rep, ensure_ascii=False, indent=1))
