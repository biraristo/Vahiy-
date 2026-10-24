"""kuranfihristi.net konu fihristi → /home/claude/lib/raw/kuranfihristi/fihrist.json {konu: [ "s:a", ...]}
Harf sayfalarından konu listesi, her konu sayfasından "X Suresi, N. ayet" atıfları. Ham sayfalar s/ altında saklanır."""
import os, re, json, time, html, urllib.request, urllib.parse, concurrent.futures as cf
D = '/home/claude/lib/raw/kuranfihristi'; os.makedirs(f'{D}/s', exist_ok=True)
SITE = 'https://www.kuranfihristi.net'
def al(yol, dosya):
    if os.path.exists(dosya) and os.path.getsize(dosya) > 3000: return open(dosya, encoding='utf8', errors='replace').read()
    u = SITE + urllib.parse.quote(yol)
    for d in range(4):
        try:
            b = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
            open(dosya, 'wb').write(b); time.sleep(.3); return b.decode('utf8', 'replace')
        except Exception: time.sleep(2 + 3 * d)
    return ''
HARF = 'a b c ç d e f g h ı i j k l m n o ö p r s ş t u ü v y z'.split()
konular = {}
for h in HARF:
    t = al(f'/harfler/{h}', f'{D}/s/_harf_{h}.html')
    for yol, ad in re.findall(r'href="(/fihrist/[^"]+)"[^>]*>([^<]+)<', t): konular[yol] = html.unescape(ad).strip()
print('konu', len(konular), flush=True)
def bir(it):
    yol, ad = it
    t = al(yol, f"{D}/s/{yol.rsplit('/', 1)[1][:150]}.html")
    return ad, yol, re.findall(r"([A-ZÇĞİÖŞÜa-zçğıöşüâîû'’\-\s]+?)\s+Suresi,\s*(\d+)\.\s*ayet", html.unescape(re.sub(r'<[^>]+>', ' ', t)))
out = {}
with cf.ThreadPoolExecutor(3) as ex:
    for n, (ad, yol, L) in enumerate(ex.map(bir, konular.items())):
        out[ad] = {'yol': yol, 'ayetler': [[s.strip(), int(a)] for s, a in L]}
        if n % 200 == 0: print(n, flush=True)
json.dump(out, open(f'{D}/fihrist_ham.json', 'w'), ensure_ascii=False)
print('bitti', len(out), 'boş', sum(1 for v in out.values() if not v['ayetler']), 'atıf', sum(len(v['ayetler']) for v in out.values()))
