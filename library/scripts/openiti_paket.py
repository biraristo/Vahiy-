"""Şâmile'de olmayan OpenITI eserlerini (raf/openiti_secim.json 'yeni') kitap biçimine çevirir, denetler, R2'ye yükler.
Ayrıştırma build_raf_genel.openiti() ile aynıdır (### | başlıklar, PageVxxPyyy sayfa sonu işaretleri).
Denetim: sayfa işareti sayısı, sayfa sırasında geri atlama, başlık sayısı, boş bölüm, toplam harf; kaynak metindeki kelime sayısı ile
paketlenen metnin kelime sayısı karşılaştırılır (kayıp olmamalı).
Kimlik: kitap/oi{book anahtarının kısa özeti}. Çıktı: /home/claude/lib/raf/openiti_katalog.json"""
import os, sys, re, json, gzip, hashlib, concurrent.futures as cf
sys.argv = [sys.argv[0]] + [a for a in sys.argv[1:]]
_kaynak = open('/home/claude/vahiy-/library/scripts/build_raf_genel.py').read().split('# ---------------- R2 ----------------')[0]
exec(_kaynak.split('ADLAR = {}')[0].replace("K = json.load(open(f'{D}/x/kitaplar.json'))['kitaplar']", ''))
exec('PG = ' + _kaynak.split('PG = ', 1)[1])
from shamela_paket import paketle_bin, put
KAT = '/home/claude/lib/raf/openiti_katalog.json'
kat = json.load(open(KAT)) if os.path.exists(KAT) else {}
S = json.load(open('/home/claude/lib/raf/openiti_secim.json'))['yeni']
def kimlik(book): return 'oi' + hashlib.sha1(book.encode()).hexdigest()[:8]
def is_(a):
    eid = kimlik(a['book'])
    if eid in kat and kat[eid].get('yuklendi'): return None
    n = ZN.get(a['v']) or next((v for k, v in ZN.items() if k.endswith(a['v'])), None)
    if not n: return eid, {**{k: a[k] for k in ('v', 'book', 'baslik', 'muellif', 'vefat', 'dil', 'kategori')}, 'hata': 'zipte yok'}
    ham = ZIP.read(n).decode('utf8', 'replace')
    i = ham.find('#META#Header#End#'); govde = ham[i + 17:] if i >= 0 else ham
    secs = openiti(a['v']) or []
    sayfalar = [(int(x), int(y)) for x, y in PG.findall(govde)]
    geri = sum(1 for p, q in zip(sayfalar, sayfalar[1:]) if q < p)
    kaynak_kelime = len(re.findall(r'[ء-يپچگکی]+', re.sub(r'#META#[^\n]*|PageV\d+P\d+|ms\d+', ' ', govde)))
    paket_kelime = sum(len(re.findall(r'[ء-يپچگکی]+', re.sub(r'\x01[^\x01]*\x01', ' ', t + ' ' + b))) for _, b, t in secs)
    den = {'sayfa_isareti': len(sayfalar), 'geri_atlama': geri, 'bolum': len(secs), 'bos_bolum': sum(1 for x in secs if not re.sub(r'\x01[^\x01]*\x01', '', x[2]).strip()),
           'kaynak_kelime': kaynak_kelime, 'paket_kelime': paket_kelime, 'harf': sum(len(x[2]) for x in secs)}
    kay = {**{k: a[k] for k in ('v', 'book', 'baslik', 'muellif', 'vefat', 'dil', 'kategori')}, 'denetim': den}
    if secs and '--yukleme-yok' not in sys.argv:
        b, diz = paketle_bin(secs)
        ok = put(f'kitap/{eid}.bin', b, 'application/octet-stream') and put(f'kitap/{eid}.json', gzip.compress(json.dumps({'v': 1, 'b': diz}, ensure_ascii=False).encode(), 9), 'application/json', 'gzip')
        kay['kb'] = len(b) >> 10; kay['yuklendi'] = ok
    return eid, kay
n = 0
with cf.ThreadPoolExecutor(int(os.environ.get('IS', 3))) as ex:
    for r in ex.map(is_, S[:int(os.environ['ILK'])] if os.environ.get('ILK') else S):
        if not r: continue
        kat[r[0]] = r[1]; n += 1
        if n % 100 == 0: json.dump(kat, open(KAT, 'w'), ensure_ascii=False); print(n, flush=True)
json.dump(kat, open(KAT, 'w'), ensure_ascii=False)
print('bitti', n, flush=True)
