"""Tefsir rafı: K2 (ayet ayet tefsir metni) ve K3 (külliyattaki tefsir kitapları) tek eser listesinde birleştirilir.
- Aynı eserin nüshaları (ikinci_nusha_of, aynı Türkçe ad+müellif, otomatik eşleşme) tek kayıtta toplanır.
- Türkçe adlar: tr_adlar_k2.py, tr_adlar_k3.py (Claude'un transkripsiyonu).
- Dönem (vefat, hicrî): erken ≤310, klasik 311–656, orta 657–922, osmanli 923–1342, modern ≥1343; vefatı bilinmeyenler 'modern' (çağdaş, tarihsiz).
Çıktı: site/data/kutuphane/tefsir.json"""
import json, os, re, sys, unicodedata
sys.path.insert(0, '/home/claude/lib/scripts')
from tr_adlar_k2 import TR as TR2
from tr_adlar_k3 import TR as TR3, HARIC, ESLESME_DUZELT
D = '/home/claude/vahiy-/site/data'
E2 = json.load(open(f'{D}/k2/eserler.json'))['eserler']
K = json.load(open(f'{D}/x/kitaplar.json'))['kitaplar']


def n(t):
    t = unicodedata.normalize('NFKC', t or ''); t = re.sub(r'[ً-ٰٟـ]', '', t)
    t = re.sub('[أإآ]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي'); t = re.sub(r'[^\w\s]', ' ', t); t = re.sub(r'\d+', ' ', t)
    return ' '.join(w for w in t.split() if w not in ('ال', 'في', 'فى', 'من', 'عن', 'و', 'تفسير', 'كتاب', 'القران', 'الكريم', 'العظيم', 'المجيد', 'العزيز', 'الجزء', 'ط', 'موافقا', 'للمطبوع', 'مخرجا', 'الاصيل'))


def an(t): return set(w.removeprefix('ال') for w in n(t).split() if len(w) > 2)


def donem(v):
    if not v or v > 1460: return 'modern'
    return 'erken' if v <= 310 else 'klasik' if v <= 656 else 'orta' if v <= 922 else 'osmanli' if v <= 1342 else 'modern'


eser = {}  # anahtar -> kayıt


def kayit(key, ad_tr, mu_tr, ad_ar, mu_ar, vefat):
    if key not in eser:
        eser[key] = {'ad': ad_tr, 'muellif': mu_tr, 'ad_ar': ad_ar, 'muellif_ar': mu_ar, 'vefat': vefat if vefat and vefat <= 1460 else None, 'k2': [], 'k3': [], 'tur': set()}
    e = eser[key]
    if not e['vefat'] and vefat and vefat <= 1460: e['vefat'] = vefat
    return e


# 1) K2: ikinci nüshalar ana esere, aynı Türkçe ad+müellif aynı esere
k2_key = {}
for wid, w in E2.items():
    ana = w.get('ikinci_nusha_of') or wid
    ad, mu = TR2[ana] if ana in TR2 else TR2[wid]
    key = (ad, mu)
    k2_key[wid] = key
    e = kayit(key, ad, mu, E2[ana]['ad'].strip(), E2[ana].get('muellif_tam') or E2[ana].get('muellif'), w.get('vefat'))
    e['tur'].add(w.get('tur') or 'tefsir')
    (e['k2'].insert(0, wid) if wid == ana and not w.get('ikinci_nusha_of') else e['k2'].append(wid))

# 2) K3: K2 eseriyle otomatik eşleşme (+ düzeltmeler), yoksa Türkçe ad+müellife göre
K2ana = [(wid, w) for wid, w in E2.items() if not w.get('ikinci_nusha_of')]
n2 = {(w['ad'].strip(), w.get('vefat')): wid for wid, w in E2.items()}
for bid, b in K.items():
    if b.get('tur') != 'tefsir' or bid in HARIC: continue
    hedef = ESLESME_DUZELT.get(bid, 'yok')
    if hedef == 'yok':
        hedef = n2.get((b['ad'].strip(), b.get('vefat')))
        if not hedef:
            t = n(b['ad'])
            for wid, w in K2ana:
                ty = n(w['ad'])
                if ty and t and (t == ty or (len(ty) > 6 and (ty in t or t in ty))) and (bool(an(b.get('muellif')) & an(w.get('muellif'))) or (b.get('vefat') and w.get('vefat') and abs(b['vefat'] - w['vefat']) <= 10) or not b.get('muellif')):
                    hedef = wid; break
    if hedef:
        e = eser[k2_key[hedef]]
    else:
        ad, mu, v = TR3[bid]
        e = kayit((ad, mu), ad, mu, b['ad'].strip(), b.get('muellif'), v or b.get('vefat'))
    e['k3'].append(bid)

out = []
for i, (k, e) in enumerate(sorted(eser.items(), key=lambda kv: (kv[1]['vefat'] or 9999, kv[1]['ad']))):
    w0 = E2.get(e['k2'][0]) if e['k2'] else None
    out.append({'id': f't{i + 1}', 'ad': e['ad'], 'muellif': e['muellif'], 'ad_ar': e['ad_ar'], 'muellif_ar': e['muellif_ar'], 'vefat': e['vefat'], 'donem': donem(e['vefat']),
                'tur': sorted(e['tur']) if e['tur'] else ['tefsir'], 'k2': e['k2'], 'k3': e['k3'], 'nesir': (w0 or {}).get('nesir') or {}, 'kaynak': (w0 or {}).get('kaynak') or (K[e['k3'][0]]['kaynak'] if e['k3'] else None),
                'dil': (w0 or {}).get('dil') or 'ar'})
DON = [['erken', 'Erken dönem', "h. I–III. asır · Taberî'ye kadar"], ['klasik', 'Klasik dönem', "h. 311–656 · Bağdat'ın düşüşüne kadar"], ['orta', 'Orta dönem', 'h. 657–922 · Memlükler ve beylikler'],
       ['osmanli', 'Osmanlı dönemi', 'h. 923–1342'], ['modern', 'Modern dönem', 'h. 1343 sonrası ve çağdaş eserler']]
os.makedirs(f'{D}/kutuphane', exist_ok=True)
json.dump({'version': 'raf-2026.10.24', 'tur': 'tefsir', 'donemler': DON, 'eserler': out,
           'not': "Eser ve müellif adlarının Türkçe yazımı Claude'a aittir (TDV İslâm Ansiklopedisi transkripsiyonu esas alındı). Dönem, müellifin hicrî vefat yılına göredir."},
          open(f'{D}/kutuphane/tefsir.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
import collections
print(len(out), 'eser;', collections.Counter(x['donem'] for x in out), '; ayet ayet okunabilir:', sum(1 for x in out if x['k2']), '; yalnız külliyat:', sum(1 for x in out if not x['k2']))
