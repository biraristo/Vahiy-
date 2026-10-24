"""Yayımlanmış kitapları siteden (worker /r2/kitap/) geri okuyarak doğrular.
Her kitap: dizin (json) açılıyor mu; .bin boyutu dizinle uyuşuyor mu; her bölüm çözülebiliyor mu ve boş değil mi;
sayfa işareti sayısı paketleme denetimindeki sayıyla eşit mi; cilt içinde sayfa numarası geri gidiyor mu.
Kullanım: python3 dogrula.py <katalog.json> <önek: sh|oi> [--hepsi]   → /home/claude/lib/raf/dogrulama_{önek}.json"""
import sys, os, re, json, gzip, zlib, urllib.request, concurrent.futures as cf
KAT, ONEK = sys.argv[1], sys.argv[2]
SITE = 'kitap/'
from r2oku import r2_al
OUT = f'/home/claude/lib/raf/dogrulama_{ONEK}.json'
kat = json.load(open(KAT))
sonuc = json.load(open(OUT)) if os.path.exists(OUT) and '--hepsi' not in sys.argv else {}
atla = set(open(sys.argv[sys.argv.index('--atla') + 1]).read().split()) if '--atla' in sys.argv else set()
def al(u):  # doğrudan R2 API: depodaki nesne baytları denetlenir (site yolu Worker sınırına girer)
    b = r2_al(u)
    if b is None: raise RuntimeError('404 ' + u)
    return b
def bir(k):
    eid = f'{ONEK}{k}' if ONEK == 'sh' else k
    r = {'hata': []}
    try:
        j = al(SITE + eid + '.json')
        try: D = json.loads(gzip.decompress(j))
        except Exception: D = json.loads(j)
        B = al(SITE + eid + '.bin')
    except Exception as e: return k, {'hata': [f'indirilemedi: {e}']}
    bolum, bos, isaret, geri, son = 0, 0, 0, 0, {}
    beklenen = 0
    for lvl, ttl, off, ln in D['b']:
        bolum += 1
        if not ln: continue
        beklenen = max(beklenen, off + ln)
        try: t = zlib.decompress(B[off:off + ln], 31).decode('utf8')
        except Exception: r['hata'].append(f'bölüm çözülemedi: {ttl[:40]}'); continue
        if not re.sub(r'\x01[^\x01]*\x01', '', t).strip(): bos += 1
        for v, p in re.findall(r'\x01(\d+):(\d+)\x01', t):
            isaret += 1; v, p = int(v), int(p)
            if v in son and p < son[v]: geri += 1
            son[v] = p
    if beklenen != len(B): r['hata'].append(f'boyut uyuşmuyor: dizin {beklenen}, dosya {len(B)}')
    den = kat[k].get('denetim') or {}
    if ONEK == 'sh' and den.get('sayfa_metin') is not None and isaret != den['sayfa_metin'] + den.get('eksik_sayfa', 0) and isaret != den['sayfa_metin']:
        r['hata'].append(f"sayfa sayısı: paket {isaret}, kaynak {den['sayfa_metin']}")
    if ONEK == 'oi' and den.get('sayfa_isareti') is not None and isaret != den['sayfa_isareti']:
        r['hata'].append(f"sayfa işareti: paket {isaret}, kaynak {den['sayfa_isareti']}")
    r.update({'bolum': bolum, 'bos_bolum': bos, 'sayfa': isaret, 'geri': geri, 'boyut': len(B)})
    return k, r
isler = [k for k, v in kat.items() if v.get('yuklendi') and k not in sonuc and k not in atla]
print(len(isler), 'kitap doğrulanacak', flush=True)
with cf.ThreadPoolExecutor(8) as ex:
    for n, (k, r) in enumerate(ex.map(bir, isler)):
        sonuc[k] = r
        if n % 500 == 0: json.dump(sonuc, open(OUT, 'w'), ensure_ascii=False); print(n, flush=True)
json.dump(sonuc, open(OUT, 'w'), ensure_ascii=False)
print('bitti', len(sonuc), 'hatalı', sum(1 for v in sonuc.values() if v['hata']), flush=True)
