"""vahiy++ kütüphane kataloğu.

Bütün kaynaklardaki eserleri tek bir katalogda toplar:
  - Quranpedia kitap fihristi (books.json.gz) + indirilen tam metinler
  - Quranpedia ayet-bölümlü tefsir/i'rab/esbâb/nâsih kitapları
  - OpenITI 2025.1.9 birincil sürümler
  - tafsir_api (QUL kaynaklı ayet-bölümlü tefsirler)
  - Kur'an metinleri, kıraat mushafları, mealler, morfoloji, Corpus Coranicum

Çıktı: library/catalog/works.jsonl, library/catalog/summary.json
"""
import csv, gzip, json, os, re, collections, glob, unicodedata

RAW = '/home/claude/lib/raw'
OUT = '/home/claude/vahiy-/library/catalog'
os.makedirs(OUT, exist_ok=True)
csv.field_size_limit(10**9)

# ---------- ortak sınıflandırma ----------
GENRES = {
    'tefsir': 'Tefsir',
    'ulum': "Ulûmü'l-Kur'ân",
    'kiraat': 'Kıraat ve tecvid',
    'dil': "Dil (i'râb, garîb, meânî, lügat, nahiv, belâgat)",
    'meal': 'Meal ve tercüme',
    'mushaf': 'Mushaf ve Kur\'an metni',
    'hadis': 'Hadis ve hadis ilimleri',
    'fikih': 'Fıkıh ve usûl',
    'akaid': 'Akaid, kelâm ve fırkalar',
    'tasavvuf': 'Tasavvuf, rekâik ve ahlâk',
    'tarih': 'Siyer, tarih, terâcim ve tabakât',
    'edebiyat': 'Edebiyat ve şiir',
    'diger': 'Diğer',
    'belirsiz': 'Sınıflandırılmamış',
}

QP_CAT = {
    'التفسير': 'tefsir', 'كتب التفسير': 'tefsir', 'مناهج المفسرين': 'ulum', 'أصول التفسير': 'ulum',
    'القراءات والتجويد': 'kiraat', 'علم التجويد': 'kiraat', 'القراءات السبع': 'kiraat',
    'دراسات قرآنية': 'ulum', 'علوم القرآن': 'ulum', 'إعجاز القرآن': 'ulum', 'أسباب النزول': 'ulum',
    'وقفات مع سور وآيات': 'tefsir', 'قصص القرآن': 'ulum', 'ناسخ القرآن ومنسوخه': 'ulum',
    'متشابهات القرآن': 'ulum', 'المصاحف': 'ulum', 'فضائل القرآن': 'ulum', 'الدفاع عن القرآن': 'ulum',
    'آداب قراءة القرآن': 'ulum', 'تعليم القرآن': 'ulum', 'أمثال القرآن': 'ulum',
    'مناسبات الآيات والسور': 'ulum', 'جمع القرآن': 'ulum', 'موضوعات القرآن': 'ulum',
    'علم الرسم': 'ulum', 'نزول القرآن': 'ulum', 'عد الآي': 'ulum', 'أيمان القرآن': 'ulum',
    'ألفاظ القرآن': 'dil', 'إعراب القرآن': 'dil', 'بلاغة القرآن': 'dil',
    'أحكام القرآن': 'tefsir', 'ترجمات القرآن': 'meal',
}

SHAM_CAT = [  # OpenITI içindeki Şâmile etiketleri -> tür
    ('التفاسير', 'tefsir'), ('التفسير', 'tefsir'), ('علوم القرآن', 'ulum'), ('التجويد والقراءات', 'kiraat'),
    ('الغريب والمعاجم', 'dil'), ('النحو والصرف', 'dil'), ('كتب اللغة', 'dil'), ('الأدب والبلاغة', 'edebiyat'),
    ('البلاغة', 'dil'), ('الدواوين', 'edebiyat'), ('العروض', 'edebiyat'),
    ('الأجزاء الحديثية', 'hadis'), ('مخطوطات حديثية', 'hadis'), ('متون الحديث', 'hadis'), ('شروح الحديث', 'hadis'),
    ('علوم الحديث', 'hadis'), ('العلل', 'hadis'), ('التخريج', 'hadis'), ('كتب الألباني', 'hadis'),
    ('أصول الفقه', 'fikih'), ('فقه', 'fikih'), ('الفتاوى', 'fikih'), ('فتاوى', 'fikih'), ('السياسة الشرعية', 'fikih'),
    ('مسائل فقهية', 'fikih'), ('الفرائض', 'fikih'),
    ('العقيدة', 'akaid'), ('الفرق والردود', 'akaid'), ('كتب ابن تيمية', 'akaid'),
    ('الرقاق', 'tasavvuf'), ('الأخلاق', 'tasavvuf'), ('كتب ابن أبي الدنيا', 'tasavvuf'),
    ('التراجم', 'tarih'), ('التاريخ', 'tarih'), ('السيرة', 'tarih'), ('الأنساب', 'tarih'), ('البلدان', 'tarih'),
    ('فهارس الكتب', 'diger'), ('علوم أخرى', 'diger'), ('الجوامع', 'diger'), ('بحوث ومسائل', 'diger'),
    ('كتب ابن القيم', 'akaid'), ('الدعوة', 'diger'), ('كتب إسلامية عامة', 'diger'),
]
GAL_CAT = [
    ('koran', 'ulum'), ('quran', 'ulum'), ('tafsir', 'tefsir'), ('exegesis', 'tefsir'), ('qiraa', 'kiraat'),
    ('hadith', 'hadis'), ('fiqh', 'fikih'), ('jurisprudence', 'fikih'), ('law', 'fikih'),
    ('dogmatics', 'akaid'), ('theology', 'akaid'), ('mysticism', 'tasavvuf'), ('sufism', 'tasavvuf'),
    ('history', 'tarih'), ('biography', 'tarih'), ('geography', 'tarih'),
    ('grammar', 'dil'), ('lexicography', 'dil'), ('philology', 'dil'), ('rhetoric', 'dil'),
    ('poetry', 'edebiyat'), ('literature', 'edebiyat'), ('adab', 'edebiyat'),
    ('philosophy', 'diger'), ('medicine', 'diger'), ('mathematics', 'diger'), ('astronomy', 'diger'),
]


def norm_ar(s):
    """Karşılaştırma için Arapça normalleştirme: hareke, tatvil, hemze/elif/yâ/tâ biçimleri."""
    if not s:
        return ''
    s = unicodedata.normalize('NFKC', s)
    s = re.sub(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]', '', s)
    s = re.sub('[إأآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    s = re.sub(r'[^ء-ي\s]', ' ', s)
    s = re.sub(r'\b(ال)', '', s)
    return ' '.join(s.split())


def openiti_genre(tags, title):
    for t in tags:
        if '@' in t:
            k, v = t.split('@', 1)
            if k.startswith('Sham') or k == 'JK':
                for pat, g in SHAM_CAT:
                    if pat in v:
                        return g
    low = ' '.join(tags).lower()
    for pat, g in GAL_CAT:
        if pat in low:
            return g
    t = title or ''
    if 'تفسير' in t or 'تأويل' in t:
        return 'tefsir'
    if 'القرآن' in t or 'القرءان' in t:
        return 'ulum'
    return 'belirsiz'


works = []


def add(w):
    w.setdefault('sources', [])
    works.append(w)


# ---------- 1) Quranpedia fihristi ----------
qp_year = {}
for svc in ('tafsir', 'e3rab', 'asbab', 'nasekh'):
    try:
        for a in json.load(gzip.open(f'{RAW}/qp/{svc}.json.gz'))['data']:
            for bk in a.get(svc) or []:
                if isinstance(bk, dict) and bk.get('year'):
                    try:
                        qp_year[bk['id']] = int(bk['year'])
                    except (TypeError, ValueError):
                        pass
    except FileNotFoundError:
        pass
qp_books = json.load(gzip.open(f'{RAW}/qp/books.json.gz'))['data']
manifest = json.load(open(f'{RAW}/qp_manifest.json'))
qp_files = {f['dataset']: f for f in manifest['files']}
have_text = {int(re.search(r'book-(\d+)', p).group(1)) for p in glob.glob(f'{RAW}/qp_books/book-*.json.gz')}

for b in qp_books:
    bid = b['id']
    cat = (b.get('category') or {}).get('name')
    t = b.get('type')
    genre = QP_CAT.get(cat) or ('belirsiz' if cat == 'غير مصنف' and t == 'book' else None) or {'tafsir': 'tefsir', 'qiraat': 'kiraat', 'asbab': 'ulum', 'e3rab': 'dil',
                                'translations': 'meal', 'nasekh': 'ulum', 'mutshabeh': 'ulum', 'fdael': 'ulum',
                                'amthal': 'ulum', 'monasbah': 'ulum'}.get(t, 'ulum')
    seg = None
    for key in (f'tafsir-book-{bid}', f'e3rab-book-{bid}', f'asbab-book-{bid}', f'nasekh-book-{bid}'):
        if key in qp_files:
            seg = key
    if seg:
        text = 'ayet-bolumlu'
    elif bid in have_text or b.get('contents_url'):
        text = 'tam-metin'
    elif b.get('book_attachments'):
        text = 'pdf'
    else:
        text = 'kunye'
    au = b.get('author') or {}
    add({
        'title': (b.get('name') or '').strip(),
        'short': b.get('short_name'),
        'author': (au.get('ar_name') or '').strip(),
        'author_full': au.get('full_name'),
        'death_ah': qp_year.get(bid),
        'genre': genre,
        'language': (b.get('language') or {}).get('code') or 'ar',
        'sources': [{
            'source': 'quranpedia', 'id': bid, 'text': text, 'dataset': seg,
            'downloaded': bool(seg) or bid in have_text,
            'pdf_parts': len(b.get('book_attachments') or []),
            'edition': {k: v for k, v in {'publisher': b.get('nasher'), 'year': b.get('publish_year'),
                                          'edition': b.get('edition'), 'parts': b.get('parts'),
                                          'editor': (b.get('mohaqeq') or {}).get('name') if isinstance(b.get('mohaqeq'), dict) else b.get('mohaqeq')}.items() if v},
            'license': 'Quranpedia veri lisansı (uygulama içi serbest; veri seti olarak yayımda atıf + sürüm)',
            'category': cat,
        }],
    })

# ---------- 2) OpenITI birincil sürümler ----------
oi = [r for r in csv.DictReader(open(f'{RAW}/openiti_meta.tsv', encoding='utf8'), delimiter='\t') if r['status'] == 'pri']
try:
    scan = json.load(open(f'{RAW}/openiti_scan.json'))
except FileNotFoundError:
    scan = {}
for r in oi:
    tags = [x.strip() for x in r['tags'].split('::')]
    try:
        death = int(r['date'])
    except ValueError:
        death = None
    add({
        'title': (r['title_ar'] or r['title_lat']).split('::')[0].strip(),
        'title_lat': r['title_lat'],
        'author': (r['author_ar'] or '').split('::')[0].strip(),
        'author_lat': r['author_lat_shuhra'] or r['author_lat'],
        'death_ah': death,
        'genre': openiti_genre(tags, r['title_ar']),
        'language': r['language'],
        'sources': [{
            'source': 'openiti', 'id': r['version_uri'], 'text': 'tam-metin',
            'downloaded': r['version_uri'] in scan, 'tokens': int(r['tok_length'] or 0),
            'ocr_uncorrected': r['uncorrected_OCR'] == 'True',
            'page_markers': (scan.get(r['version_uri'], {}).get('pages', 0) > 0) if scan else 'unknown',
            'volumes': scan.get(r['version_uri'], {}).get('vols'), 'edition': {'info': r['ed_info']} if r['ed_info'] else {},
            'license': 'CC BY-NC-SA 4.0 (OpenITI 2025.1.9)',
            'path': r['local_path'],
        }],
    })

# ---------- 3) tafsir_api ----------
try:
    ed = json.load(open(f'{RAW}/tafsir_api/editions.json'))
except FileNotFoundError:
    ed = []
for e in ed:
    if e['language_name'] not in ('arabic', 'turkish'):
        continue
    add({
        'title': e['name'], 'author': e['author_name'], 'death_ah': None,
        'genre': 'meal' if 'mokhtasar' in e['slug'] and e['language_name'] != 'arabic' else 'tefsir',
        'language': 'ar' if e['language_name'] == 'arabic' else 'tr',
        'sources': [{'source': 'tafsir_api', 'id': e['slug'], 'text': 'ayet-bolumlu',
                     'downloaded': os.path.isdir(f"{RAW}/tafsir_api/{e['slug']}"),
                     'license': 'MIT (paketleme); içerik QUL/quran.com/altafsir kaynaklı', 'origin': e.get('source')}],
    })

# ---------- 4) Kur'an metinleri, kıraatler, mealler, dil verileri ----------
for f in manifest['files']:
    if f['section'] == 'mushafs' and f['dataset'] != 'mushafs-index':
        add({'title': f['title'], 'author': None, 'death_ah': None, 'genre': 'mushaf', 'language': 'ar',
             'sources': [{'source': 'quranpedia', 'id': f['dataset'], 'text': 'ayet-bolumlu', 'downloaded': True,
                          'license': 'Quranpedia veri lisansı'}]})
for t in ('uthmani', 'simple', 'simple-clean'):
    add({'title': f'Tanzil Kur\'an metni ({t})', 'author': 'Tanzil Projesi', 'genre': 'mushaf', 'language': 'ar', 'death_ah': None,
         'sources': [{'source': 'tanzil', 'id': t, 'text': 'ayet-bolumlu', 'downloaded': os.path.exists(f'{RAW}/tanzil/quran-{t}.xml'),
                      'license': 'CC BY 3.0, metin değiştirilemez'}]})
for p in sorted(glob.glob(f'{RAW}/tanzil/trans/*.txt')):
    tid = os.path.basename(p)[:-4]
    add({'title': f'Tanzil meali {tid}', 'author': None, 'genre': 'meal', 'language': tid.split('.')[0], 'death_ah': None,
         'sources': [{'source': 'tanzil', 'id': tid, 'text': 'ayet-bolumlu', 'downloaded': True,
                      'license': 'Tanzil: ticari olmayan kullanım; mütercim hakları saklı'}]})
for t in manifest['translation_books']:
    add({'title': t['title'], 'author': None, 'genre': 'meal', 'language': t.get('language'), 'death_ah': None,
         'sources': [{'source': 'quranpedia', 'id': 'translation-' + t['name'], 'text': 'ayet-bolumlu',
                      'downloaded': os.path.exists(f"{RAW}/qp_trans/{t['name']}.gz"),
                      'license': 'Mütercim/yayıncı hakları saklı'}]})
add({'title': 'Quranic Arabic Corpus morfolojisi v0.4 (düzeltilmiş çatal)', 'author': 'Kais Dukes / mustafa0x',
     'genre': 'dil', 'language': 'ar', 'death_ah': None,
     'sources': [{'source': 'github:mustafa0x/quran-morphology', 'id': 'quran-morphology', 'text': 'kelime-bolumlu',
                  'downloaded': True, 'license': 'GNU GPL'}]})
for nm, title in (('quran_variants', 'Corpus Coranicum kıraat varyantları'), ('quran_manuscripts', 'Corpus Coranicum yazma nüsha kayıtları'),
                  ('quran_intertexts', 'Corpus Coranicum Geç Antik Çağ metinleri'), ('quran_commentary', 'Corpus Coranicum edebî-kronolojik şerh'),
                  ('quran_concordance', 'Corpus Coranicum konkordans (Talmon)'), ('cairo_quran', 'Kahire 1924 mushafı (Corpus Coranicum)')):
    n = len(glob.glob(f'{RAW}/cc/data/{nm}/*.xml'))
    add({'title': title, 'author': 'Corpus Coranicum (BBAW)', 'genre': 'ulum' if nm != 'cairo_quran' else 'mushaf',
         'language': 'ar', 'death_ah': None,
         'sources': [{'source': 'corpus_coranicum', 'id': nm, 'text': 'yapisal-veri', 'files': n,
                      'downloaded': n > 0, 'license': 'CC BY 4.0'}]})

# ---------- 5) Kaynaklar arası olası eşleşmeler (aynı eser) ----------
key = collections.defaultdict(list)
for i, w in enumerate(works):
    if w['genre'] in ('meal', 'mushaf'):
        continue
    t = norm_ar(w.get('title'))
    a = norm_ar(w.get('author'))
    if t and a:
        key[(t, a.split()[0] if a else '')].append(i)
groups = 0
for k, idx in key.items():
    srcs = {works[i]['sources'][0]['source'] for i in idx}
    if len(srcs) > 1:
        groups += 1
        gid = f'g{groups}'
        for i in idx:
            works[i]['match_group'] = gid

# ---------- yaz ----------
for i, w in enumerate(works):
    w['id'] = f'w{i+1:05d}'
with open(f'{OUT}/works.jsonl', 'w', encoding='utf8') as f:
    for w in works:
        f.write(json.dumps(w, ensure_ascii=False) + '\n')

S = collections.Counter(w['sources'][0]['source'] for w in works)
G = collections.Counter(w['genre'] for w in works)
T = collections.Counter(w['sources'][0]['text'] for w in works)
D = collections.Counter((w['sources'][0]['source'], w['sources'][0].get('downloaded', False)) for w in works)
matched = sum(1 for w in works if 'match_group' in w)
summary = {
    'kayit_toplam': len(works),
    'kaynaga_gore': dict(S),
    'ture_gore': {GENRES[k]: v for k, v in G.most_common()},
    'metin_durumuna_gore': dict(T),
    'indirildi': {f'{k[0]}:{"evet" if k[1] else "hayir"}': v for k, v in D.items()},
    'kaynaklar_arasi_esleme_grubu': groups,
    'eslesen_kayit': matched,
    'tekil_eser_tahmini': len(works) - matched + groups,
    'openiti_kelime_sayisi': sum(w['sources'][0].get('tokens', 0) for w in works),
}
json.dump(summary, open(f'{OUT}/summary.json', 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print(json.dumps(summary, ensure_ascii=False, indent=2))

# ---------- site için hafif katalog ----------
import datetime
SITE = '/home/claude/vahiy-/site/data'
os.makedirs(SITE, exist_ok=True)
rows = []
for w in works:
    s = w['sources'][0]
    rows.append([w['id'], w.get('title') or '', w.get('author') or '', w.get('death_ah'), w['genre'], w.get('language'),
                 s['source'], s['text'], bool(s.get('downloaded')), (w.get('title_lat') or '') + ' ' + (w.get('author_lat') or '')])
json.dump(rows, open(f'{SITE}/catalog.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
site_sum = {
    'kayit_toplam': len(works), 'tekil_eser_tahmini': summary['tekil_eser_tahmini'],
    'indirilen': sum(1 for w in works if w['sources'][0].get('downloaded')),
    'kaynaga_gore': dict(S.most_common()), 'ture_gore': dict(G.most_common()), 'metin_durumuna_gore': dict(T.most_common()),
    'tarih': datetime.date.today().isoformat(),
}
json.dump(site_sum, open(f'{SITE}/library-summary.json', 'w', encoding='utf8'), ensure_ascii=False)
print('site catalog rows', len(rows), os.path.getsize(f'{SITE}/catalog.json') // 1024, 'KB')
