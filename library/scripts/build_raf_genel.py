"""Hadis, fıkıh, kelâm, tasavvuf, tarih-ricâl, lügat ve kıraat rafları.
- Türkçe ad, müellif ve tür düzeltmesi: /home/claude/lib/raf/ad_*.txt (id|kod|ad|müellif|[vefat]); Claude transkripsiyonu.
  Kodlar: h hadis · f fıkıh · u usûl · k kelâm · s tasavvuf/zühd · t tarih · y siyer · c coğrafya/rıhle · r ricâl/tabakāt · l lügat/garîb · n nahiv/sarf/belâgat · q kıraat/tecvid
  (T tefsir, U ulûmü'l-Kur'ân, x diğer: bu raflara alınmaz).
- Metin: OpenITI (openiti_pri_data.zip, başlık işaretleri ### |) ve Quranpedia (qp_books, bölüm ağacı).
  Her kitap bölümlere ayrılır; her bölüm ayrı gzip üyesi olarak tek dosyada (kitap/{id}.bin) durur, dizin kitap/{id}.json'dadır.
  Okuyucu yalnız açılan bölümü HTTP Range ile indirir. Dosyalar R2 kovasına (vahiy) yüklenir, site /r2/ yolundan sunar.
Çıktı: site/data/kutuphane/{raf}.json ve R2 nesneleri."""
import gzip, io, json, os, re, sys, zipfile, glob, time, urllib.request, concurrent.futures as cf

D = '/home/claude/vahiy-/site/data'
RAW = '/home/claude/lib/raw'
K = json.load(open(f'{D}/x/kitaplar.json'))['kitaplar']
ZIP = zipfile.ZipFile(f'{RAW}/openiti_pri_data.zip')
ZN = {}
for n in ZIP.namelist():
    ZN.setdefault(re.sub(r'\.(completed|mARkdown|inProgress)$', '', n), n)

RAF = {'h': 'hadis', 'f': 'fikih', 'u': 'fikih', 'k': 'kelam', 's': 'tasavvuf', 't': 'tarih', 'y': 'tarih', 'c': 'tarih', 'r': 'tarih', 'l': 'lugat', 'n': 'lugat',
       'q': 'ulum', 'U': 'ulum', 'a': 'ulum', 'g': 'ulum', 'p': 'felsefe', 'm': 'felsefe'}
ONEK = {'hadis': 'h', 'fikih': 'f', 'kelam': 'k', 'tasavvuf': 's', 'tarih': 'r', 'lugat': 'l', 'ulum': 'u', 'felsefe': 'p'}
ADLAR = {}
for f in sorted(glob.glob('/home/claude/lib/raf/ad_*.txt')):
    for l in open(f, encoding='utf8'):
        p = l.rstrip('\n').split('|')
        if len(p) >= 4 and p[0].strip():
            ADLAR[p[0].strip()] = (p[1], p[2], p[3], int(p[4]) if len(p) > 4 and p[4].strip().isdigit() else None)


def donem(v):
    if not v or v > 1446: return 'modern'
    return 'erken' if v <= 310 else 'klasik' if v <= 656 else 'orta' if v <= 922 else 'osmanli' if v <= 1342 else 'modern'


# ---------------- metin ayrıştırma ----------------
PG = re.compile(r'PageV(\d+)P(\d+)')
HD = re.compile(r'^### (\|+|\$+)\s?(.*)$')


def temiz(t):
    t = t.replace('@QB@', '﴿').replace('@QE@', '﴾')
    t = re.sub(r'\bms\d+\b|\bMilestone\d+\b', '', t)
    t = re.sub(r'@[A-Z]{2,}@?|#~:[^:]*:|%~%', lambda m: ' ٭ ' if m.group(0) == '%~%' else '', t)
    t = PG.sub(lambda m: f'\x01{int(m.group(1))}:{int(m.group(2))}\x01', t)
    return re.sub(r'[ \t]+', ' ', t).strip()


def basliktemiz(t):
    t = PG.sub('', t).replace('@QB@', '﴿').replace('@QE@', '﴾')
    t = re.sub(r'\bms\d+\b', '', t)
    t = re.sub(r'\s+', ' ', t).strip(' ()-–')
    return t[:200]


def openiti(ref):
    n = ZN.get(ref) or ZN.get(ref.split(':', 1)[-1])
    if not n: return None
    t = ZIP.read(n).decode('utf8', 'replace')
    i = t.find('#META#Header#End#')
    if i >= 0: t = t[i + 17:]
    secs = [[1, 'Giriş', []]]  # [lvl, başlık, paragraflar]
    cur = None
    for line in t.split('\n'):
        m = HD.match(line)
        if m:
            lvl = len(m.group(1)) if m.group(1)[0] == '|' else 9
            secs.append([min(lvl, 9), basliktemiz(m.group(2)) or '—', []]); cur = None; continue
        if line.startswith('### '):  # başka başlık türleri: düz paragraf
            line = '# ' + line[4:]
        if line.startswith('#META#') : continue
        if line.startswith('~~'):
            if cur is not None: secs[-1][2][cur] += ' ' + line[2:]
            else: secs[-1][2].append(line[2:]); cur = len(secs[-1][2]) - 1
        elif line.startswith('# '):
            secs[-1][2].append(line[2:]); cur = len(secs[-1][2]) - 1
        elif line.strip():
            if cur is not None: secs[-1][2][cur] += ' ' + line
            else: secs[-1][2].append(line); cur = len(secs[-1][2]) - 1
    out = []
    for lvl, ttl, paras in secs:
        P = [x for x in (temiz(p) for p in paras) if x.replace('\x01', '').strip()]
        if not P and not (lvl == 1 and ttl == 'Giriş'): out.append([lvl, ttl, '']); continue
        if not P: continue
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
    # başlıksız, metni olmayan "Giriş" kaldır
    return out


def qp(ref):
    p = f'{RAW}/qp_books/book-{ref}.json.gz'
    if not os.path.exists(p): return None
    d = json.load(gzip.open(p))
    ch = {c['id']: c for c in d['chapters']}
    kid = {}
    for c in d['chapters']: kid.setdefault(c.get('parent_id'), []).append(c['id'])
    txt = {}
    for c in sorted(d['contents'], key=lambda x: x['id']):
        s = re.sub(r'<br\s*/?>\r?', '\n', c.get('text') or ''); s = re.sub(r'<[^>]+>', '', s)
        txt.setdefault(c['chapter_id'], []).append(s.strip())
    out = []
    def gez(pid, lvl):
        for i in kid.get(pid, []):
            c = ch[i]; T = '\n'.join(x for x in txt.get(i, []) if x)
            T = re.sub(r'\n{2,}', '\n', T)
            out.append([min(lvl, 9), (c.get('name') or '—').strip()[:200], T]); gez(i, lvl + 1)
    gez(None, 1)
    yetim = [c for c in txt if c not in ch]
    for c in yetim: out.append([1, '—', '\n'.join(txt[c])])
    return out


def paketle(secs):
    bio, diz, off = io.BytesIO(), [], 0
    for lvl, ttl, t in secs:
        if t:
            g = gzip.compress(t.encode('utf8'), 6, mtime=0); bio.write(g); diz.append([lvl, ttl, off, len(g)]); off += len(g)
        else: diz.append([lvl, ttl, 0, 0])
    return bio.getvalue(), diz


# ---------------- R2 ----------------
TOK = open(os.path.expanduser('~/.secrets/cf_token')).read().strip()
ACC = 'b7f9ed1b6a0180496480b0a47302ae4e'
BASE = f'https://api.cloudflare.com/client/v4/accounts/{ACC}/r2/buckets/vahiy/objects/'


def put(key, data, ctype, enc=None):
    for deneme in range(5):
        try:
            h = {'Authorization': f'Bearer {TOK}', 'Content-Type': ctype}
            if enc: h['Content-Encoding'] = enc
            r = urllib.request.urlopen(urllib.request.Request(BASE + key, data=data, method='PUT', headers=h), timeout=300)
            if r.status == 200: return True
        except Exception as e:
            err = e; time.sleep(2 + 3 * deneme)
    print('YÜKLENEMEDİ', key, err, flush=True); return False


def main():
    yukle = '--yukleme-yok' not in sys.argv
    DONE_F = '/home/claude/lib/raf/yuklendi.json'
    done = json.load(open(DONE_F)) if os.path.exists(DONE_F) else {}
    raflar = {r: [] for r in ONEK}
    gorulen = {}
    pool = cf.ThreadPoolExecutor(16); futs = []
    for i, (bid, (kod, ad, mu, vf)) in enumerate(sorted(ADLAR.items(), key=lambda x: int(x[0]))):
        raf = RAF.get(kod)
        if not raf or bid not in K: continue
        b = K[bid]
        anahtar = (raf, re.sub(r' \(\d\)$', '', ad), mu)
        eid = ('q' if kod == 'q' else ONEK[raf]) + bid
        if eid in done: secs_n, kb = done[eid]
        else:
            secs = openiti(b['ref']) if b.get('kaynak') == 'OpenITI' else qp(b.get('ref'))
            if not secs or not any(s[2] for s in secs): continue
            bin_, diz = paketle(secs)
            secs_n, kb = len(diz), round(len(bin_) / 1024)
            if yukle:
                j = gzip.compress(json.dumps({'v': 1, 'b': diz}, ensure_ascii=False, separators=(',', ':')).encode(), 9, mtime=0)
                f1 = pool.submit(put, f'kitap/{eid}.bin', bin_, 'application/octet-stream')
                f2 = pool.submit(put, f'kitap/{eid}.json', j, 'application/json; charset=utf-8', 'gzip')
                futs.append((eid, f1, f2, secs_n, kb))
        if anahtar in gorulen:  # aynı eserin ikinci nüshası
            e0 = gorulen[anahtar]
            if kb > e0['kb']: e0.update(id=eid, b=secs_n, kb=kb, ref=b.get('ref'), kaynak=b.get('kaynak'))
            continue
        v = vf or b.get('vefat')
        v = v if v and v <= 1446 else None
        e = {'id': eid, 'ad': ad, 'muellif': mu, 'ad_ar': b['ad'].strip(), 'muellif_ar': re.sub(r'\s*\(.*?\)\s*$', '', b.get('muellif') or '').strip(),
             'vefat': v, 'donem': donem(v), 'alt': kod, 'kaynak': b.get('kaynak'), 'ref': b.get('ref'), 'nesir': b.get('nesir') or '', 'b': secs_n, 'kb': kb}
        gorulen[anahtar] = e; raflar[raf].append(e)
        if len(futs) > 40:
            for eid2, f1, f2, n2, k2 in futs:
                if f1.result() and f2.result(): done[eid2] = [n2, k2]
            futs = []; json.dump(done, open(DONE_F, 'w'))
            print(i, eid, flush=True)
    for eid2, f1, f2, n2, k2 in futs:
        if f1.result() and f2.result(): done[eid2] = [n2, k2]
    json.dump(done, open(DONE_F, 'w'))
    DON = [['erken', 'Erken dönem', "h. I–III. asır"], ['klasik', 'Klasik dönem', "h. 311–656 · Bağdat'ın düşüşüne kadar"], ['orta', 'Orta dönem', 'h. 657–922 · Memlükler ve beylikler'],
           ['osmanli', 'Osmanlı dönemi', 'h. 923–1342'], ['modern', 'Modern dönem', 'h. 1343 sonrası ve çağdaş eserler']]
    for raf, L in raflar.items():
        L.sort(key=lambda e: (e['vefat'] or 9999, e['ad']))
        L = [e for e in L if e['id'] in done or not yukle]
        json.dump({'version': 'raf-2026.10.24', 'tur': raf, 'donemler': DON, 'eserler': L,
                   'not': "Eser ve müellif adlarının Türkçe yazımı ve tür düzeltmeleri Claude'a aittir (TDV İslâm Ansiklopedisi transkripsiyonu esas alındı). Dönem, müellifin hicrî vefat yılına göredir. Metinler OpenITI ve Quranpedia dijital nüshalarından bölümlere ayrıldı."},
                  open(f'{D}/kutuphane/{raf}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        print(raf, len(L))


if __name__ == '__main__':
    main()
