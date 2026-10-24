"""Açılış sayfasındaki Hizânetü'l-kütüb sayaçlarını sitedeki veriden hesaplar ve data/vitrin.json 'sayilar' alanına yazar.
Elle yazılmış sayı yoktur; kütüphaneye eser ya da ayet verisi eklendikçe gate.py bu betiği çalıştırır.
kitap: raflardaki tam metinli eser (Dinler tarihi metinleri dahil) · alinti: ayet alıntı dizinindeki (x/…/k3) toplam alıntı
rivayet: ayetlere bağlı tekil selef rivayeti (x/…/k4) · makale: ayetlere/surelere bağlanan tekil makale (k8)
eser: ayet alıntısı taranan eser (x/kitaplar.json) · yazma: el yazması nüsha (k6/yazma.json) · tefsir: rafta ayet ayet okunabilen tefsir
ravi: hayatı yazılan râvi (k4/raviler.json) · lugat: ayet sayfasındaki lügat (k5/index.json)"""
import json, glob, gzip, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'data')
j = lambda p: json.load(open(os.path.join(D, p)))
kitap = 0
for raf in j('kutuphane/raflar.json'): kitap += raf[3]
dn = j('kutuphane/dinler.json'); kitap += len(dn.get('metinler') or dn.get('eserler') or [])
riv, alinti = set(), 0
for f in glob.glob(os.path.join(D, 'x', '*', '*.json.gz')):
    x = json.load(gzip.open(f))
    riv.update(r['id'] for r in x.get('k4', []))
    alinti += sum(e[1] for L in x.get('k3', {}).values() for e in L)
mk = set()
for f in glob.glob(os.path.join(D, 'k8', '*.json')):
    K = json.load(open(f))
    for v in K['ayet'].values(): mk.update(map(str, v))
    S = K['sure']
    for v in (S.values() if isinstance(S, dict) else [S]):
        mk.update(map(str, v if isinstance(v, list) else [v]))
S = {'kitap': kitap, 'alinti': alinti, 'rivayet': len(riv), 'makale': len(mk), 'eser': len(j('x/kitaplar.json')['kitaplar']),
     'yazma': len(j('k6/yazma.json')['nushalar']), 'tefsir': sum(1 for e in j('kutuphane/tefsir.json')['eserler'] if e.get('k2')),
     'ravi': len(j('k4/raviler.json')['raviler']), 'lugat': len(j('k5/index.json')['lugatler'])}
V = j('vitrin.json'); V['sayilar'] = S
json.dump(V, open(os.path.join(D, 'vitrin.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(S)
