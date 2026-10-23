"""Açılış sayfası haritaları için ayet başına sayımlar → site/data/k0/yogunluk.json
{"ihtilaf": {s: [ayet başına ihtilaf pasajı]}, "nuzul": {s: [ayet başına esbâb-ı nüzûl rivayeti]}}
Kaynak: x/{s}/{a}.json.gz paketleri (k7 ihtilaf: tefsirlerde ihtilaf bildiren pasajlar; k4: Mevsûa rivayetleri, türü 'نزول' içerenler)."""
import json, gzip
D = '/home/claude/vahiy-/site/data'
S = json.load(open(f'{D}/k0/surahs.json'))['sureler']
ih, nz = {}, {}
for x in S:
    s = x['n']; ih[s] = []; nz[s] = []
    for a in range(1, x['ayet'] + 1):
        b = json.load(gzip.open(f'{D}/x/{s}/{a}.json.gz'))
        ih[s].append(len(b['k7']['ihtilaf']))
        nz[s].append(sum('نزول' in (r.get('tur') or '') for r in b['k4']))
json.dump({'version': 'yogunluk-2026.10.23', 'ihtilaf': ih, 'nuzul': nz,
           'kaynak': {'ihtilaf': 'Tefsirlerde ihtilaf bildiren pasajlar (Katman 7)', 'nuzul': "Mevsûatü't-tefsîri'l-me'sûr rivayetleri, türü nüzul sebebi olanlar (Katman 4)"}},
          open(f'{D}/k0/yogunluk.json', 'w'), separators=(',', ':'))
print('ihtilaf', sum(map(sum, ih.values())), 'nuzul', sum(map(sum, nz.values())))
