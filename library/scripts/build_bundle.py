"""Katman 3, 4 ve 7'nin ayet başına paketi: site/data/x/{sure}/{ayet}.json.gz
  k3   : külliyat alıntıları (k3_scan.py çıktısı), ilim dalına ve kitaba göre
  k4   : Mevsûatü't-tefsîri'l-me'sûr rivayetleri (Quranpedia) — türe göre, râvi ve tahrîc ile
  k7   : tefsirlerdeki ihtilaf kayıtları (build_k7_ihtilaf.py) + fetvalar (Quranpedia)
  notlar: Quranpedia tedebbür notları
Kitap künyeleri: site/data/x/kitaplar.json (numara → künye). Rapor: data/k3/report.json
Tek dosyada toplanması, statik barındırmanın dosya sayısı sınırı içindir."""
import json, gzip, os, re, html, collections, glob, sys

RAW = '/home/claude/lib/raw'
REPO = '/home/claude/vahiy-'
OUT = f'{REPO}/site/data/x'
TMP = '/home/claude/lib/k3agg'
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True); os.makedirs(f'{REPO}/data/k3', exist_ok=True)
VERSION = 'x-2026.10.23'
S = json.load(open(f'{REPO}/site/data/k0/surahs.json'))['sureler']
AY = [x['ayet'] for x in S]
OFF = []; o = 0
for n in AY:
    OFF.append(o); o += n
IDX2KEY = [f'{s + 1}:{a + 1}' for s in range(114) for a in range(AY[s])]

# --- kitap künyeleri
cat_oi, cat_qp = {}, {}
for l in open(f'{REPO}/library/catalog/works.jsonl'):
    w = json.loads(l)
    for s in w['sources']:
        rec = {'ad': w['title'], 'muellif': w.get('author'), 'vefat': w.get('death_ah'), 'tur': w['genre'], 'dil': w.get('language')}
        if s['source'] == 'openiti':
            cat_oi[s['id']] = rec
        elif s['source'] == 'quranpedia':
            cat_qp[str(s['id'])] = rec
qpb = {str(b['id']): b for b in json.load(gzip.open(f'{RAW}/qp/books.json.gz'))['data']}
BOOKS = {}; BID = {}
def book(bid):
    if bid in BID:
        return BID[bid]
    if bid.startswith('oi:'):
        k = bid[3:]
        r = dict(cat_oi.get(k) or {'ad': k.split('.')[1], 'muellif': None, 'vefat': None, 'tur': 'belirsiz'})
        r['kaynak'] = 'OpenITI'; r['ref'] = k
        if not r.get('vefat'):
            m = re.match(r'(\d{4})', k)
            if m and int(m.group(1)) < 1450: r['vefat'] = int(m.group(1))
    else:
        k = bid[3:]; b = qpb.get(k, {})
        r = dict(cat_qp.get(k) or {'ad': b.get('name'), 'muellif': (b.get('author') or {}).get('ar_name'), 'vefat': None, 'tur': 'belirsiz'})
        r['kaynak'] = 'Quranpedia'; r['ref'] = k
        if b.get('nasher') or b.get('edition'):
            r['nesir'] = ' · '.join(x for x in (b.get('nasher'), b.get('edition')) if x)
    n = len(BOOKS); BOOKS[n] = r; BID[bid] = n
    return n

# --- K3: geçici sure dosyalarına dağıt
def k3_split():
    fs = {s: open(f'{TMP}/{s}.tsv', 'w', encoding='utf8') for s in range(1, 115)}
    seen = set()
    for f in sorted(glob.glob('/home/claude/lib/k3tmp/hits*.tsv')):
        for line in open(f, encoding='utf8'):
            p = line.rstrip('\n').split('\t')
            if len(p) < 9:
                continue
            b, vol, pg, fa, la, ln, typ, full, sn = p[:9]
            fa, la = int(fa), int(la)
            if la - fa > 8:
                continue
            nb = book(b)
            for ai in range(fa, la + 1):
                key = (nb, vol, pg, ai, typ)
                if key in seen:
                    continue
                seen.add(key)
                s, a = map(int, IDX2KEY[ai].split(':'))
                fs[s].write(f'{a}\t{nb}\t{vol}\t{pg}\t{ln}\t{typ}\t{full}\t{sn}\n')
        seen.clear()
    for f in fs.values():
        f.close()

GROUP = {'hadis': 'hadis', 'fikih': 'fikih', 'akaid': 'kelam', 'felsefe': 'kelam', 'tasavvuf': 'tasavvuf', 'tarih': 'tarih', 'ricâl': 'tarih',
         'dil': 'dil', 'edebiyat': 'dil', 'ulum': 'ulum', 'kiraat': 'ulum', 'tefsir': 'tefsir', 'modern': 'cagdas', 'farsca': 'cagdas', 'diger': 'cagdas', 'belirsiz': 'cagdas', 'meal': 'tefsir', 'mushaf': 'tefsir'}
MAXSN_BOOK, MAXSN_AYAH = 3, 400  # grup başına

def k3_surah(s):
    by = collections.defaultdict(lambda: collections.defaultdict(list))
    p = f'{TMP}/{s}.tsv'
    if os.path.exists(p):
        for line in open(p, encoding='utf8'):
            a, nb, vol, pg, ln, typ, full, sn = line.rstrip('\n').split('\t', 7)
            by[int(a)][int(nb)].append((vol, pg, int(ln), typ, full == '1', sn))
    res = {}
    for a, books in by.items():
        groups = collections.defaultdict(list); nsn = collections.Counter()
        order = sorted(books.items(), key=lambda kv: (BOOKS[kv[0]].get('vefat') or 9999))
        for nb, hits in order:
            hits.sort(key=lambda h: (-h[2]))
            keep = []
            g = GROUP.get(BOOKS[nb]['tur'], 'cagdas')
            for h in hits[:MAXSN_BOOK]:
                if nsn[g] < MAXSN_AYAH:
                    keep.append([h[0], h[1], h[2], h[3], h[5]]); nsn[g] += 1
                else:
                    keep.append([h[0], h[1], h[2], h[3], ''])
            groups[GROUP.get(BOOKS[nb]['tur'], 'cagdas')].append([nb, len(hits), keep])
        res[a] = groups
    return res

# --- K4: Mevsûa rivayetleri
GRADE = [('موضوع', 'mevzû'), ('ضعيف جدا', 'çok zayıf'), ('ضعيف جدًّا', 'çok zayıf'), ('منكر', 'münker'), ('ضعيف', 'zayıf'), ('حسن', 'hasen'), ('صحيح', 'sahih')]
def strip(t):
    t = re.sub(r'<br\s*/?>', '\n', t or '')
    return html.unescape(re.sub(r'<[^>]+>', '', t)).strip()
def k4_load():
    d = json.load(gzip.open(f'{RAW}/qp/sayings.json.gz'))['data']
    out = collections.defaultdict(list)
    for x in d:
        for sy in x['sayings']:
            raw = sy.get('text') or ''
            foot = ''
            m = re.search(r'<footer.*?</footer>', raw, re.S)
            if m:
                foot = strip(re.sub(r'<span class="notes-label">.*?</span>', '', m.group(0)))
                raw = raw[:m.start()] + raw[m.end():]
            raw = re.sub(r'<sup.*?</sup>', '', raw, flags=re.S)
            txt = strip(raw)
            g = None
            fz = re.sub(r'[ً-ٟ]', '', foot)
            for k, v in GRADE:
                if k in fz:
                    g = v; break
            out[(x['surah'], x['ayah'])].append({'id': sy['id'], 'tur': sy.get('type'), 'metin': txt, 'tahric': foot, 'hukum': g,
                                                  'raviler': [n['id'] for n in sy.get('narrators') or []]})
    return out

def fatwas():
    out = collections.defaultdict(list)
    for x in json.load(gzip.open(f'{RAW}/qp/fatwa.json.gz'))['data']:
        for f in x['fatwa']:
            q = f['fatwa']
            ans = strip(q.get('answer'))
            out[(x['surah'], x['ayah'])].append({'soru': strip(q.get('question')), 'cevap': ans[:4000] + ('…' if len(ans) > 4000 else ''),
                                                  'muftu': ', '.join(p['ar_name'] for p in f.get('people') or []), 'kategori': (f.get('category') or {}).get('name')})
    return out

def notes():
    out = collections.defaultdict(list)
    for x in json.load(gzip.open(f'{RAW}/qp/notes.json.gz'))['data']:
        for n in x['notes']:
            out[(x['surah'], x['ayah'])].append({'metin': strip(n.get('ar_note'))[:2500], 'yazar': n.get('author'), 'kategori': (n.get('category') or {}).get('name'),
                                                  'baglanti': (n.get('websites') or [])[:2]})
    return out

if __name__ == '__main__':
    print('k3 dağıtılıyor', flush=True)
    k3_split()
    print('kitap', len(BOOKS), flush=True)
    K4 = k4_load(); FT = fatwas(); NT = notes()
    stat = collections.Counter(); gstat = collections.Counter()
    for s in range(1, 115):
        K3 = k3_surah(s)
        K7 = json.load(open(f'/home/claude/lib/k7tmp/{s}.json'))
        os.makedirs(f'{OUT}/{s}', exist_ok=True)
        for a in range(1, AY[s - 1] + 1):
            k3 = K3.get(a, {})
            b = {'v': VERSION, 'k3': k3, 'k4': K4.get((s, a), []), 'k7': {'ihtilaf': K7.get(f'{s}:{a}', []), 'fetva': FT.get((s, a), [])}, 'notlar': NT.get((s, a), [])}
            with gzip.open(f'{OUT}/{s}/{a}.json.gz', 'wt', encoding='utf8', compresslevel=9) as f:
                json.dump(b, f, ensure_ascii=False, separators=(',', ':'))
            if k3: stat['alintili_ayet'] += 1
            for g, L in k3.items():
                gstat[g] += sum(x[1] for x in L)
            stat['alinti'] += sum(x[1] for L in k3.values() for x in L)
            if b['k4']: stat['rivayetli_ayet'] += 1
            stat['rivayet'] += len(b['k4']); stat['ihtilaf'] += len(b['k7']['ihtilaf']); stat['fetva'] += len(b['k7']['fetva']); stat['not'] += len(b['notlar'])
        print(s, end=' ', flush=True)
    json.dump({'version': VERSION, 'kitaplar': BOOKS}, open(f'{OUT}/kitaplar.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    rep = {'version': VERSION, **stat, 'ilim_dalina_gore_alinti': dict(gstat), 'alinti_yapan_kitap': len(BOOKS),
           'yontem': 'k3_scan.py: normalleştirilmiş 4-gram eşleşmesi, en az 6 kelime ya da ≥5 kelimelik tam ayet; Quranpedia bölüm bağları ayrıca'}
    json.dump(rep, open(f'{REPO}/data/k3/report.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(); print(json.dumps(rep, ensure_ascii=False, indent=1))
