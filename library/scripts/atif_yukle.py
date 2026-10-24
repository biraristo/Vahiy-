"""build_ayet_atif.py çıktısını (gzip json) R2'ye atif/ altına yükler; değişmeyenleri atlar (md5 önbelleği)."""
import os, sys, json, hashlib
from concurrent.futures import ThreadPoolExecutor
sys.argv = [sys.argv[0], '--yukleme-yok'] + sys.argv[1:]
from shamela_paket import put
R2 = os.environ.get('R2', '/home/claude/lib/atif/r2'); CACHE = f'{R2}/../yuklendi.json'
C = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
isler = []
for d, _, fs in os.walk(R2):
    for f in fs:
        p = os.path.join(d, f); k = 'atif/' + os.path.relpath(p, R2)
        b = open(p, 'rb').read(); h = hashlib.md5(b).hexdigest()
        if C.get(k) != h: isler.append((k, b, h))
print('yüklenecek', len(isler), flush=True)
def bir(x):
    k, b, h = x
    return k, h, put(k, b, 'application/json', 'gzip')
n = 0
with ThreadPoolExecutor(16) as ex:
    for k, h, ok in ex.map(bir, isler):
        if ok: C[k] = h
        n += 1
        if n % 1000 == 0: json.dump(C, open(CACHE, 'w')); print(n, flush=True)
json.dump(C, open(CACHE, 'w')); print('bitti', n, sum(1 for k in C))
