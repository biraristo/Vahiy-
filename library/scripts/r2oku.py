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
