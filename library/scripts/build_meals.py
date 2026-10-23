"""Mealler: Tanzil, Quran.com ve Quranpedia meallerini tek biçime getirir, mükerrerleri ayıklar.

Çıktı: site/data/meal/index.json  [{id, ad, mutercim, dil, kaynak, lisans}]
       site/data/meal/{id}.json   6.236 ayetlik dizi (sıra: Hafs/Kûfî sayımı)
"""
import json, gzip, os, re, glob, html, hashlib, unicodedata

RAW = '/home/claude/lib/raw'
OUT = '/home/claude/vahiy-/site/data/meal'
os.makedirs(OUT, exist_ok=True)
order = []
for m in re.finditer(r'<sura index="(\d+)" ayas="(\d+)"', open(f'{RAW}/tanzil/quran-data.xml', encoding='utf8').read()):
    for a in range(1, int(m.group(2)) + 1):
        order.append((int(m.group(1)), a))
IDX = {k: i for i, k in enumerate(order)}
assert len(order) == 6236

LANG_TR = {'turkish': 'Türkçe', 'english': 'İngilizce', 'arabic': 'Arapça', 'german': 'Almanca', 'french': 'Fransızca', 'persian': 'Farsça',
           'urdu': 'Urduca', 'russian': 'Rusça', 'spanish': 'İspanyolca', 'italian': 'İtalyanca', 'indonesian': 'Endonezce', 'bosnian': 'Boşnakça',
           'albanian': 'Arnavutça', 'azerbaijani': 'Azerice', 'kurdish': 'Kürtçe', 'malay': 'Malayca', 'bengali': 'Bengalce', 'chinese': 'Çince',
           'japanese': 'Japonca', 'korean': 'Korece', 'dutch': 'Felemenkçe', 'swedish': 'İsveççe', 'portuguese': 'Portekizce', 'uzbek': 'Özbekçe',
           'tajik': 'Tacikçe', 'kazakh': 'Kazakça', 'tatar': 'Tatarca', 'uyghur': 'Uygurca', 'hindi': 'Hintçe', 'swahili': 'Svahili',
           'hausa': 'Hausaca', 'somali': 'Somalice', 'amharic': 'Amharca', 'thai': 'Tayca', 'vietnamese': 'Vietnamca', 'tamil': 'Tamilce',
           'polish': 'Lehçe', 'czech': 'Çekçe', 'romanian': 'Rumence', 'bulgarian': 'Bulgarca', 'ukrainian': 'Ukraynaca', 'norwegian': 'Norveççe',
           'finnish': 'Fince', 'hungarian': 'Macarca', 'greek': 'Yunanca', 'hebrew': 'İbranice', 'pashto': 'Peştuca', 'sindhi': 'Sindhîce'}


def clean(t):
    t = re.sub(r'<sup[^>]*>.*?</sup>', '', t or '', flags=re.S)
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = html.unescape(re.sub(r'<[^>]+>', '', t))
    return re.sub(r'[ \t]+', ' ', t).strip()


def fp(arr):
    s = ' '.join(arr[:60]).lower()
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[^\w]', '', s)
    return hashlib.md5(s[:4000].encode()).hexdigest()


meals, seen = [], {}


def add(mid, ad, mutercim, dil, kaynak, lisans, arr):
    if sum(1 for x in arr if x) < 6000:
        print('eksik, atlandı:', mid, sum(1 for x in arr if x))
        return
    f = fp(arr)
    if f in seen:
        seen[f]['diger_kaynaklar'].append(kaynak)
        return
    rec = {'id': mid, 'ad': ad, 'mutercim': mutercim, 'dil': dil, 'kaynak': kaynak, 'lisans': lisans, 'diger_kaynaklar': []}
    seen[f] = rec
    meals.append(rec)
    json.dump(arr, open(f'{OUT}/{mid}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))


# 1) Tanzil
idx_html = open(f'{RAW}/tanzil/trans_index.html', encoding='utf8').read()
names = {}
for r in re.findall(r'<tr[^>]*>(.*?)</tr>', idx_html, re.S):
    m = re.search(r'/trans/([a-z]{2}\.[a-z0-9]+)"', r)
    if not m:
        continue
    lang = re.search(r'</i>([^<]+)</lang>', r)
    nm = re.search(r'<td>([^<]+)</name>', r)
    tds = re.findall(r'<td>([^<]*)</td>', r)
    names[m.group(1)] = (lang.group(1).strip() if lang else '', html.unescape(nm.group(1)).strip() if nm else m.group(1), html.unescape(tds[0]).strip() if tds else '')
for p in sorted(glob.glob(f'{RAW}/tanzil/trans/*.txt')):
    tid = os.path.basename(p)[:-4]
    arr = [''] * 6236
    for line in open(p, encoding='utf8'):
        if line.startswith('#') or '|' not in line:
            continue
        s, a, t = line.rstrip('\n').split('|', 2)
        if (int(s), int(a)) in IDX:
            arr[IDX[(int(s), int(a))]] = t.strip()
    lang, ad, mut = names.get(tid, ('', tid, ''))
    add('tz-' + tid, ad, mut, LANG_TR.get(lang.lower(), lang), 'Tanzil', 'Tanzil: ticari olmayan kullanım; mütercim hakları saklı', arr)

# 2) Quran.com
qc = json.load(gzip.open(f'{RAW}/qurancom/translations_index.json.gz'))['translations']
for t in qc:
    p = f"{RAW}/qurancom/translations/{t['id']}.json.gz"
    if not os.path.exists(p):
        continue
    arr = [''] * 6236
    for v in json.load(gzip.open(p))['translations']:
        k = tuple(map(int, v['verse_key'].split(':')))
        if k in IDX:
            arr[IDX[k]] = clean(v['text'])
    add(f"qc-{t['id']}", t['name'], t.get('author_name') or '', LANG_TR.get(t['language_name'].lower(), t['language_name'].title()),
        'Quran.com', 'Quran Foundation şartları; mütercim hakları saklı', arr)

# 3) Quranpedia
for t in json.load(open(f'{RAW}/qp_manifest.json'))['translation_books']:
    p = f"{RAW}/qp_trans/{t['name']}.gz"
    if not os.path.exists(p):
        continue
    d = json.load(gzip.open(p))
    arr = [''] * 6236
    for a in d['ayahs']:
        k = (a['surah_number'], a['ayah_number'])
        if k in IDX:
            arr[IDX[k]] = clean(a['translated_text'])
    add(f"qp-{t['name'][:-5]}", d.get('name') or t['title'], d.get('short_name') or '', t.get('language') or '', 'Quranpedia', 'Mütercim/yayıncı hakları saklı', arr)

PRI = {'Türkçe': 0, 'Arapça': 1, 'İngilizce': 2}
meals.sort(key=lambda r: (PRI.get(r['dil'], 9), r['dil'], r['ad']))
default = next((m['id'] for m in meals if m['id'] in ('qc-77', 'tz-tr.diyanet')), meals[0]['id'])
json.dump({'varsayilan': default, 'mealler': meals}, open(f'{OUT}/index.json', 'w', encoding='utf8'), ensure_ascii=False)
import collections
print('meal', len(meals), 'dil', len({m['dil'] for m in meals}), collections.Counter(m['kaynak'] for m in meals))
print('Türkçe:', [m['ad'] for m in meals if m['dil'] == 'Türkçe'])
print('varsayılan', default)
