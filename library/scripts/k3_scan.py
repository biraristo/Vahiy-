"""Katman 3: külliyat alıntı indeksi — tarayıcı.

Her kitap metninde Kur'an ayetlerinden yapılan alıntıları bulur.
Yöntem (mekanik, tekrarlanabilir):
  * Kur'an metni (Tanzil simple-clean) ve kitap metni aynı biçimde normalleştirilir:
    harekeler, elifler, hemze kürsüleri atılır; ى→ي, ة→ه.
  * Kur'an'daki her 4 kelimelik dizi bir sözlüğe konur; kitap metninde art arda eşleşen
    dizilerden kesintisiz "alıntı koşuları" çıkarılır.
  * Kabul: en az 6 kelime, ya da en az 5 kelimelik bir ayetin tamamı.
    Aynı metin parçası 3'ten fazla ayet yerine uyuyorsa (kalıp ifade) ve 10 kelimeden kısaysa atılır.
  * Quranpedia kitaplarında bölümün kendi ayet bağı (ayah_from/ayah_to) ayrıca "kaynakta bağlı" diye yazılır.
Çıktı: /home/claude/lib/k3tmp/hits-{parça}.tsv
  satır: kitap \t cilt \t sayfa \t ilk_ayet_idx \t son_ayet_idx \t kelime \t tür(a=alıntı,b=bağ) \t tam_ayet(0/1) \t parça
Kullanım: python3 k3_scan.py <parça_no> <parça_sayısı>
"""
import sys, os, re, json, gzip, zipfile, csv, html, bisect, time
import xml.etree.ElementTree as ET

RAW = '/home/claude/lib/raw'
TMP = '/home/claude/lib/k3tmp'
os.makedirs(TMP, exist_ok=True)
PART, NPART = int(sys.argv[1]), int(sys.argv[2])
SKIP_GENRE = {'tefsir', 'mushaf', 'meal'}  # ayet sıralı eserler K2'de
ONLY_SKIPPED = os.environ.get('K3_TEFSIR') == '1'  # ikinci geçiş: yalnız OpenITI tefsirleri
PDF_MODE = os.environ.get('K3_PDF') == '1'  # üçüncü geçiş: Quranpedia PDF/DOC metinleri
SFX = 'p' if PDF_MODE else ('t' if ONLY_SKIPPED else '')

DEL = dict.fromkeys(list(range(0x064B, 0x0660)) + [0x0670, 0x0640] + list(range(0x06D6, 0x06EE)) + [0x0627, 0x0623, 0x0625, 0x0622, 0x0671, 0x0621, 0x0672, 0x0673])
DEL.update({0x0649: 0x064A, 0x0629: 0x0647, 0x0624: 0x0648, 0x0626: 0x064A, 0x06CC: 0x064A, 0x06A9: 0x0643})
NONAR = re.compile(r'[^ء-يٮ-ۓ]')


def norm(w):
    return NONAR.sub('', w.translate(DEL))


# --- Kur'an dizini
root = ET.parse(f'{RAW}/tanzil/quran-simple-clean.xml').getroot()
vocab = {}
qtok, qayah, ayah_start, ayah_len = [], [], [], []
aidx = 0
SOFF = {}
for sura in root:
    SOFF[int(sura.get('index'))] = aidx
    for aya in sura:
        ws = [norm(w) for w in aya.get('text').split()]
        ws = [w for w in ws if w]
        ayah_start.append(len(qtok)); ayah_len.append(len(ws))
        for w in ws:
            qtok.append(vocab.setdefault(w, len(vocab))); qayah.append(aidx)
        aidx += 1
G = {}
for g in range(len(qtok) - 3):
    k = qtok[g] | qtok[g + 1] << 16 | qtok[g + 2] << 32 | qtok[g + 3] << 48
    G.setdefault(k, []).append(g)
for k, v in G.items():
    if len(v) > 60:
        G[k] = v[:60]

MARK = re.compile(r'^(?:ms\d+|@\w+@|Page[VP].*|\d+|[#~|\\%*]+)$')
PAGE = re.compile(r'PageV(\d+)P(\d+)')


def snip(tokens, i, n, ctx=10):
    a = max(0, i - ctx); b = min(len(tokens), i + n + ctx)
    w = [t for t in tokens[a:b] if not (t.startswith('Page') or MARK.match(t))]
    s = ' '.join(t.strip('~#') for t in w).replace('\t', ' ').replace('\n', ' ')
    return s[:400]


def scan(tokens, pages, out, book, pagefn):
    """tokens: ham kelimeler; pages: (token_idx, cilt, sayfa) değişim listesi"""
    ids, oi = [], []
    for j, t in enumerate(tokens):
        if t.startswith('Page') or MARK.match(t):
            continue
        n = norm(t)
        if not n:
            continue
        ids.append(vocab.get(n, -1)); oi.append(j)
    active = {}
    emitted = {}
    L = len(ids)
    for i in range(L - 3):
        a, b, c, d = ids[i], ids[i + 1], ids[i + 2], ids[i + 3]
        new = {}
        if a >= 0 and b >= 0 and c >= 0 and d >= 0:
            hits = G.get(a | b << 16 | c << 32 | d << 48)
            if hits:
                for g in hits:
                    st = active.get(g)
                    new[g + 1] = st if st else (i, g)
        for gn, st in active.items():
            if gn not in new:
                ln = (i - 1 - st[0]) + 4
                emitted.setdefault((st[0], ln), []).append(st[1])
        active = new
    for gn, st in active.items():
        ln = (L - 4 - st[0]) + 4
        emitted.setdefault((st[0], ln), []).append(st[1])
    # başlangıca göre sırala (aynı başlangıçta uzun önce); daha önce kabul edilen bir koşunun içinde kalanlar atılır
    max_end = -1
    for (si, ln), gs in sorted(emitted.items(), key=lambda x: (x[0][0], -x[0][1])):
        if si + ln <= max_end:
            continue
        res = []
        for g in gs:
            fa, la = qayah[g], qayah[g + ln - 1]
            full = any(ayah_start[x] >= g and ayah_start[x] + ayah_len[x] <= g + ln for x in range(fa, la + 1))
            if ln >= 6 or (full and ln >= 5):
                res.append((fa, la, full))
        if not res or (len(res) > 3 and ln < 10):
            continue
        max_end = max(max_end, si + ln)
        vol, pg = pagefn(oi[si])
        sn = snip(tokens, oi[si], oi[si + ln - 1] - oi[si] + 1)
        for fa, la, full in res:
            out.write(f'{book}\t{vol}\t{pg}\t{fa}\t{la}\t{ln}\ta\t{int(full)}\t{sn}\n')


def openiti_jobs():
    csv.field_size_limit(10 ** 9)
    cat = {}
    for l in open('/home/claude/vahiy-/library/catalog/works.jsonl'):
        w = json.loads(l)
        for s in w['sources']:
            if s['source'] == 'openiti':
                cat[s['id']] = w['genre']
    z = zipfile.ZipFile(f'{RAW}/openiti_pri_data.zip')
    names = {}
    for i in z.infolist():
        key = re.sub(r'\.(mARkdown|completed|inProgress)$', '', i.filename)
        if (cat.get(key) in SKIP_GENRE) != ONLY_SKIPPED:
            continue
        if key not in names or i.filename.endswith(('.mARkdown', '.completed')):
            names[key] = (i.filename, i.file_size)
    return z, sorted(names.items(), key=lambda x: -x[1][1])


def test(fn):
    z, jobs = openiti_jobs()
    import io
    out = io.StringIO()
    raw = z.read(fn).decode('utf8', 'replace'); tokens = raw.split('#META#Header#End#', 1)[-1].split()
    t = time.time(); scan(tokens, [], out, 'test', lambda j: (0, j)); dt = time.time() - t
    lines = out.getvalue().splitlines()
    print(len(tokens), 'kelime', round(dt, 1), 'sn', len(lines), 'alıntı')
    return lines


def main():
    donef = f'{TMP}/done{SFX}-{PART}.txt'
    done = set(open(donef).read().split('\n')) if os.path.exists(donef) else set()
    hf = f'{TMP}/hits{SFX}-{PART}.tsv'
    if os.path.exists(hf):  # yarım kalmış kitabın satırlarını at
        with open(hf, encoding='utf8') as f, open(hf + '.tmp', 'w', encoding='utf8') as g:
            for line in f:
                if line.split('\t', 1)[0] in done:
                    g.write(line)
        os.replace(hf + '.tmp', hf)
    out = open(hf, 'a', encoding='utf8')
    dlog = open(donef, 'a')
    t0 = time.time()
    if PDF_MODE:
        fs = sorted(os.listdir(f'{RAW}/qp_pdf'))
        fs = [f for n, f in enumerate(fs) if f.endswith('.txt.gz') and n % NPART == PART]
        for f in fs:
            bid, part = f[:-7].split('_')
            key = f'qpf:{bid}:{part}'
            if key in done:
                continue
            raw = gzip.open(f'{RAW}/qp_pdf/{f}', 'rt', encoding='utf8').read()
            tokens = []
            for pi, pg in enumerate(raw.split('\f')):
                tokens += pg.split(); tokens.append(f'PageV{int(part):02d}P{pi + 1:03d}')
            marks = [(j, int(m.group(1)), int(m.group(2))) for j, t in enumerate(tokens) if t.startswith('PageV') for m in [PAGE.match(t)] if m]
            mpos = [m[0] for m in marks]
            def pagefn(j, marks=marks, mpos=mpos):
                p = bisect.bisect_right(mpos, j)
                return (marks[p][1], marks[p][2]) if p < len(marks) else (0, 0)
            scan(tokens, marks, out, f'qpf:{bid}', pagefn)
            out.flush(); dlog.write(key + '\n'); dlog.flush()
        print(PART, 'bitti', round(time.time() - t0), flush=True)
        return
    z, jobs = openiti_jobs()
    jobs = [j for n, j in enumerate(jobs) if n % NPART == PART]
    for k, (key, (fn, size)) in enumerate(jobs):
        if 'oi:' + key in done:
            continue
        raw = z.read(fn).decode('utf8', 'replace')
        body = raw.split('#META#Header#End#', 1)[-1]
        tokens = body.split()
        marks = [(j, int(m.group(1)), int(m.group(2))) for j, t in enumerate(tokens) if t.startswith('PageV') for m in [PAGE.match(t)] if m]
        mpos = [m[0] for m in marks]

        def pagefn(j, marks=marks, mpos=mpos):
            p = bisect.bisect_right(mpos, j)  # sayfa işareti sayfanın SONUNDA durur
            if p < len(marks):
                return marks[p][1], marks[p][2]
            return (marks[-1][1], marks[-1][2] + 1) if marks else (0, 0)
        scan(tokens, marks, out, 'oi:' + key, pagefn)
        out.flush(); dlog.write('oi:' + key + '\n'); dlog.flush()
        if k % 200 == 0:
            print(PART, k, len(jobs), round(time.time() - t0), flush=True)
    if ONLY_SKIPPED:
        print(PART, 'bitti', flush=True); return
    # Quranpedia kitapları
    qfs = sorted(os.listdir(f'{RAW}/qp_books'))
    qfs = [f for n, f in enumerate(qfs) if n % NPART == PART]
    for f in qfs:
        bid = 'qp:' + f.split('-')[1].split('.')[0]
        if bid in done:
            continue
        try:
            d = json.load(gzip.open(f'{RAW}/qp_books/{f}'))
        except Exception as e:
            print('hata', f, e, flush=True); continue
        for x in d.get('contents') or []:
            txt = html.unescape(re.sub(r'<[^>]+>', ' ', x.get('text') or ''))
            loc = x['id']
            if x.get('related_ayahs'):
                for r in str(x['related_ayahs']).split(','):
                    m = re.match(r'\s*(\d+):(\d+)-(\d+)', r)
                    if m:
                        s, a1, a2 = map(int, m.groups())
                        if s in SOFF:
                            out.write(f'{bid}\t{x.get("chapter_id") or 0}\t{loc}\t{SOFF[s] + a1 - 1}\t{SOFF[s] + a2 - 1}\t0\tb\t0\t{snip(txt.split(), 0, 30)}\n')
            scan(txt.split(), [], out, bid, lambda j, c=x.get('chapter_id') or 0, l=loc: (c, l))
        out.flush(); dlog.write(bid + '\n'); dlog.flush()
    print(PART, 'bitti', round(time.time() - t0), flush=True)


if PART >= 0:
    main()
