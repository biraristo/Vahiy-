"""Şâmile kitaplarının içerik imzası (ilk ~1200 kelimenin 5'li dizileri) → /home/claude/lib/raf/shamela_imza.json
Henüz paketlenmemiş kitaplar geçici sayfa dosyalarından, paketlenmişler siteden (ilk bölümler, Range ile) okunur."""
import os, re, json, gzip, sqlite3, urllib.request, concurrent.futures as cf, sys
sys.path.insert(0, os.path.dirname(__file__))
from openiti_aday_ortak import norm, imza
TMP = '/home/claude/lib/shamela/tmp/sayfa'
OUT = '/home/claude/lib/raf/shamela_imza.json'
SITE = 'kitap/'
from r2oku import r2_al
ETIKET = re.compile(r'<[^>]+>')
out = json.load(open(OUT)) if os.path.exists(OUT) else {}
m = sqlite3.connect('/home/claude/lib/shamela/x/database/master.db')
ids = [str(r[0]) for r in m.execute('select book_id from book')]
yerel = {}
for fn in os.listdir(TMP):
    mm = re.match(r'(\d+)\.1\.gz$', fn)
    if mm: yerel[mm.group(1)] = f'{TMP}/{fn}'
_ON = {}
def al(u, rng=None):  # doğrudan R2 API; Range desteklenmediği için nesne bir kez alınıp dilimlenir
    if u not in _ON: _ON.clear(); _ON[u] = r2_al(u)
    b = _ON[u]
    if b is None or not rng: return b
    a, z = map(int, rng[6:].split('-')); return b[a:z + 1]
def bir(bid):
    if bid in out: return None
    ws = []
    try:
        if bid in yerel:
            with gzip.open(yerel[bid], 'rt', encoding='utf8', errors='replace') as f:
                for line in f:
                    d = json.loads(line); ws += norm(ETIKET.sub(' ', d.get('body') or ''))
                    if len(ws) > 1300: break
        else:
            j = al(SITE + f'sh{bid}.json')
            if not j: return bid, None
            try: D = json.loads(gzip.decompress(j))
            except Exception: D = json.loads(j)
            for lvl, t, off, ln in D['b']:
                if not ln: continue
                b = al(SITE + f'sh{bid}.bin', f'bytes={off}-{off + ln - 1}')
                if b: ws += norm(re.sub(r'[\x01\x04][^\x01]*\x01?', ' ', gzip.decompress(b).decode('utf8', 'replace')))
                if len(ws) > 1300: break
    except Exception: return bid, None
    return bid, imza(ws[:1200])
with cf.ThreadPoolExecutor(8) as ex:
    for n, r in enumerate(ex.map(bir, ids)):
        if r and r[1] is not None: out[r[0]] = r[1]
        if n % 1000 == 0: print(n, len(out), flush=True)
json.dump(out, open(OUT, 'w'))
print('bitti', len(out), 'imza', flush=True)
