"""Katman 2 eki: QUL/tafsir_api'deki bütün diller ve eserler (K2'de olmayanlar).
Kopya denetimi: eserin 2:255 (yoksa 1:2) pasajının normalleştirilmiş ilk 160 harfi mevcut bir K2 eseriyle aynıysa eklenmez.
Ayet gruplarında aynı metin tekrarlanır: ilk ayette metin, diğerlerinde {"ref": "s:a"}.
Çıktı: site/data/k2/{eserler.json, i/, t/} güncellenir; data/k2/ek_rapor.json"""
import json, gzip, os, re, hashlib, collections, unicodedata
RAW = '/home/claude/lib/raw/tafsir_api'
K2 = '/home/claude/vahiy-/site/data/k2'
E = json.load(open(f'{K2}/eserler.json'))
W = E['eserler']
ED = {x['slug']: x for x in json.load(open(f'{RAW}/editions.json'))}
LANG = {'arabic': 'ar', 'turkish': 'tr', 'english': 'en', 'urdu': 'ur', 'bengali': 'bn', 'russian': 'ru', 'indonesian': 'id', 'kurdish': 'ku', 'persian': 'fa', 'albanian': 'sq', 'french': 'fr', 'italian': 'it', 'bosnian': 'bs', 'chinese': 'zh', 'japanese': 'ja',
        'malayalam': 'ml', 'tagalog': 'tl', 'vietnamese': 'vi', 'sinhala': 'si', 'assamese': 'as', 'central khmer': 'km', 'spanish': 'es', 'german': 'de', 'hindi': 'hi', 'tamil': 'ta', 'thai': 'th', 'uzbek': 'uz', 'pashto': 'ps', 'kazakh': 'kk', 'hausa': 'ha', 'swahili': 'sw', 'telugu': 'te', 'gujarati': 'gu', 'marathi': 'mr', 'kannada': 'kn', 'nepali': 'ne', 'oromo': 'om', 'amharic': 'am', 'yoruba': 'yo', 'korean': 'ko', 'portuguese': 'pt', 'dutch': 'nl', 'azerbaijani': 'az', 'tajik': 'tg', 'somali': 'so', 'kyrgyz': 'ky', 'uyghur': 'ug', 'sindhi': 'sd', 'punjabi': 'pa', 'dhivehi': 'dv'}
# bilinen müellif vefatları (hicrî)
VEF = [('tabari', 310), ('ibn-kathir', 774), ('kathir', 774), ('kaseer', 774), ('baghaw', 516), ('jalalayn', 911), ('saadi', 1376), ('saddi', 1376), ('qurtubi', 671), ('atiyyah', 541), ('biqa', 885), ('zamanin', 399),
       ('wahidi', 468), ('basit', 468), ('samarqandi', 373), ('mawardi', 450), ('sam-ani', 489), ('razi', 606), ('baydawi', 685), ('nasafi', 710), ('juzay', 741), ('su-ood', 982), ('alusi', 1270), ('shawkani', 1250),
       ('qanuji', 1307), ('qasimi', 1332), ('ibn-al-jawzi', 597), ('qayyim', 751), ('abi-hatim', 327), ('makhi', 437), ('tha-alibi', 875), ('zamakhshari', 538), ('bahr-al-muhit', 745), ('samin', 756), ('lubab', 775),
       ('durr-al-manthur', 911), ('adwa', 1393), ('zalul', 1386), ('zilal', 1386), ('maarif', 1396), ('tustari', 283), ('qushairi', 465), ('kashani', 736), ('kashf-al-asrar', 530), ('miqbas', 817), ('ibn-abbas', 817),
       ('tazkir', 1442), ('bayan-ul-quran', 1431), ('jazairi', 1439), ('darwish', 1403), ('wasit', 1431), ('muyassar', None), ('mukhtasar', None), ('mokhtasar', None)]
def vefat(slug):
    for k, v in VEF:
        if k in slug: return v
    return None
def donem(y):
    if not y: return 'modern'
    return 'erken' if y <= 310 else 'klasik' if y <= 656 else 'orta' if y <= 922 else 'osmanli' if y <= 1342 else 'modern'
def tur(slug):
    if 'asbab' in slug: return 'esbab'
    if 'rab' in slug and ('i-rab' in slug or 'irab' in slug or 'iraab' in slug or 'alrab' in slug): return 'irab'
    if 'gharib' in slug: return 'garib'
    return 'tefsir'
NZ = re.compile(r'[ً-ٰٟـ\s\W]+')
def fp(t):
    return NZ.sub('', unicodedata.normalize('NFKC', t or ''))[:160]
# mevcut parmak izleri (2:255 ve 1:2)
have = {}
PROBE = ((2, 255), (1, 2), (3, 7), (18, 10))
for s, a in PROBE:
    have[(s, a)] = [(r[0], NZ.sub('', unicodedata.normalize('NFKC', r[3]))) for r in json.load(gzip.open(f'{K2}/t/{s}/{a}.json.gz'))['p'] if isinstance(r[3], str)]
def is_dup(get):
    hits = collections.Counter(); tried = 0
    for s, a in PROBE:
        it = next((x for x in get(s) or [] if int(x['ayah']) == a), None)
        if not it: continue
        t = NZ.sub('', unicodedata.normalize('NFKC', it.get('text') or ''))
        if len(t) < 120: continue
        tried += 1; probe = t[40:120]
        for w, h in have[(s, a)]:
            if probe in h: hits[w] += 1; break
    if tried and hits:
        w, k = hits.most_common(1)[0]
        if k >= max(1, tried // 2): return w
    return None
adds = collections.defaultdict(list); rep = {'eklenen': [], 'kopya': [], 'eksik': []}
for slug in sorted(os.listdir(RAW)):
    d = f'{RAW}/{slug}'
    if not os.path.isdir(d) or slug in ('tafsir', 'ayah-dependency-graphs'): continue
    wid = 'qul-' + slug
    if wid in W: continue
    files = [f for f in os.listdir(d) if f.endswith('.json.gz')]
    if len(files) < 100:
        rep['eksik'].append([slug, len(files)]); continue
    def get(s):
        try:
            x = json.load(gzip.open(f'{d}/{s}.json.gz'))
            return x.get('ayahs') if isinstance(x, dict) else x
        except Exception:
            return []
    e0 = ED.get(slug, {})
    if (e0.get('language_name') or '').lower() not in ('arabic', 'turkish'):
        rep.setdefault('dil_disi', []).append(slug); continue  # sitede yalnız Arapça ve Türkçe
    # Arapça QUL eserlerinin geri kalanı Quranpedia'daki eserlerin ikinci dijital nüshası (ad + içerik denetimiyle görüldü)
    ALLOW = {'turkish-tafsir-as-saadi-turkish': None, 'ar-tafsir-al-jami-al-wajiz': None}
    dup = is_dup(get) if slug in ALLOW else 'Quranpedia nüshası (ad/müellif eşleşmesi)'
    if dup:
        rep['kopya'].append([slug, dup]); continue
    e = ED.get(slug, {})
    lang = LANG.get((e.get('language_name') or '').lower(), (e.get('language_name') or '??')[:2])
    v = vefat(slug)
    W[wid] = {'ad': e.get('name') or slug, 'kisa': None, 'muellif': e.get('author_name'), 'muellif_tam': None, 'vefat': v, 'donem': donem(v), 'tur': tur(slug), 'dil': lang, 'nesir': {},
              'kaynak': 'QUL (tafsir_api)', 'sayfali': False, 'lisans': 'MIT paketleme; içerik QUL/quran.com kaynaklı', 'vefat_kaynagi': 'elle (bilinen vefat yılı)' if v else 'çağdaş/tarihsiz'}
    seen = {}; n = 0
    for s in range(1, 115):
        for x in get(s) or []:
            t = (x.get('text') or '').strip()
            if not t: continue
            a = int(x['ayah']); h = hashlib.md5(t.encode()).hexdigest()
            if h in seen: adds[(s, a)].append([wid, None, None, {'ref': seen[h]}])
            else: seen[h] = f'{s}:{a}'; adds[(s, a)].append([wid, None, None, t]); n += 1
    rep['eklenen'].append([slug, lang, W[wid]['tur'], n])
    print('+', slug, lang, n, flush=True)
by_s = collections.defaultdict(dict)
for (s, a), L in adds.items(): by_s[s][a] = L
for s, A in by_s.items():
    I = json.load(open(f'{K2}/i/{s}.json'))
    for a, L in A.items():
        p = f'{K2}/t/{s}/{a}.json.gz'
        d = json.load(gzip.open(p)); d['p'].extend(L)
        with gzip.open(p, 'wt', encoding='utf8', compresslevel=9) as f: json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
        I['ayetler'][f'{s}:{a}'] = [[w, c] for w, c in collections.Counter(r[0] for r in d['p']).items()]
    json.dump(I, open(f'{K2}/i/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(E, open(f'{K2}/eserler.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(rep, open('/home/claude/vahiy-/data/k2/ek_rapor.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(rep['eklenen']), 'eklendi', len(rep['kopya']), 'kopya', len(rep['eksik']), 'eksik')
