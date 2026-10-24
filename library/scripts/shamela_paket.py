"""Şâmile kitaplarını vahiy++ kitap biçimine çevirip R2'ye yükler ve her kitabı denetler.

Girdi : shamela/x/database (master.db, book/NNN/ID.db sayfa ve başlık tabloları, store/page Lucene saklı alanları)
Aşama 1 (ayir): Lucene sayfa parçaları DumpStored ile akıtılır; her kitabın sayfaları tmp/sayfa/{bid}.N.gz dosyasına yazılır.
Aşama 2 (paketle): her kitap → bölümler (satır içi <span data-type="title" id=toc-N> başlıkları ve title tablosundaki hiyerarşi),
          sayfa sonu işaretleri \\x01cilt:sayfa\\x01, dipnot satırları \\x04 ile; kitap/sh{bid}.bin + .json (gzip dizin) R2'ye.
Denetim: .db sayfa tablosundaki her sayfanın metni var mı, boş sayfa, sayfa numarası sırası, başlık tablosu ile satır içi başlıkların uyumu,
          boş bölüm. Sonuç: /home/claude/lib/raf/shamela_katalog.json
Kullanım: python3 shamela_paket.py ayir | paketle [--yukleme-yok] [--sadece ID,ID]"""
import os, sys, re, json, gzip, sqlite3, subprocess, io, time, collections, urllib.request, concurrent.futures as cf
SH = '/home/claude/lib/shamela/x/database'
TMP = '/home/claude/lib/shamela/tmp/sayfa'
KAT = sys.argv[sys.argv.index('--kat') + 1] if '--kat' in sys.argv else '/home/claude/lib/raf/shamela_katalog.json'
LUC = '/home/claude/lib/lucene'
os.makedirs(TMP, exist_ok=True)


ISTEK = set(open(os.environ['KITAPLAR']).read().split()) if os.environ.get('KITAPLAR') else None
def ayir():
    """Lucene sayfa deposunu parça parça akıt, kitap kitap gzip dosyalarına yaz."""
    segs = [l.split()[0] for l in subprocess.run(['java', '-cp', f'{LUC}/lucene-core-10.4.0.jar:{LUC}', 'SegInfo', f'{SH}/store/page'], capture_output=True, text=True).stdout.split('\n') if l.strip()]
    sayac = collections.Counter()
    if os.environ.get('SEG'): segs = [x for x in segs if x in os.environ['SEG'].split(',')]
    for seg in segs:
        atla_hepsi = [l.split()[0] for l in subprocess.run(['java', '-cp', f'{LUC}/lucene-core-10.4.0.jar:{LUC}', 'SegInfo', f'{SH}/store/page'], capture_output=True, text=True).stdout.split('\n') if l.strip()]
        atla = ','.join(x for x in atla_hepsi if x != seg)
        p = subprocess.Popen(['java', '-cp', f'{LUC}/lucene-core-10.4.0.jar:{LUC}', 'DumpStored', f'{SH}/store/page', '/dev/stdout', atla], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        cur, f, n = None, None, 0
        for line in io.TextIOWrapper(p.stdout, encoding='utf8', errors='replace'):
            m = re.match(r'\{"id":"(\d+)-', line)
            if not m: continue
            bid = m.group(1)
            if ISTEK and bid not in ISTEK: continue
            if bid != cur:
                if f: f.close()
                sayac[bid] += 1
                f = gzip.open(f'{TMP}/{bid}.{sayac[bid]}.gz', 'wt', encoding='utf8', compresslevel=4); cur = bid
            f.write(line); n += 1
        if f: f.close()
        p.wait()
        print(seg, n, 'sayfa', flush=True)
    print('ayırma bitti', len(sayac), 'kitap', flush=True)


# ---------------- metin ----------------
TOC = re.compile(r'<span data-type=["\']?title["\']?\s+id=["\']?toc-(\d+)["\']?\s*>((?:<span[^>]*>.*?</span>|.)*?)</span>', re.S)
ETIKET = re.compile(r'<[^>]+>')
def temiz(t):
    t = ETIKET.sub('', t).replace('‏', '').replace('‎', '')
    return re.sub(r'[ \t]+', ' ', t).strip()

def kunye_oku():
    K = {}
    for line in open('/home/claude/lib/shamela/book_store.jsonl', encoding='utf8'):
        try: d = json.loads(line)
        except Exception: continue
        b = d.get('body_store') or ''
        k = {}
        for sat in b.split('\r'):
            m = re.match(r'\s*(الكتاب|المؤلف|المحقق|تحقيق|الناشر|الطبعة|عدد الأجزاء|عدد الصفحات|سنة النشر|أعده للشاملة)\s*:\s*(.+)', sat)
            if m: k.setdefault(m.group(1), m.group(2).strip())
        k['matbu'] = 'موافق للمطبوع' in b
        k['kart'] = b[:2000]
        K[str(d.get('id'))] = k
    return K

BASLIK_ADI = {}
def baslik_yukle(ids):
    p = '/home/claude/lib/shamela/baslik.jsonl'
    for line in open(p, encoding='utf8', errors='replace'):
        m = re.match(r'\{"id":"(\d+)-(\d+)","body":"(.*)"\}\s*$', line)
        if m and m.group(1) in ids: BASLIK_ADI.setdefault(m.group(1), {})[int(m.group(2))] = json.loads('"' + m.group(3) + '"')
def kitap_yap(bid, tek):
    """Bir kitabın sayfalarını bölümlere çevirir; (bölümler, denetim) döndürür."""
    db = sqlite3.connect(f'{SH}/book/{int(bid) % 1000:03d}/{bid}.db')
    sayfalar = {i: (part, pg) for i, part, pg in db.execute('select id, part, page from page')}
    basliklar = {i: (pg, par) for i, pg, par in db.execute('select id, page, parent from title')}
    db.close()
    def derinlik(t):
        d, seen = 1, set()
        while basliklar.get(t, (0, 0))[1] and t not in seen and d < 9: seen.add(t); t = basliklar[t][1]; d += 1
        return d
    metin = {}
    for fn in tek:
        with gzip.open(fn, 'rt', encoding='utf8', errors='replace') as f:
            for line in f:
                try: d = json.loads(line)
                except Exception: continue
                pid = int(d['id'].split('-')[1])
                metin[pid] = (d.get('body') or '', d.get('foot') or '')
    secs = [[1, 'Giriş', []]]
    goren = set(); bos_sayfa = 0; sira_hata = 0; onceki = {}
    bas_sayfa = collections.defaultdict(list)
    for t, (pg, par) in basliklar.items(): bas_sayfa[pg].append(t)
    for pid in sorted(set(sayfalar) | set(metin)):
        body, foot = metin.get(pid, ('', ''))
        part, pg = sayfalar.get(pid, (None, None))
        try: v = int(re.sub(r'\D', '', str(part)) or 0) if part else 0
        except ValueError: v = 0
        if pg is not None and v in onceki and pg < onceki[v]: sira_hata += 1
        if pg is not None: onceki[v] = pg
        if not temiz(body) and not temiz(foot): bos_sayfa += 1
        # satır içi başlıkları olmayan ama bu sayfada başlayan başlıklar sayfa başına eklenir
        icerde = set(int(x) for x in re.findall(r'id=["\']?toc-(\d+)', body))
        for t in sorted(bas_sayfa.get(pid, [])):
            if t not in icerde and t not in goren: secs.append([derinlik(t), temiz(BASLIK_ADI.get(bid, {}).get(t, '')) or '—', []]); goren.add(t)
        konum = 0
        for m in TOC.finditer(body):
            once = body[konum:m.start()]
            for s in once.split('\r'):
                if temiz(s): secs[-1][2].append(temiz(s))
            t = int(m.group(1)); goren.add(t)
            secs.append([derinlik(t) if t in basliklar else 1, temiz(m.group(2)) or '—', []]); konum = m.end()
        for s in body[konum:].split('\r'):
            if temiz(s): secs[-1][2].append(temiz(s))
        for s in foot.split('\r'):
            if temiz(s): secs[-1][2].append('\x04' + temiz(s))
        isaret = f'\x01{v}:{pg if pg is not None else pid}\x01'
        if secs[-1][2]: secs[-1][2][-1] += isaret
        else: secs[-1][2].append(isaret)
    eksik = [p for p in sayfalar if p not in metin]
    # başlıksız çok kısa giriş (besmele gibi) sonraki bölümün başına eklenir
    if len(secs) > 1 and secs[0][1] == 'Giriş' and len(re.sub(r'\x01[^\x01]*\x01', '', '\n'.join(secs[0][2])).strip()) < 40:
        secs[1][2] = secs[0][2] + secs[1][2]; secs = secs[1:]
    out = []
    for lvl, ttl, P in secs:
        if lvl == 1 and ttl == 'Giriş' and not any(x.replace('\x01', '').strip() for x in P): continue
        txt = '\n'.join(P)
        if len(txt.encode()) <= 70000: out.append([lvl, ttl, txt]); continue
        parca, acc, sz = [], [], 0
        for p in P:
            acc.append(p); sz += len(p.encode())
            if sz > 40000: parca.append('\n'.join(acc)); acc, sz = [], 0
        if acc: parca.append('\n'.join(acc))
        for j, x in enumerate(parca):
            M = re.findall(r'\x01(\d+):(\d+)\x01', x)
            if M:
                v1, p1 = int(M[0][0]), int(M[0][1]); v2, p2 = int(M[-1][0]), int(M[-1][1])
                yer = (f'Cilt {v1}, ' if v1 else '') + (f's. {p1}' if (v1, p1) == (v2, p2) else f's. {p1}–{p2}' if v1 == v2 else f's. {p1} – c. {v2}, s. {p2}')
            else: yer = f'{j + 1}. kısım'
            out.append([lvl, yer if ttl == 'Giriş' else f'{ttl} · {yer}', x])
    bos_bolum = sum(1 for x in out if not re.sub(r'\x01[^\x01]*\x01', '', x[2]).strip())
    ciltler = sorted({int(re.sub(r'\D', '', str(p)) or 0) for p, _ in sayfalar.values() if p}) if sayfalar else []
    den = {'sayfa_tablo': len(sayfalar), 'sayfa_metin': len(metin), 'eksik_sayfa': len(eksik), 'bos_sayfa': bos_sayfa, 'sira_hata': sira_hata,
           'baslik_tablo': len(basliklar), 'baslik_bulunan': len(goren & set(basliklar)), 'bolum': len(out), 'bos_bolum': bos_bolum, 'cilt': len(ciltler),
           'harf': sum(len(x[2]) for x in out)}
    return out, den


def paketle_bin(secs):
    bio, diz, off = io.BytesIO(), [], 0
    for lvl, ttl, t in secs:
        if t:
            g = gzip.compress(t.encode('utf8'), 6, mtime=0); bio.write(g); diz.append([lvl, ttl, off, len(g)]); off += len(g)
        else: diz.append([lvl, ttl, 0, 0])
    return bio.getvalue(), diz

TOK = open(os.path.expanduser('~/.secrets/cf_token')).read().strip()
BASE = 'https://api.cloudflare.com/client/v4/accounts/b7f9ed1b6a0180496480b0a47302ae4e/r2/buckets/vahiy/objects/'
def put(key, data, ctype, enc=None):
    err = None
    for deneme in range(6):
        try:
            h = {'Authorization': f'Bearer {TOK}', 'Content-Type': ctype}
            if enc: h['Content-Encoding'] = enc
            r = urllib.request.urlopen(urllib.request.Request(BASE + key, data=data, method='PUT', headers=h), timeout=600)
            if r.status == 200: return True
        except Exception as e:
            err = e; time.sleep(2 + 4 * deneme)
    print('YÜKLENEMEDİ', key, err, flush=True); return False


def paketle():
    yukle = '--yukleme-yok' not in sys.argv
    sadece = set(sys.argv[sys.argv.index('--sadece') + 1].split(',')) if '--sadece' in sys.argv else None
    m = sqlite3.connect(f'{SH}/master.db')
    auth = {a: (n, d) for a, n, d in m.execute('select author_id, author_name, death_number from author')}
    cats = {c: n for c, n in m.execute('select category_id, category_name from category')}
    kunye = kunye_oku()
    kat = json.load(open(KAT)) if os.path.exists(KAT) else {}
    dosyalar = collections.defaultdict(list)
    for fn in os.listdir(TMP):
        mm = re.match(r'(\d+)\.(\d+)\.gz$', fn)
        if mm: dosyalar[mm.group(1)].append((int(mm.group(2)), f'{TMP}/{fn}'))
    kitaplar = list(m.execute('select book_id, book_name, book_category, book_date, main_author, printed, pdf_links from book'))
    if os.path.exists('/home/claude/lib/shamela/baslik.jsonl'): baslik_yukle({str(k[0]) for k in kitaplar if not sadece or str(k[0]) in sadece})
    if '--ters' in sys.argv:
        kitaplar = [k for k in reversed(kitaplar) if str(k[0]) in dosyalar]
        # öbür süreçle buluşulan yerde dur: sayfa dosyası kalmamış kitap öbürünce yapılmıştır
        sec = []
        for k in kitaplar:
            if not all(os.path.exists(p) for _, p in dosyalar[str(k[0])]): break
            sec.append(k)
        kitaplar = sec
    def is_(row):
        bid, ad, cat, date, main, printed, pdf = row; bid = str(bid)
        if sadece and bid not in sadece: return None
        if not sadece and bid in kat and kat[bid].get('yuklendi'): return None
        if '--kalanlar' in sys.argv and not dosyalar.get(bid): return None
        if '--ters' in sys.argv and dosyalar.get(bid) and not all(os.path.exists(p) for _, p in dosyalar[bid]): return None
        an, ad_d = auth.get(main, (None, None))
        try: secs, den = kitap_yap(bid, [p for _, p in sorted(dosyalar.get(bid, []))])
        except Exception as e:
            print('HATA', bid, e, flush=True); return bid, {'ad': ad, 'hata': str(e)}
        kay = {'ad': ad, 'muellif': an, 'vefat': date if date and date < 99999 else (ad_d if ad_d and ad_d < 99999 else None), 'kategori': cats.get(cat),
               'kunye': {k: v for k, v in kunye.get(bid, {}).items() if k != 'kart'}, 'denetim': den, 'kb': 0}
        if secs and yukle:
            b, diz = paketle_bin(secs)
            ok = put(f'kitap/sh{bid}.bin', b, 'application/octet-stream') and put(f'kitap/sh{bid}.json', gzip.compress(json.dumps({'v': 1, 'b': diz}, ensure_ascii=False).encode(), 9), 'application/json', 'gzip')
            kay['kb'] = len(b) >> 10; kay['yuklendi'] = ok
            if ok and '--sil' in sys.argv:
                for _, fp in dosyalar.get(bid, []):
                    if os.path.exists(fp): os.remove(fp)
        return bid, kay
    n = 0
    with cf.ThreadPoolExecutor(int(os.environ.get('IS', 12))) as ex:
        for r in ex.map(is_, kitaplar):
            if not r: continue
            kat[r[0]] = r[1]; n += 1
            if n % 200 == 0: json.dump(kat, open(KAT, 'w'), ensure_ascii=False); print(n, 'kitap', flush=True)
    json.dump(kat, open(KAT, 'w'), ensure_ascii=False)
    print('paketleme bitti', n, flush=True)


if __name__ == '__main__':
    {'ayir': ayir, 'paketle': paketle}[sys.argv[1]]()
