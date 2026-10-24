"""R2'den doğrudan okuma (Cloudflare API, ~/.secrets/cf_token). Toplu işler bunu kullanır:
sitenin /r2/ yolu Worker isteği sayılır ve ücretsiz plandaki günlük 100 bin sınırını doldurur."""
import os, time, urllib.request
TOK = open(os.path.expanduser('~/.secrets/cf_token')).read().strip()
BASE = 'https://api.cloudflare.com/client/v4/accounts/b7f9ed1b6a0180496480b0a47302ae4e/r2/buckets/vahiy/objects/'
def r2_al(key, deneme=6):
    """Nesneyi baytlar olarak döndürür; yoksa None. (API Range desteklemez; nesnenin tamamı gelir.)"""
    for d in range(deneme):
        try:
            return urllib.request.urlopen(urllib.request.Request(BASE + key, headers={'Authorization': f'Bearer {TOK}'}), timeout=600).read()
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(2 + 4 * d)
        except Exception: time.sleep(2 + 4 * d)
    return None
def r2_liste(onek):
    """Önekli bütün nesne anahtarları (Cloudflare API, sayfa sayfa)."""
    import json
    L, cur = [], ''
    while True:
        u = BASE.rstrip('/').rsplit('/objects', 1)[0] + f'/objects?prefix={onek}&per_page=1000' + (f'&cursor={cur}' if cur else '')
        j = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={'Authorization': f'Bearer {TOK}'}), timeout=120).read())
        L += [o['key'] for o in j['result']]
        cur = (j.get('result_info') or {}).get('cursor')
        if not cur or not (j.get('result_info') or {}).get('is_truncated'): return L
