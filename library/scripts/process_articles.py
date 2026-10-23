"""Crossref ham kayıtlarından Kur'an çalışmalarını süzer ve ayet/sure atıflarını tespit eder.

Çıktı: library/articles/articles.jsonl  (künye + kısa özet + bağlantı; tam metin yok)
        library/articles/by_ayah.json    ("2:255" -> [makale no, ...])
        library/articles/by_surah.json   ("2" -> [makale no, ...])
Atıf tespiti makinedir: her bağlantı 'kaynak: başlık/özet içinde geçen atıf' olarak işaretlenir.
"""
import gzip, json, re, html, unicodedata, os, collections

RAW = '/home/claude/lib/raw/articles/crossref_raw.json.gz'
OUT = '/home/claude/vahiy-/library/articles'
os.makedirs(OUT, exist_ok=True)
S = json.load(open('/home/claude/vahiy-/site/data/surahs.json'))['surahs']
AYAS = {s['n']: s['ayas'] for s in S}


def fold(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('ı', 'i').replace('İ', 'i').replace("'", '').replace('’', '').replace('‘', '').replace('ʿ', '').replace('ʾ', '')
    return s.lower()


# sure adı varyantları -> numara
NAME = {}
extra = {1: ['fatiha', 'fatihah', 'fatihe'], 2: ['bakara', 'baqara', 'baqarah'], 3: ['al-i imran', 'ali imran', 'al imran', 'al-imran', 'ali-imran'],
         4: ['nisa'], 5: ['maide', 'maidah', 'maida'], 6: ['enam', 'anam'], 7: ['araf'], 9: ['tevbe', 'tawba', 'tawbah'], 10: ['yunus'],
         12: ['yusuf'], 17: ['isra'], 18: ['kehf', 'kahf'], 19: ['meryem', 'maryam'], 20: ['taha', 'ta-ha'], 24: ['nur'], 36: ['yasin', 'ya-sin'],
         55: ['rahman'], 67: ['mulk'], 96: ['alak', 'alaq'], 103: ['asr'], 105: ['fil'], 106: ['kureys', 'quraysh'], 112: ['ihlas', 'ikhlas'],
         113: ['felak', 'falaq'], 114: ['nas']}
for s in S:
    for v in [fold(s['tr'])] + extra.get(s['n'], []):
        NAME[v] = s['n']
names_sorted = sorted(NAME, key=len, reverse=True)
name_re = '|'.join(re.escape(n) for n in names_sorted)

QURAN_KW = re.compile(r"kur.?an|quran|qur.?an|koran|ayet|tefsir|tafsir|mufessir|mufassir|sure(si|lerin|nin|de)|surah|sura\b|kiraat|qiraat|nuzul|nesih|munasebet|icaz|i.?jaz|mushaf|vahiy|exegesis", re.I)
P_NAMED = re.compile(r'\b(?:el-|al-|en-|an-|et-|at-|es-|as-|ez-|az-)?(' + name_re + r')\b[^0-9]{0,25}?(\d{1,3})\s*[/:]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?')
P_AYETNO = re.compile(r'\b(?:el-|al-)?(' + name_re + r')\s+(?:suresi|suresinin|sûresi|surah|sura)\D{0,15}?(\d{1,3})\.\s*(?:ayet|ayeti|ayetinin|ayette|verse)')
P_Q = re.compile(r'\bQ(?:ur.?an)?\.?\s*(\d{1,3}):(\d{1,3})(?:\s*-\s*(\d{1,3}))?')
P_SURAH = re.compile(r'\b(?:el-|al-|en-|an-|et-|at-|es-|as-|ez-|az-)?(' + name_re + r')\s+(?:suresi|suresinin|suresinde|suresine|suresindeki|sûresi|surah|sura|suresi\'nin)\b')


def clean(t):
    t = re.sub(r'<[^>]+>', ' ', t or '')
    return ' '.join(html.unescape(t).split())


def add_range(refs, s, a, b=None):
    if s not in AYAS:
        return
    a = int(a)
    b = int(b) if b else a
    if not (1 <= a <= AYAS[s]) or b < a or b > AYAS[s] or b - a > 40:
        return
    for x in range(a, b + 1):
        refs.add(f'{s}:{x}')


raw = json.load(gzip.open(RAW))
arts = []
for it in raw:
    title = clean(' / '.join(it.get('title') or []))
    abstract = clean(it.get('abstract'))
    journal = clean(' '.join((it.get('container-title') or [])[:1]))
    blob = fold(title + ' ' + abstract)
    if not QURAN_KW.search(blob) and not QURAN_KW.search(fold(journal)):
        continue
    if not QURAN_KW.search(fold(title + ' ' + abstract)):
        continue
    ayahs, surahs = set(), set()
    for m in P_NAMED.finditer(blob):
        s = NAME[m.group(1)]
        if int(m.group(2)) == s:
            add_range(ayahs, s, m.group(3), m.group(4))
    for m in P_AYETNO.finditer(blob):
        add_range(ayahs, NAME[m.group(1)], m.group(2))
    for m in P_Q.finditer(title + ' ' + abstract):
        add_range(ayahs, int(m.group(1)), m.group(2), m.group(3))
    for m in P_SURAH.finditer(blob):
        surahs.add(NAME[m.group(1)])
    surahs |= {int(a.split(':')[0]) for a in ayahs}
    y = (it.get('issued') or {}).get('date-parts', [[None]])[0][0]
    authors = ', '.join(' '.join(x for x in (a.get('given'), a.get('family')) if x) for a in (it.get('author') or [])[:6])
    arts.append({'doi': it['DOI'], 'url': it.get('URL') or f"https://doi.org/{it['DOI']}", 'title': title, 'authors': authors,
                 'journal': journal, 'year': y, 'abstract': abstract[:700] + ('…' if len(abstract) > 700 else ''),
                 'ayahs': sorted(ayahs, key=lambda k: tuple(map(int, k.split(':')))), 'surahs': sorted(surahs),
                 'link_method': 'makine: başlık/özetteki atıf'})

by_ayah, by_surah = collections.defaultdict(list), collections.defaultdict(list)
with open(f'{OUT}/articles.jsonl', 'w', encoding='utf8') as f:
    for i, a in enumerate(arts):
        a['id'] = i
        f.write(json.dumps(a, ensure_ascii=False) + '\n')
        for k in a['ayahs']:
            by_ayah[k].append(i)
        for s in a['surahs']:
            by_surah[str(s)].append(i)
json.dump(by_ayah, open(f'{OUT}/by_ayah.json', 'w'), separators=(',', ':'))
json.dump(by_surah, open(f'{OUT}/by_surah.json', 'w'), separators=(',', ':'))
stats = {'ham_kayit': len(raw), 'kuran_calismasi': len(arts), 'ozetli': sum(1 for a in arts if a['abstract']),
         'ayete_bagli_makale': sum(1 for a in arts if a['ayahs']), 'sureye_bagli_makale': sum(1 for a in arts if a['surahs']),
         'atif_alan_ayet': len(by_ayah), 'fatiha_1_7': len(by_ayah.get('1:7', [])), 'fatiha_suresi': len(by_surah.get('1', []))}
json.dump(stats, open(f'{OUT}/stats.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(stats, ensure_ascii=False, indent=1))
