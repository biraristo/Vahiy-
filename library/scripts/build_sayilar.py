"""Sitedeki bütün sayıların tek kaynağı. Her sayı sitenin kendi verisinden ve R2'deki gerçek nesnelerden sayılır; elle yazılmış sayı yoktur.
Çıktılar:
  site/data/vitrin.json  'sayilar'   açılış ve Kütüphane sayfasının okuduğu sayılar
  site/data/istatistik.json          her sayının tanımı, değeri ve kaynağı (denetim kaydı)
Kullanım: python3 build_sayilar.py [--r2]   (--r2: R2'deki kitap nesnelerini yeniden listeler; yoksa son liste kullanılır)
Tanımlar (24.10.2026 baştan sayım):
  eser          raflardaki eser (aynı eserin baskıları/ayet-ayet ve tam metin kayıtları tek eser)
  eser_metinli  metni sitede okunabilen raf eseri: R2'de kitap dizini olan ya da ayet ayet metni (k2) bulunan
  eser_metinsiz rafta kaydı olup metni sitede olmayan (yalnız alıntı kaydı bulunan) eser
  dinler        Dinler tarihi rafındaki paralel metin (pasaj)
  alinti        kütüphane taramasında bulunan ayet alıntısı (satır; atif/ozet)
  alinti_eser   en az bir ayet alıntısı bulunan eser · alinti_ayet: en az bir eserde alıntılanan ayet
  tefsir        tefsir rafındaki eser · tefsir_metinli: bunlardan metni okunabilen · tefsir_ayet: ayet ayet ayrıştırılmış tefsir (k2)
  rivayet       ayetlere bağlı tekil selef rivayeti (Mevsûa, x/…/k4) · ravi: bu rivayetlerin râvileri (k4/raviler.json)
  biyografi     biyografi kitaplarındaki kişi maddesi · rical_kitap: biyografi kitabı (build_rical.py)
  yazma         el yazması Kur'an nüshası (k6/yazma.json) · yazma_tarihli: tarihi bilinen nüsha (k6/eski.json)
  makale        ayetlere/surelere bağlanan tekil akademik makale (k8)
  lugat         ayet sayfasındaki sözlük: kök eşleşmeli (k0/lugat.json) + ayrıştırılmış metinli (k5) olup onlarda bulunmayan
  meal          ayet sayfasındaki Türkçe meal · hadis: ayetlere bağlı Hadis Ansiklopedisi kaydı (k4/he)
  fihrist_konu  kütüphane fihristi konu başlığı (fh2) · muellif: raflardaki tekil müellif (Arapça adıyla)"""
import json, glob, gzip, os, re, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'data')
j = lambda p: json.load(open(os.path.join(D, p)))
LISTE = '/home/claude/lib/r2_kitap_liste.json'
if '--r2' in sys.argv or not os.path.exists(LISTE):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from r2oku import r2_liste
    json.dump(r2_liste('kitap/'), open(LISTE, 'w'))
R2 = {k[6:-5] for k in json.load(open(LISTE)) if k.endswith('.json')}
# --- raflar
eser = metinli = 0; mu = set(); tefsir = tefsir_ayet = tefsir_metinli = 0
for raf in j('kutuphane/raflar.json'):
    for e in j(f"kutuphane/{raf[0]}.json")['eserler']:
        eser += 1
        ids = {e['id']} | ({e['tam']} if e.get('tam') else set())
        var = bool(ids & R2 or e.get('k2')); metinli += var
        mu.add((e.get('muellif_ar') or e.get('muellif') or '').strip())
        if raf[0] == 'tefsir': tefsir += 1; tefsir_ayet += bool(e.get('k2')); tefsir_metinli += var
mu.discard('')
# --- atıf (kütüphane taraması)
OZ = j('y/ozet.json')
# --- rivayet, makale
riv = set()
for f in glob.glob(os.path.join(D, 'x', '*', '*.json.gz')):
    riv.update(r['id'] for r in json.load(gzip.open(f)).get('k4', []))
mk = set()
for f in glob.glob(os.path.join(D, 'k8', '*.json')):
    K = json.load(open(f))
    for v in K['ayet'].values(): mk.update(map(str, v))
    S_ = K['sure']
    for v in (S_.values() if isinstance(S_, dict) else [S_]): mk.update(map(str, v if isinstance(v, list) else [v]))
hd = set()
for f in glob.glob(os.path.join(D, 'k4', 'he', '*.json')): hd.update(json.load(open(f)).get('hadis', {}).keys())
KARS = {'maqayis', 'mufradat', 'sihah', 'lisan', 'ayn2', 'asas', 'mukhtar', 'misbah'}  # ayet.js: k0'da karşılığı olan k5 sözlükleri
ayetjs = open(os.path.join(D, '..', 'ayet.js')).read()
meal = len(re.findall(r"'[^']+'", re.search(r'const AY_MEAL = \[([^\]]*)\]', ayetjs).group(1)))
RC = j('k4/rical.json')['istatistik']
S = {
    'eser': eser, 'eser_metinli': metinli, 'eser_metinsiz': eser - metinli, 'dinler': len(j('kutuphane/dinler.json')['metinler']),
    'alinti': OZ['satir'], 'alinti_eser': OZ['kitap_sayisi'], 'alinti_ayet': sum(1 for v in OZ['ayetler'].values() if v[0]),
    'tefsir': tefsir, 'tefsir_metinli': tefsir_metinli, 'tefsir_ayet': tefsir_ayet,
    'rivayet': len(riv), 'ravi': len(j('k4/raviler.json')['raviler']), 'biyografi': RC['madde'], 'rical_kitap': RC['biyografi_kitabi'],
    'yazma': len(j('k6/yazma.json')['nushalar']), 'yazma_tarihli': j('k6/eski.json').get('toplam_tarihli'),
    'makale': len(mk), 'lugat': len(j('k0/lugat.json')['kitap']) + len(set(j('k5/index.json')['lugatler']) - KARS),
    'meal': meal, 'hadis': len(hd), 'fihrist_konu': len(j('fh2/konu.json')['k']), 'muellif': len(mu),
    'en_cok': OZ['en_cok'][:5],
}
# sure sayfalarındaki "Kitaplarda alıntı" da aynı taramadan (build_sure.py ile aynı tanım)
for n in range(1, 115):
    f = os.path.join(D, 'sure', f'{n}.json'); SJ = json.load(open(f))
    SJ.setdefault('sayilar', {})['alinti'] = sum(v[1] for k, v in OZ['ayetler'].items() if k.split(':')[0] == str(n))
    json.dump(SJ, open(f, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
V = j('vitrin.json'); V['sayilar'] = S
json.dump(V, open(os.path.join(D, 'vitrin.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
TANIM = {l.split()[0]: l.strip() for l in __doc__.split('Tanımlar')[1].splitlines()[1:] if l.strip()}
json.dump({'tarih': __import__('datetime').date.today().isoformat(), 'sayilar': S, 'tanimlar': __doc__.split('Tanımlar')[1].strip()},
          open(os.path.join(D, 'istatistik.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in S.items() if k != 'en_cok'}, ensure_ascii=False))
