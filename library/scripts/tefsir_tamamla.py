"""Tefsir rafında metni olmayan kayıtların (t…) tam metnini bulur, kitap biçimine çevirip R2'ye yükler.
Kaynak: kaydın kendi alıntı künyeleri (k3 → x/kitaplar.json ref): OpenITI sürümü (openiti_pri_data.zip) ya da Quranpedia kitabı (raw/qp_books).
Bir kaydın birden çok nüshası varsa en çok metin içeren seçilir. Kimlik: Quranpedia q{id}, OpenITI oi{sha1(book)[:8]} (mevcut paketlerle aynı).
Denetim: bölüm sayısı, toplam harf (≥ 1500), kaynak başlığı ile kayıt başlığının ortak kelimesi.
Çıktı: /home/claude/lib/raf/tefsir_tam.json = {t_id: {id, kaynak, ref, bolum, harf, durum}}; build_raflar.py bunu 'tam' alanına yazar.
Kullanım: python3 tefsir_tamamla.py [--yukleme-yok]"""
import os, sys, re, json, gzip, hashlib, concurrent.futures as cf
yukle = '--yukleme-yok' not in sys.argv
sys.argv = [sys.argv[0]]
_k = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_raf_genel.py')).read().split('# ---------------- R2 ----------------')[0]
exec(_k.split('ADLAR = {}')[0])
exec('PG = ' + _k.split('PG = ', 1)[1])
from shamela_paket import put
SITE = '/home/claude/vahiy-/site/data'
OUT = '/home/claude/lib/raf/tefsir_tam.json'
R2 = {k[6:-5] for k in json.load(open('/home/claude/lib/r2_kitap_liste.json')) if k.endswith('.json')}
kat = json.load(open('/home/claude/lib/raf/openiti_katalog.json'))
V2OI = {v['v']: k for k, v in kat.items() if v.get('yuklendi')}
L = json.load(open(f'{SITE}/kutuphane/tefsir.json'))['eserler']
hedef = [e for e in L if not (({e['id']} | ({e['tam']} if e.get('tam') else set())) & R2 or e.get('k2'))]
sonuc = json.load(open(OUT)) if os.path.exists(OUT) else {}
norm = lambda t: set(re.sub(r'[ً-ْٰ]', '', t or '').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي').split()) - {'في', 'من', 'علي', 'على', 'ال', 'و', 'تفسير', 'كتاب'}
def harf(secs): return sum(len(s[2]) for s in secs)
def isle(e):
    adaylar = []
    for i in e.get('k3', []):
        b = K.get(i)
        if not b: continue
        ref = b.get('ref')
        if b.get('kaynak') == 'OpenITI' and '.' in (ref or ''):
            book = '.'.join(ref.split('.')[:2]); eid = V2OI.get(ref) or 'oi' + hashlib.sha1(book.encode()).hexdigest()[:8]
            if eid in R2: return e['id'], {'id': eid, 'kaynak': 'OpenITI', 'ref': ref, 'durum': 'R2de vardı', 'kaynak_ad': b['ad']}
            try: secs = openiti(ref)
            except Exception: secs = None
        else:
            eid = f'q{ref}'
            if eid in R2: return e['id'], {'id': eid, 'kaynak': 'Quranpedia', 'ref': ref, 'durum': 'R2de vardı', 'kaynak_ad': b['ad']}
            try: secs = qp(ref)
            except Exception: secs = None
        if secs and any(s[2] for s in secs): adaylar.append((harf(secs), eid, b, ref, secs))
    if not adaylar: return e['id'], {'durum': 'kaynak metin bulunamadı'}
    h, eid, b, ref, secs = max(adaylar, key=lambda x: x[0])
    ortak = norm(e['ad_ar']) & norm(b['ad'])
    kay = {'id': eid, 'kaynak': b.get('kaynak'), 'ref': ref, 'bolum': len(secs), 'harf': h, 'kaynak_ad': b['ad'], 'baslik_ortak': len(ortak)}
    if h < 1500: return e['id'], {**kay, 'durum': 'metin çok kısa'}
    if not yukle: return e['id'], {**kay, 'durum': 'hazır (yüklenmedi)'}
    bin_, diz = paketle(secs)
    j = gzip.compress(json.dumps({'v': 1, 'b': diz}, ensure_ascii=False, separators=(',', ':')).encode(), 9, mtime=0)
    ok = put(f'kitap/{eid}.bin', bin_, 'application/octet-stream') and put(f'kitap/{eid}.json', j, 'application/json; charset=utf-8', 'gzip')
    return e['id'], {**kay, 'durum': 'yüklendi' if ok else 'yükleme hatası'}
with cf.ThreadPoolExecutor(6) as ex:
    for tid, r in ex.map(isle, [e for e in hedef if sonuc.get(e['id'], {}).get('durum') not in ('yüklendi', 'R2de vardı')]):
        sonuc[tid] = r; print(tid, r.get('durum'), r.get('id', ''), r.get('harf', ''), flush=True)
        json.dump(sonuc, open(OUT, 'w'), ensure_ascii=False, indent=0)
import collections
print(collections.Counter(v['durum'] for v in sonuc.values()))
