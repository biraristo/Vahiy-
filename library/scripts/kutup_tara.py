"""Kütüphane ayet alıntı dizini — tarayıcı (yeni kütüphane: R2 kitap/{id}).
Eşleştirme çekirdeği k3_scan.py ile aynıdır: Tanzil simple-clean, normalleştirme, 4 kelimelik diziler, koşular;
kabul: en az 6 kelime ya da en az 5 kelimelik bir ayetin tamamı; 3'ten fazla yere uyan 10 kelimeden kısa kalıplar atılır.
Fark: kitaplar sitedeki kütüphaneden (dizin.json) okunur; tefsirler de taranır; her alıntının bölüm numarası yazılır.
Çıktı: /home/claude/lib/atif/hits-{parça}.tsv
  satır: kitap \t bölüm \t cilt \t sayfa \t ilk_ayet_idx \t son_ayet_idx \t kelime \t tam_ayet(0/1) \t parça
Kullanım: python3 kutup_tara.py <parça_no> <parça_sayısı>"""
import sys, os, re, json, gzip, zlib, bisect, time, urllib.request
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'k3_scan.py'), encoding='utf8').read()
_core = _src[_src.index('import sys, os'):_src.index('def openiti_jobs')]
_argv = sys.argv; sys.argv = [sys.argv[0], '-1', '1']
exec(_core.replace("os.makedirs(TMP, exist_ok=True)", ''))
sys.argv = _argv
PART, NPART = int(sys.argv[1]), int(sys.argv[2])
OUT = '/home/claude/lib/atif'; os.makedirs(OUT, exist_ok=True)
SITE = 'https://vahiy.bunyaminatalay07.workers.dev/r2/kitap/'
H = {'User-Agent': 'Mozilla/5.0 vahiy-tara'}
def al(u):
    for d in range(6):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=180).read()
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(3 + 5 * d)
        except Exception: time.sleep(3 + 5 * d)
    return None
def snip2(tokens, i, n):
    a, b = max(0, i - 6), min(len(tokens), i + n + 6)
    return ' '.join(t for t in tokens[a:b] if not t.startswith('PageV')).replace('\t', ' ')[:300]
DZ = json.load(open('/home/claude/vahiy-/site/data/kutuphane/dizin.json'))
kitaplar = sorted(k for k in DZ['r'] if k[0] != 't' or k.startswith(('sh', 'oi')))
kitaplar = [k for n, k in enumerate(kitaplar) if n % NPART == PART]
donef = f'{OUT}/done-{PART}.txt'; done = set(open(donef).read().split()) if os.path.exists(donef) else set()
hf = f'{OUT}/hits-{PART}.tsv'
if os.path.exists(hf):
    with open(hf, encoding='utf8') as f, open(hf + '.tmp', 'w', encoding='utf8') as g:
        for line in f:
            if line.split('\t', 1)[0] in done: g.write(line)
    os.replace(hf + '.tmp', hf)
out = open(hf, 'a', encoding='utf8'); dlog = open(donef, 'a'); t0 = time.time()
class Yaz:  # scan() çıktısını bölüm numarasıyla yazar
    def __init__(s): s.sec = 0; s.tok = None
    def write(s, line):
        b, vol, pg, fa, la, ln, _, full, sn = line.rstrip('\n').split('\t', 8)
        out.write(f'{b}\t{s.sec}\t{vol}\t{pg}\t{fa}\t{la}\t{ln}\t{full}\t{sn[:300]}\n')
Y = Yaz()
for k, bid in enumerate(kitaplar):
    if bid in done: continue
    j = al(SITE + bid + '.json'); B = al(SITE + bid + '.bin') if j else None
    if not j or not B: dlog.write(bid + '\n'); dlog.flush(); continue
    try: D = json.loads(gzip.decompress(j))['b']
    except Exception: D = json.loads(j)['b']
    son = (0, 0)
    for si, (lvl, ttl, off, ln) in enumerate(D):
        if not ln: continue
        try: t = zlib.decompress(B[off:off + ln], 31).decode('utf8', 'replace')
        except Exception: continue
        t = re.sub(r'\x01(\d+):(\d+)\x01', lambda m: f' PageV{m.group(1)}P{m.group(2)} ', t).replace('\x04', ' ')
        tokens = t.split()
        marks = [(i, int(m.group(1)), int(m.group(2))) for i, x in enumerate(tokens) if x.startswith('PageV') for m in [PAGE.match(x)] if m]
        mpos = [m[0] for m in marks]
        def pagefn(i, marks=marks, mpos=mpos, son=son):
            p = bisect.bisect_right(mpos, i)
            if p < len(marks): return marks[p][1], marks[p][2]
            return (marks[-1][1], marks[-1][2] + 1) if marks else son
        Y.sec = si
        scan(tokens, marks, Y, bid, pagefn)
        if marks: son = (marks[-1][1], marks[-1][2] + 1)
    out.flush(); dlog.write(bid + '\n'); dlog.flush()
    if k % 100 == 0: print(PART, k, len(kitaplar), round(time.time() - t0), flush=True)
print(PART, 'bitti', round(time.time() - t0), flush=True)
