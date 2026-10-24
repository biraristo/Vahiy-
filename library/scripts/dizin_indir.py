"""Kütüphanedeki bütün kitapların bölüm dizinlerini (R2 kitap/{id}.json) tek dosyada toplar: /home/claude/lib/fihrist/dizinler.json"""
import json, gzip, urllib.request
from concurrent.futures import ThreadPoolExecutor
from r2oku import r2_al  # Worker istek sınırına girmez
DZ = json.load(open('/home/claude/vahiy-/site/data/kutuphane/dizin.json'))
ids = sorted(k for k in DZ['r'] if k[0] != 't' or k.startswith(('sh', 'oi')))
def al(i):
    for _ in range(4):
        try:
            j = r2_al(f'kitap/{i}.json')
            try: b = json.loads(gzip.decompress(j))['b']
            except Exception: b = json.loads(j)['b']
            return i, [[x[0], x[1]] for x in b]
        except Exception: pass
    return i, None
with ThreadPoolExecutor(24) as ex: D = dict(ex.map(al, ids))
json.dump(D, open('/home/claude/lib/fihrist/dizinler.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(D), 'eksik', sum(1 for v in D.values() if v is None))
