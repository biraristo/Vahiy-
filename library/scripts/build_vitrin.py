"""Açılış sayfası verisi: data/vitrin.json (giriş ayetleri, akan eser adları, asır sayıları, genel sayılar), data/k0/ilk.json (her ayetin ilk kelimeleri),
data/x/adlar.json (kitap no → ad, yıldız ağı etiketleri için)."""
import json, random, collections, xml.etree.ElementTree as ET
D = '/home/claude/vahiy-/site/data'
M = '/tmp/claude-0/-home-claude/9f39ff41-3bc3-5de9-bdbb-7eb83ee0152d/scratchpad/mock'
K = json.load(open(f'{D}/x/kitaplar.json'))['kitaplar']
giris = [g for g in json.load(open(f'{M}/giris.json')) if g['r'] not in ('39:9', '96:3-5')]
AI = '٠١٢٣٤٥٦٧٨٩'
for g in giris:
    s, rng = g['r'].split(':'); a = int(rng.split('-')[0]); parts = g['ar'].split(' ۝ ')
    g['ar'] = ' '.join(p + ' ﴿' + ''.join(AI[int(c)] for c in str(a + i)) + '﴾' for i, p in enumerate(parts))
random.seed(3)
names = [k['ad'][:36] for k in K.values() if k.get('tur') in ('tefsir', 'hadis', 'fikih', 'dil', 'ulum', 'tasavvuf', 'kelam', 'tarih') and len(k['ad']) < 36]
random.shuffle(names)
asr = collections.Counter()
for k in K.values():
    v = k.get('vefat')
    if isinstance(v, int) and 0 < v < 1460: asr[(v - 1) // 100 + 1] += 1
json.dump({'version': 'vitrin-2026.10.23', 'giris': giris, 'giris_meal': 'Diyanet İşleri meali (Tanzil)', 'adlar': names[:240], 'asir': sorted(asr.items()),
           'sayilar': {'eser': len(K), 'alinti': 6195664, 'tefsir': 173, 'rivayet': 84421, 'ravi': 625, 'yazma': 2322, 'makale': 27252, 'lugat': 12}},
          open(f'{D}/vitrin.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump({k: v['ad'] for k, v in K.items()}, open(f'{D}/x/adlar.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
ilk = {}
for s in ET.parse('/home/claude/lib/raw/tanzil/quran-uthmani.xml').getroot():
    L = []
    for a in s:
        t = a.get('text')
        if a.get('index') == '1' and s.get('index') not in ('1', '9'): t = t.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ', '')
        w = t.split(); L.append(' '.join(w[:6]) + (' …' if len(w) > 6 else ''))
    ilk[s.get('index')] = L
json.dump(ilk, open(f'{D}/k0/ilk.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
