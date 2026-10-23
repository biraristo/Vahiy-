"""Katman 2: ayete bölünmüş kaynaklar.

  - Tefsirler: Quranpedia (149 eser, cilt/sayfalı) + Quranpedia'da olmayan QUL tefsirleri
  - İ'râb (4), esbâb-ı nüzûl (2), nâsih-mensûh (1): Quranpedia
  - Kıraat: Corpus Coranicum (okuyuş + okuyanlar + kaynak eser) ve Quranpedia kıraat hizmeti
  - Garîb: Quranpedia kelime anlamları
Eser kütüğü: müellif, vefat (h.), dönem, neşir, cilt/sayfa var mı.

Çıktı (site/data/k2):
  eserler.json            eser kütüğü
  i/{s}.json              sure dizini: her ayette hangi eserin pasajı var
  t/{s}/{a}.json.gz       ayetin bütün pasajları (gzip; tarayıcıda açılır)
  q/{s}.json              kıraatler
  g/{s}.json              garîb
"""
import gzip, json, os, re, html, hashlib, collections, glob

RAW = '/home/claude/lib/raw'
REPO = '/home/claude/vahiy-'
OUT = f'{REPO}/site/data/k2'
VERSION = 'k2-2026.10.23'
for d in ('i', 't', 'q', 'g'):
    os.makedirs(f'{OUT}/{d}', exist_ok=True)

AYAS = [s['ayet'] for s in json.load(open(f'{REPO}/data/k0/surahs.json'))['sureler']]
VALID = {(s + 1, a) for s in range(114) for a in range(1, AYAS[s] + 1)}


def donem(v):
    if v is None:
        return 'belirsiz'
    if v <= 310: return 'erken'
    if v <= 656: return 'klasik'
    if v <= 922: return 'orta'
    if v <= 1342: return 'osmanli'
    return 'modern'


DONEM_AD = {'erken': 'Erken dönem (h. 1–310)', 'klasik': 'Klasik dönem (h. 311–656)', 'orta': 'Orta dönem (h. 657–922)',
            'osmanli': 'Osmanlı dönemi (h. 923–1342)', 'modern': 'Modern ve çağdaş (h. 1343–)', 'belirsiz': 'Tarihi belirsiz'}


def clean(t):
    t = t or ''
    t = re.sub(r'<span class="book-ayah[^"]*">(.*?)</span>', r'\1', t, flags=re.S)
    t = re.sub(r'<h\d[^>]*>(.*?)</h\d>', lambda m: '\n§ ' + re.sub(r'<[^>]+>', '', m.group(1)).strip() + '\n', t, flags=re.S)
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = re.sub(r'</p>|<p[^>]*>', '\n', t)
    t = html.unescape(re.sub(r'<[^>]+>', '', t))
    t = re.sub(r'\r', '', t)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n\s*\n+', '\n\n', t)
    return t.strip()


# ---------------- vefat yılları (Quranpedia hizmetlerinden) ----------------
year = {}
for svc in ('tafsir', 'e3rab', 'asbab', 'nasekh'):
    for a in json.load(gzip.open(f'{RAW}/qp/{svc}.json.gz'))['data']:
        for b in a.get(svc) or []:
            if isinstance(b, dict) and b.get('year'):
                try:
                    year[b['id']] = int(str(b['year']).strip())
                except ValueError:
                    pass

works = {}
# pasajlar önce sure sure geçici dosyalara yazılır (bellek sınırı): satır = [ayet, eser, cilt, sayfa, metin | {"ref": "s:a"}]
TMP = '/home/claude/lib/tmp_k2'
import shutil
shutil.rmtree(TMP, ignore_errors=True)
os.makedirs(TMP)
tmpf = {s: open(f'{TMP}/{s}.jsonl', 'w', encoding='utf8') for s in range(1, 115)}
work_chars = collections.Counter()
ayah_has = collections.defaultdict(set)
stats = collections.Counter()


def emit(key, wid, part, page, val):
    tmpf[key[0]].write(json.dumps([key[1], wid, part, page, val], ensure_ascii=False) + '\n')
    ayah_has[key].add(wid)
    if isinstance(val, str):
        work_chars[wid] += len(val)


def add_work(wid, **kw):
    works[wid] = kw


def ingest_qp(fname, kind):
    d = json.load(gzip.open(fname))
    b = d['book']
    wid = f"qp{b['id']}"
    au = b.get('author') or {}
    v = year.get(b['id'])
    has_page = False
    seen = {}
    for x in d['ayahs']:
        key = (x['surah'], x['ayah'])
        if key not in VALID:
            continue
        for c in x.get('content') or []:
            txt = clean(c.get('text'))
            if not txt:
                continue
            h = hashlib.md5(txt.encode()).hexdigest()
            part, page = c.get('part'), c.get('page')
            if page:
                has_page = True
            if h in seen:
                emit(key, wid, part, page, {'ref': seen[h]})
                stats['tekrar_isaret'] += 1
            else:
                seen[h] = f'{key[0]}:{key[1]}'
                emit(key, wid, part, page, txt)
                stats['pasaj'] += 1
                stats['karakter'] += len(txt)
    add_work(wid, ad=b.get('name'), kisa=b.get('short_name'), muellif=au.get('ar_name'), muellif_tam=au.get('full_name'),
             vefat=v, donem=donem(v), tur=kind, dil=((b.get('language') or {}).get('code') or 'ar'),
             nesir={k: vv for k, vv in {'yayinevi': b.get('nasher'), 'baski': b.get('edition'), 'yil': b.get('publish_year'),
                                       'cilt': (str(b.get('parts')).strip() if b.get('parts') else None),
                                       'muhakkik': b.get('mohaqeq') if isinstance(b.get('mohaqeq'), str) else (b.get('mohaqeq') or {}).get('name')}.items() if vv},
             kaynak='Quranpedia', sayfali=has_page, lisans='Quranpedia veri lisansı')


for p in sorted(glob.glob(f'{RAW}/qp/tafsir-book-*.json.gz')):
    ingest_qp(p, 'tefsir')
for kind, pat in (('irab', 'e3rab-book-*'), ('esbab', 'asbab-book-*'), ('nasih', 'nasekh-book-*')):
    for p in sorted(glob.glob(f'{RAW}/qp/{pat}.json.gz')):
        ingest_qp(p, kind)

# ---------------- QUL (tafsir_api): Quranpedia'da olmayanlar ----------------
QUL_EXTRA = {
    'ar-tafseer-al-qurtubi': ('الجامع لأحكام القرآن', 'القرطبي', 671, 'tefsir'),
    'ar-tafseer-tahrir-al-tanwir': ('التحرير والتنوير', 'ابن عاشور', 1393, 'tefsir'),
    'al-nashr-li-ibn-al-jazari': ('النشر في القراءات العشر', 'ابن الجزري', 833, 'kiraat'),
    'al-qira-at-al-mawsoo-ah-al-qur-aniyyah': ('الموسوعة القرآنية: القراءات', None, None, 'kiraat'),
    'mawsoo-at-al-tafsir-al-ma-thoor': ('موسوعة التفسير المأثور', None, None, 'tefsir'),
    'jamia-al-bayan-aliji': ('جامع البيان في تفسير القرآن', 'الإيجي', 905, 'tefsir'),
    'tafsir-ibn-uthaymeen': ('تفسير ابن عثيمين', 'ابن عثيمين', 1421, 'tefsir'),
    'al-jadwal-fi-i-rab-al-quran': ('الجدول في إعراب القرآن', 'محمود صافي', None, 'irab'),
    'alrab-al-quran-li-da-as': ('إعراب القرآن', 'الدعاس', None, 'irab'),
    'al-i-rab-al-muyassar': ('الإعراب الميسر', None, None, 'irab'),
    'tahlil-kalimat-al-qur-an': ('تحليل كلمات القرآن', None, None, 'irab'),
    'al-muyassar-fi-al-gharib': ('الميسر في غريب القرآن', None, None, 'garib'),
    'tadabbur-wa-amal': ('تدبر وعمل', None, None, 'tefsir'),
    'tr-tafsir-ibne-kathir': ('İbn Kesîr Tefsiri (Türkçe)', 'İbn Kesîr', 774, 'tefsir'),
    'turkish-mokhtasar': ('el-Muhtasar fî Tefsîri\'l-Kur\'ân (Türkçe)', 'Tefsir Araştırmaları Merkezi', None, 'tefsir'),
}
for slug, (ad, mu, v, kind) in QUL_EXTRA.items():
    d = f'{RAW}/tafsir_api/{slug}'
    if not os.path.isdir(d):
        continue
    wid = 'qul-' + slug
    seen = {}
    for s in range(1, 115):
        p = f'{d}/{s}.json.gz'
        if not os.path.exists(p):
            continue
        data = json.load(gzip.open(p))
        arr = data.get('ayahs') if isinstance(data, dict) else data
        for x in arr or []:
            key = (int(x.get('surah', s)), int(x['ayah']))
            txt = clean(x.get('text'))
            if key not in VALID or not txt:
                continue
            h = hashlib.md5(txt.encode()).hexdigest()
            if h in seen:
                emit(key, wid, None, None, {'ref': seen[h]}); stats['tekrar_isaret'] += 1
            else:
                seen[h] = f'{key[0]}:{key[1]}'
                emit(key, wid, None, None, txt); stats['pasaj'] += 1; stats['karakter'] += len(txt)
    add_work(wid, ad=ad, kisa=None, muellif=mu, muellif_tam=None, vefat=v, donem=donem(v), tur=kind,
             dil='tr' if slug.startswith(('tr-', 'turkish')) else 'ar', nesir={}, kaynak='QUL (tafsir_api)', sayfali=False,
             lisans='MIT paketleme; içerik QUL/quran.com kaynaklı')

# aynı eserin ikinci dijital nüshası (ad + müellif aynı) → işaretle
by_name = collections.defaultdict(list)
for wid, w in works.items():
    by_name[(re.sub(r'\s+', ' ', (w['ad'] or '')).strip(), (w['muellif'] or '').strip())].append(wid)
for k, ids in by_name.items():
    if len(ids) > 1:
        main = max(ids, key=lambda i: work_chars[i])
        for i in ids:
            if i != main:
                works[i]['ikinci_nusha_of'] = main

# ---------------- yaz: pasajlar ve dizinler ----------------
for f in tmpf.values():
    f.close()
import shutil as _sh
_sh.rmtree(f'{OUT}/t', ignore_errors=True)
for s in range(1, 115):
    idx = {}
    os.makedirs(f'{OUT}/t/{s}', exist_ok=True)
    by_a = collections.defaultdict(list)
    with open(f'{TMP}/{s}.jsonl', encoding='utf8') as f:
        for line in f:
            r = json.loads(line)
            by_a[r[0]].append(r[1:])
    for a in range(1, AYAS[s - 1] + 1):
        P = by_a.get(a, [])
        idx[f'{s}:{a}'] = [[w, work_chars_by_ayah] for w, work_chars_by_ayah in collections.Counter(p[0] for p in P).items()]
        with gzip.open(f'{OUT}/t/{s}/{a}.json.gz', 'wt', encoding='utf8', compresslevel=9) as f:
            json.dump({'v': VERSION, 'p': P}, f, ensure_ascii=False, separators=(',', ':'))
    json.dump({'version': VERSION, 'ayetler': idx}, open(f'{OUT}/i/{s}.json', 'w', encoding='utf8'), separators=(',', ':'), ensure_ascii=False)

# ---------------- kıraat ----------------
qp_q = collections.defaultdict(list)
for x in json.load(gzip.open(f'{RAW}/qp/qiraat.json.gz'))['data']:
    for w in x.get('qiraat') or []:
        for q in w.get('qiraat') or []:
            qp_q[(x['surah'], x['ayah'])].append({'kelime': w.get('ayah_word'), 'okuyus': q.get('qiraa_text'),
                                                 'raviler': [((r.get('rawi') or {}).get('name'), ((r.get('rawi') or {}).get('qiraa') or {}).get('short_name')) for r in q.get('rewayat') or []]})
cc_n = 0
for s in range(1, 115):
    out = {}
    for a in range(1, AYAS[s - 1] + 1):
        rec = {'cc': [], 'qp': qp_q.get((s, a), [])}
        p = f'{RAW}/cc_api/variants/{s}_{a}.json.gz'
        if os.path.exists(p):
            d = json.load(gzip.open(p))['data']
            ref = d.get('reference') or {}
            rec['cc_ref'] = {k: v.get('arab') for k, v in ref.items()} if isinstance(ref, dict) else {}
            for v in d.get('variant_readings') or []:
                wk = v.get('work') or {}
                rec['cc'].append({'id': v.get('reading_id'), 'okuyus': v.get('variants'), 'okuyanlar': [r.get('display_name') for r in v.get('readers') or []],
                                  'eser': wk.get('display_name'), 'eser_vefat': wk.get('death_year_arabic'), 'kanonik_eser': wk.get('canonical'),
                                  'not': v.get('reading_commentary')})
                cc_n += 1
        out[f'{s}:{a}'] = rec
    json.dump({'version': VERSION, 'kaynak': {'cc': 'Corpus Coranicum kıraat veri tabanı (CC BY 4.0)', 'qp': 'Quranpedia kıraat hizmeti (on kıraat ve râvileri)'}, 'ayetler': out},
              open(f'{OUT}/q/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

# ---------------- garîb ----------------
mean = json.load(gzip.open(f'{RAW}/qp/meanings.json.gz'))['data']
gm = collections.defaultdict(list)
for x in mean:
    for m in x.get('meanings') or []:
        bi = m.get('book_info') or {}
        gm[(x['surah'], x['ayah'])].append({'eser': bi.get('name'), 'muellif': bi.get('author'), 'nesir': ' · '.join(z for z in (bi.get('nasher'), bi.get('edition')) if z),
                                            'kelimeler': [{'k': w.get('text'), 'a': w.get('meaning')} for w in m.get('words') or []]})
for s in range(1, 115):
    json.dump({'version': VERSION, 'ayetler': {f'{s}:{a}': gm.get((s, a), []) for a in range(1, AYAS[s - 1] + 1)}},
              open(f'{OUT}/g/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

json.dump({'version': VERSION, 'donemler': DONEM_AD, 'eserler': works}, open(f'{OUT}/eserler.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
rep = {'version': VERSION, 'eser': len(works), 'ture_gore': dict(collections.Counter(w['tur'] for w in works.values())),
       'doneme_gore': dict(collections.Counter(w['donem'] for w in works.values() if w['tur'] == 'tefsir')),
       'sayfali_eser': sum(1 for w in works.values() if w['sayfali']), 'ikinci_nusha': sum(1 for w in works.values() if w.get('ikinci_nusha_of')),
       'pasaj': stats['pasaj'], 'tekrar_isaret': stats['tekrar_isaret'], 'karakter': stats['karakter'],
       'pasaj_olmayan_ayet': sum(1 for k in VALID if not ayah_has.get(k)), 'cc_kiraat_kaydi': cc_n,
       'qp_kiraatli_ayet': len(qp_q), 'garib_ayet': len(gm)}
os.makedirs(f'{REPO}/data/k2', exist_ok=True)
json.dump(rep, open(f'{REPO}/data/k2/report.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(rep, ensure_ascii=False, indent=1))
_sh.rmtree(TMP, ignore_errors=True)
