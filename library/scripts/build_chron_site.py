"""Sitedeki 'Kur'an atlası' için bütün sure sıralamaları → site/data/k0/siralamalar.json"""
import json
K = json.load(open('/home/claude/lib/raw/chronology/siralamalar.json'))
S = json.load(open('/home/claude/vahiy-/site/data/k0/surahs.json'))
SU = S['sureler']
out = []
def ek(id_, ad, tur, kaynak, dizi, notlar='', yer='', ref=None, grup=None, donem=None):
    dz = []
    for x in dizi:
        if x not in dz: dz.append(x)
    r = {'id': id_, 'ad': ad, 'tur': tur, 'kaynak': kaynak, 'yer': yer, 'ref': ref, 'dizi': dz, 'eksik': [n for n in range(1, 115) if n not in dz], 'notlar': notlar}
    if grup: r['gruplar'] = grup
    if donem: r['donemler'] = donem
    out.append(r)
ek('mushaf', 'Hz. Osman mushafı', 'mushaf', 'Hz. Osman döneminde çoğaltılan mushafın tertibi; bugünkü mushaflar (Kral Fahd baskısı, Hafs)', list(range(1, 115)))
ek('misir', 'Nüzul (Mısır)', 'nuzul', S['kaynaklar']['nuzul_misir'], [x['n'] for x in sorted(SU, key=lambda x: x['tertip']['nuzul_misir'])],
   'Kahire 1924 (Kral Fuad) mushafındaki nüzul sırası; büyük ölçüde İbn Abbas rivayetine dayanır.')
# klasik kaynaklar
SIRA = ['ibn_abbas', 'ibn_abbas_sehristani', 'zuhri', 'cafer', 'ibn_nedim', 'ibn_abdulkafi', 'ali', 'ubey', 'ibn_mesud']
KD = {k['id']: k for k in K}
for k in SIRA:
    x = KD[k]
    ek(k, x['ad'], x['tur'], x['kaynak'], x['dizi'], x['notlar'], x['yer'], x['eser'], x.get('gruplar'))
# Batılı
ek('noldeke', 'Nöldeke', 'nuzul', S['kaynaklar']['noldeke'], [x['n'] for x in sorted(SU, key=lambda x: x['tertip']['noldeke'])],
   'Nöldeke–Schwally dört dönem: Mekke I–III ve Medine.')
MUIR = [[103, 100, 99, 91, 106, 1, 101, 95, 102, 104, 82, 92, 105, 89, 90, 93, 94, 108], [96, 112, 74, 111],
        [87, 97, 88, 80, 81, 84, 86, 110, 85, 83, 78, 77, 76, 75, 70, 109, 107, 55, 56],
        [67, 53, 32, 39, 73, 79, 54, 34, 31, 69, 68, 41, 71, 52, 50, 45, 44, 37, 30, 26, 15, 51],
        [46, 72, 35, 36, 19, 18, 27, 42, 40, 38, 25, 20, 43, 12, 11, 10, 14, 6, 64, 28, 23, 22, 21, 17, 16, 13, 29, 7, 113, 114],
        [98, 2, 3, 8, 47, 62, 5, 59, 4, 58, 65, 63, 24, 33, 57, 61, 48, 60, 66, 49, 9]]
assert sorted(sum(MUIR, [])) == list(range(1, 115))
ek('muir', 'Muir', 'nuzul', "William Muir, The Corân: Its Composition and Teaching (London: SPCK, 1878), s. 43–46, 'Approximate Chronological Order of the Suras'",
   sum(MUIR, []), "Altı dönem (18/4/19/22/30/21). Tarama (OCR) okuma düzeltmeleri: CVL→CVI, CL→CI, CIL→CII, LXXXIL→LXXXII, XCIL→XCII, ikinci dönemdeki 'CXIII' (tevhid hakkında beş kısa ayet, 'Kul' ile başlar) → CXII; beşinci dönemde ikinci 'XL' (XII ile X arasında) → XI.",
   'archive.org/details/cornitscompos00muir (djvu metni)', 'https://archive.org/details/cornitscompos00muir', donem=[len(p) for p in MUIR])
ROD = [96, 74, 73, 93, 94, 113, 114, 1, 109, 112, 111, 108, 104, 107, 102, 92, 68, 90, 105, 106, 97, 86, 91, 80, 87, 95, 103, 85, 101, 99, 82, 81, 84, 100, 79, 77, 78, 88, 89, 75, 83, 69, 51, 52, 56, 53, 70, 55, 54, 37, 71, 76, 44, 50, 20, 26, 15, 19, 38, 36, 43, 72, 67, 23, 21, 25, 17, 27, 18, 32, 41, 45, 16, 30, 11, 14, 12, 40, 28, 39, 29, 31, 42, 10, 34, 35, 7, 46, 6, 13, 2, 98, 64, 62, 8, 47, 3, 61, 57, 4, 65, 59, 33, 63, 24, 58, 22, 48, 66, 60, 110, 49, 9, 5]
assert sorted(ROD) == list(range(1, 115))
ek('rodwell', 'Rodwell', 'nuzul', 'J. M. Rodwell, The Koran, Translated from the Arabic, the Suras Arranged in Chronological Order (London 1861) — içindekiler tablosu',
   ROD, 'Project Gutenberg #2800 içindekiler tablosundan iki ayrı okumayla doğrulandı.', 'gutenberg.org/ebooks/2800', 'https://www.gutenberg.org/ebooks/2800')
# kronoloji (ölüm yılı ya da yayın yılı) ve Mekke/Medine sınırı
YIL = {'ubey': ('ö. 30?', 30), 'ibn_mesud': ('ö. 32', 32), 'mushaf': ('ö. 35', 35), 'ali': ('ö. 40', 40), 'ibn_abbas': ('ö. 68', 68), 'ibn_abbas_sehristani': ('ö. 68', 68.5),
       'zuhri': ('ö. 124', 124), 'cafer': ('ö. 148', 148), 'ibn_nedim': ('ö. 385?', 385), 'ibn_abdulkafi': ('5. yy', 450), 'noldeke': ('1860', 1860 + 2000), 'rodwell': ('1861', 1861 + 2000),
       'muir': ('1878', 1878 + 2000), 'misir': ('1924', 1924 + 2000)}
for o in out:
    o['yil'], o['_s'] = YIL[o['id']]
    if o['tur'] == 'mushaf':
        o['medine_bas'] = None; o['donem'] = 'Bu tertipte Mekkî/Medenî dönem ayrımı yok.'
    else:
        ilk_med = {'zuhri': 1, 'muir': 98}.get(o['id'], 2)  # Zührî'nin Medine listesi Fâtiha ile, Muir'in son dönemi Beyyine ile başlar
        o['medine_bas'] = o['dizi'].index(ilk_med)
        o['donem'] = f"İlk {o['medine_bas']} sure Mekkî, sonrakiler Medenî ({'kaynağın kendi listesi' if o['id'] not in ('misir', 'noldeke', 'rodwell', 'muir') else 'kaynağın dönemlendirmesi'})."
out.sort(key=lambda o: o['_s'])
for o in out: o.pop('_s')
json.dump({'version': 'siralama-2026.10.23', 'siralamalar': out},
          open('/home/claude/vahiy-/site/data/k0/siralamalar.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
for o in out: print(f"{o['id']:22} {len(o['dizi']):3}  eksik:{o['eksik']}")
