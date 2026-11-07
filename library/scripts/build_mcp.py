"""vahiy++ MCP bağlayıcısının (worker.js /mcp) okuduğu küçük, satır tabanlı veri dosyaları.
Worker ücretsiz planda istek başına çok kısa işlemci süresiyle çalıştığı için büyük JSON'lar yerine
tek satırı düzenli ifadeyle bulunabilen TSV'ler üretilir.
Çıktı: site/data/mcp/
  eserler.tsv  id, raf, vefat, tr_ad, ar_ad, müellif_tr, müellif_ar, okuma_id (metnin R2 kimliği), arama anahtarı
  k.tsv        atıf dizinindeki eser kimliği → tr_ad, ar_ad, müellif, vefat, raf (y/k.json)
  atif.tsv     "s:a" → R2 atif/ayet.bin içindeki [ofset, uzunluk] (y/ofs.json)
  lugat.tsv    kök → [[eser, bölüm, başlık], ...] (k0/lugat.json)
  a/{s}.json   [[ayet_no, arapça, diyanet meali], ...]"""
import json, os, re
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'data')
O = os.path.join(D, 'mcp'); os.makedirs(f'{O}/a', exist_ok=True)
j = lambda p: json.load(open(os.path.join(D, p)))
temiz = lambda t: re.sub(r'[\t\n\r]+', ' ', str(t or '')).strip()
def anahtar(*t):
    s = ' '.join(temiz(x) for x in t)
    s = re.sub(r'[ً-ْٰـ]', '', s)
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    s = s.replace('İ', 'i').replace('I', 'ı').lower()
    for a, b in zip('âîûçğışöü', 'aiucgisou'): s = s.replace(a, b)
    return re.sub(r"[’'`ʿʾ\-]", '', s)
satir = []
for raf in j('kutuphane/raflar.json'):
    for e in j(f'kutuphane/{raf[0]}.json')['eserler']:
        okuma = e.get('tam') or e['id']
        satir.append('\t'.join(map(temiz, [e['id'], raf[0], e.get('vefat') or '', e.get('ad'), e.get('ad_ar'), e.get('muellif'), e.get('muellif_ar'), okuma,
                                             anahtar(e.get('ad'), e.get('ad_ar'), e.get('muellif'), e.get('muellif_ar'))])))
open(f'{O}/eserler.tsv', 'w').write('\n'.join(satir) + '\n')
K = j('y/k.json')
open(f'{O}/k.tsv', 'w').write(''.join('\t'.join(map(temiz, [i, *v])) + '\n' for i, v in K.items()))
open(f'{O}/atif.tsv', 'w').write(''.join(f'{k}\t{v[0]}\t{v[1]}\n' for k, v in j('y/ofs.json')['ayet'].items()))
L = j('k0/lugat.json')
open(f'{O}/lugat.tsv', 'w').write(''.join(f"{k}\t{json.dumps(v, ensure_ascii=False, separators=(',', ':'))}\n" for k, v in L['kok'].items()))
json.dump(L['kitap'], open(f'{O}/lugat_kitap.json', 'w'), ensure_ascii=False, separators=(',', ':'))
M = j('meal/tz-tr.diyanet.json'); off = 0
for s in range(1, 115):
    A = j(f'k0/s/{s}.json')['ayetler']
    json.dump([[x['a'], x['metin'], M[off + i]] for i, x in enumerate(A)], open(f'{O}/a/{s}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    off += len(A)
assert off == 6236
print('eser', len(satir), 'atıf eseri', len(K), 'kök', len(L['kok']), {f: round(os.path.getsize(f'{O}/{f}') / 1e3) for f in os.listdir(O) if '.' in f})
