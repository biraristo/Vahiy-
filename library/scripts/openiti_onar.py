"""Uzun başlık satırında metin kaybı düzeltmesi: başlık satırı 150 harften uzun olan OpenITI eserlerini bulur, yeniden paketler, yükler
ve kelime denetimini yeniler. Kapsam: openiti_katalog.json (oi…) + eski raflarda korunan OpenITI kayıtları (dizin.json'da yönlendirilmemiş olanlar)."""
import os, sys, re, json, gzip, glob, concurrent.futures as cf
sys.argv = [sys.argv[0]]
_k = open('/home/claude/vahiy-/library/scripts/build_raf_genel.py').read().split('# ---------------- R2 ----------------')[0]
exec(_k.split('ADLAR = {}')[0].replace("K = json.load(open(f'{D}/x/kitaplar.json'))['kitaplar']", ''))
exec('PG = ' + _k.split('PG = ', 1)[1])
sys.path.insert(0, '/home/claude/vahiy-/library/scripts')
from shamela_paket import paketle_bin, put
KAT = '/home/claude/lib/raf/openiti_katalog.json'
kat = json.load(open(KAT))
DZ = json.load(open('/home/claude/vahiy-/site/data/kutuphane/dizin.json'))
isler = [(eid, v['v']) for eid, v in kat.items()]
for f in glob.glob('/home/claude/lib/raf/eski_raflar/*.json'):
    for e in json.load(open(f))['eserler']:
        if e.get('kaynak') == 'OpenITI' and e['id'] not in DZ['y'] and e['id'][0] != 't': isler.append((e['id'], e['ref']))
UZUN = re.compile(r'^### (?:\|+|\$+)\s?(.{151,})$', re.M)
def ham(ref):
    n = ZN.get(ref) or next((v for k, v in ZN.items() if k.endswith(ref)), None)
    if not n: return None
    t = ZIP.read(n).decode('utf8', 'replace'); i = t.find('#META#Header#End#'); return t[i + 17:] if i >= 0 else t
def bir(x):
    eid, ref = x
    g = ham(ref)
    if g is None: return eid, 'yok'
    if not any(len(re.sub(r'\s+', ' ', PG.sub('', m)).strip()) > 150 for m in UZUN.findall(g)): return eid, None
    secs = openiti(ref)
    W = lambda t: len(re.findall(r'[ء-يپچگکی]+', t))
    kaynak = W(re.sub(r'#META#[^\n]*|PageV\d+P\d+|ms\d+', ' ', g))
    paket = sum(W(re.sub(r'\x01[^\x01]*\x01', ' ', t)) + W(b) for _, b, t in secs)  # metin + başlık
    b, diz = paketle_bin(secs)
    ok = put(f'kitap/{eid}.bin', b, 'application/octet-stream') and put(f'kitap/{eid}.json', gzip.compress(json.dumps({'v': 1, 'b': diz}, ensure_ascii=False).encode(), 9), 'application/json', 'gzip')
    return eid, {'ok': ok, 'kaynak_kelime': kaynak, 'metin_kelime': paket, 'bolum': len(secs), 'kb': len(b) >> 10}
sonuc = {}
with cf.ThreadPoolExecutor(int(os.environ.get('IS', 3))) as ex:
    for n, (eid, r) in enumerate(ex.map(bir, isler)):
        if r: sonuc[eid] = r
        if n % 500 == 0: print(n, len(sonuc), flush=True)
for eid, r in sonuc.items():
    if eid in kat and isinstance(r, dict):
        kat[eid]['denetim'].update({'bolum': r['bolum'], 'metin_kelime': r['metin_kelime'], 'onarildi': True}); kat[eid]['kb'] = r['kb']; kat[eid]['yuklendi'] = r['ok']
json.dump(kat, open(KAT, 'w'), ensure_ascii=False)
json.dump(sonuc, open('/home/claude/lib/raf/openiti_onar.json', 'w'), ensure_ascii=False)
print('bitti', len(sonuc), 'yüklenemedi', sum(1 for r in sonuc.values() if isinstance(r, dict) and not r['ok']),
      'kelime kaybı', sum(1 for r in sonuc.values() if isinstance(r, dict) and r['metin_kelime'] < r['kaynak_kelime']), flush=True)
