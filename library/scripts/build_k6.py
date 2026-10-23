"""Katman 6: karşılaştırmalı metinler (Geç Antik Çağ paralelleri).
Kaynak: Corpus Coranicum "Texte aus der Umwelt des Korans" (CC BY 4.0) — ayet bağları CC editörlerinindir (kaynaklı).
Hebrew Bible başlıklarına Sefaria'dan İngilizce JPS çevirisi eklenir (Sefaria, CC BY-NC)."""
import json, gzip, glob, re, html, os, collections
RAW = '/home/claude/lib/raw'
OUT = '/home/claude/vahiy-/site/data/k6'
os.makedirs(f'{OUT}/m', exist_ok=True)
TR = {'Hebräische Bibel': 'İbranice Kitab-ı Mukaddes', 'Neues Testament': 'Yeni Ahit', 'Griechische, Lateinische und Syrische Patristik': 'Grek, Latin ve Süryani kilise babaları',
      'Talmud, Midrasch und Targum': 'Talmud, Midraş ve Targum', 'Pseudepigraphen und Apokrypha der Hebräischen Bibel': 'Eski Ahit apokrifleri ve pseudepigrafları',
      'Zoroastrische Texte': 'Zerdüştî metinler', 'Gebete, liturgische Texte und religiöse Formeln': 'Dualar ve litürji', 'Klassische Autoren, griechisch-römische und byzantinische Historiker': 'Klasik yazarlar ve tarihçiler',
      'Pseudepigrapha und Apokrypha des Neuen Testaments': 'Yeni Ahit apokrifleri', 'Altarabische Dichtung': 'Câhiliye ve erken Arap şiiri', 'Christliche monastische und asketische Literatur': 'Hristiyan manastır ve zühd edebiyatı',
      'Inschriften, Münzen, Papyri, Amulette, Siegel und Gemmen': 'Yazıtlar, sikkeler, papirüsler', 'Altorientalische Texte': 'Eski Doğu metinleri', None: 'Diğer'}
LANG = {'Hebräisch': 'İbranice', 'Griechisch': 'Grekçe', 'Syrisch': 'Süryanice', 'Aramäisch': 'Aramice', 'Arabisch': 'Arapça', 'Latein': 'Latince', 'Lateinisch': 'Latince', 'Mittelpersisch': 'Orta Farsça', 'Äthiopisch': 'Habeşçe', 'Koptisch': 'Kıptîce', 'Sabäisch': 'Sebece', 'Altsüdarabisch': 'Eski Güney Arapçası', 'Armenisch': 'Ermenice', 'Avestisch': 'Avestaca', 'Georgisch': 'Gürcüce'}
SEF_BOOK = {'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Levitikus': 'Leviticus', 'Leviticus': 'Leviticus', 'Numeri': 'Numbers', 'Deuteronomium': 'Deuteronomy', 'Josua': 'Joshua', 'Richter': 'Judges',
            '1 Samuel': 'I Samuel', '2 Samuel': 'II Samuel', '1 Könige': 'I Kings', '2 Könige': 'II Kings', 'Jesaja': 'Isaiah', 'Jeremia': 'Jeremiah', 'Ezechiel': 'Ezekiel', 'Hosea': 'Hosea', 'Joel': 'Joel',
            'Amos': 'Amos', 'Obadja': 'Obadiah', 'Jona': 'Jonah', 'Micha': 'Micah', 'Nahum': 'Nahum', 'Habakuk': 'Habakkuk', 'Zefanja': 'Zephaniah', 'Haggai': 'Haggai', 'Sacharja': 'Zechariah', 'Maleachi': 'Malachi',
            'Psalm': 'Psalms', 'Psalmen': 'Psalms', 'Ijob': 'Job', 'Hiob': 'Job', 'Sprichwörter': 'Proverbs', 'Sprüche': 'Proverbs', 'Rut': 'Ruth', 'Hohelied': 'Song of Songs', 'Kohelet': 'Ecclesiastes', 'Prediger': 'Ecclesiastes',
            'Klagelieder': 'Lamentations', 'Ester': 'Esther', 'Daniel': 'Daniel', 'Esra': 'Ezra', 'Nehemia': 'Nehemiah', '1 Chronik': 'I Chronicles', '2 Chronik': 'II Chronicles'}


def clean(t, cap=4000):
    t = re.sub(r'<br\s*/?>|</p>', '\n', t or '')
    t = html.unescape(re.sub(r'<[^>]+>', '', t))
    t = re.sub(r'[ \t\r]+', ' ', t); t = re.sub(r'\n\s*\n+', '\n', t).strip()
    return t[:cap] + ('…' if len(t) > cap else '')


sef = {}
def sefaria_en(title):
    m = re.match(r'^(.+?)\s+(\d+):(\d+)(?:-(\d+))?(?::(\d+))?', title or '')
    if not m:
        return None
    book = SEF_BOOK.get(m.group(1).strip())
    if not book or not os.path.exists(f'{RAW}/sefaria/{book}.json.gz'):
        return None
    if book not in sef:
        d = json.load(gzip.open(f'{RAW}/sefaria/{book}.json.gz'))
        sef[book] = next((v['text'] for v in d['versions'] if v.get('language') == 'en'), None)
    T = sef[book]
    if not T:
        return None
    c, v1 = int(m.group(2)), int(m.group(3)); v2 = int(m.group(4) or v1)
    if m.group(5):  # 2:11-3:5 biçimi: yalnız ilk bölüm
        v2 = 999
    try:
        vs = T[c - 1][v1 - 1:v2]
    except IndexError:
        return None
    vs = [clean(str(x), 600) for x in vs if x]
    return {'metin': '\n'.join(f'{v1 + i} {x}' for i, x in enumerate(vs))[:4000], 'kaynak': f'Sefaria — {book} {c}:{v1}' + (f'-{v2}' if v2 != v1 and v2 != 999 else '') + ' (JPS, CC BY-NC)'}


# ---- Grekçe ve Süryanice tanıklar (LXX Rahlfs, SBLGNT, Peşitta, Süryanice Yeni Ahit)
BMAP = {'Genesis': ('Gen', 'Genesis', None, None), 'Exodus': ('Exod', 'Exodus', None, None), 'Leviticus': ('Lev', 'Leviticus', None, None), 'Numeri': ('Num', 'Numbers', None, None),
        'Deuteronomium': ('Deut', 'Deuteronomy', None, None), 'Richter': ('Judg', 'Judges', None, None), '1 Samuel': ('1Sam', 'Samuel_1', None, None), '2 Samuel': ('2Sam', 'Samuel_2', None, None),
        '1 Könige': ('1Kgs', 'Kings_1', None, None), '2 Könige': ('2Kgs', 'Kings_2', None, None), '1 Chronik': ('1Chr', 'Chronicles_1', None, None), 'Esther': ('Esth', 'Esther', None, None),
        'Hiob': ('Job', 'Job', None, None), 'Psalm': ('Ps', 'Psalms', None, None), 'Sprüche': ('Prov', 'Proverbs', None, None), 'Jesaja': ('Isa', 'Isaiah', None, None), 'Jeremia': ('Jer', 'Jeremiah', None, None),
        'Ezechiel': ('Ezek', 'Ezekiel', None, None), 'Daniel': ('DanTh', 'Daniel', None, None), 'Jona': ('Jonah', 'Jonah', None, None), 'Zefanja': ('Zeph', 'Zephaniah', None, None), 'Sacharja': ('Zech', 'Zechariah', None, None),
        'Matthäus': (None, None, 'Matt', 'Matthew'), 'Markus': (None, None, 'Mark', 'Mark'), 'Lukas': (None, None, 'Luke', 'Luke'), 'Johannes': (None, None, 'John', 'John'), 'Apostelgeschichte': (None, None, 'Acts', 'Acts'),
        'Brief an die Römer': (None, None, 'Rom', 'Romans'), '1. Brief an die Korinther': (None, None, '1Cor', '1_Corinthians'), '2. Brief an die Korinther': (None, None, '2Cor', '2_Corinthians'),
        'Brief an die Galater': (None, None, 'Gal', 'Galatians'), 'Brief an die Philipper': (None, None, 'Phil', 'Philippians'), 'Philipper': (None, None, 'Phil', 'Philippians'),
        '1. Brief an die Thessaloniker': (None, None, '1Thess', '1_Thessalonians'), '1. Brief an Timotheus': (None, None, '1Tim', '1_Timothy'), '1. Petrusbrief': (None, None, '1Pet', '1_Peter'),
        '2. Petrusbrief': (None, None, '2Pet', '2_Peter'), 'Offenbarung des Johannes': (None, None, 'Rev', 'Revelation')}
LXX = None
def lxx_verses():
    global LXX
    if LXX is None:
        words = [(l.rstrip('\n').split('\t') + ['', '', ''])[2] for l in open(f'{RAW}/greek/LXX-Rahlfs-1935/01_wordlist_unicode/text_accented.csv', encoding='utf8')]
        starts = [(l.split('\t')[0], int(l.split('\t')[1])) for l in open(f'{RAW}/greek/LXX-Rahlfs-1935/08_versification/001_verse_c_modified_KEEP.csv', encoding='utf8') if '\t' in l]
        LXX = {}
        for i, (ref, st) in enumerate(starts):
            en = starts[i + 1][1] if i + 1 < len(starts) else len(words) + 1
            LXX[ref] = ' '.join(words[st - 1:en - 1])
    return LXX
def ps_lxx(c):  # İbranice Mezmur numarası → LXX (yaklaşık; 9–10 ve 114–116, 147 birleşik/bölünmüş)
    return c - 1 if 11 <= c <= 113 or 117 <= c <= 146 else c
CH = {}
def chapters(path, head):
    if path not in CH:
        cur, out = None, collections.defaultdict(dict)
        if os.path.exists(path):
            lastv = None
            for line in open(path, encoding='utf8'):
                line = line.strip()
                m = re.match(head, line)
                if m: cur = int(m.group(1)); lastv = None; continue
                m = re.match(r'^(\d+)\s+(.*)$', line)
                if cur and m: lastv = int(m.group(1)); out[cur][lastv] = m.group(2)
                elif cur and lastv and line: out[cur][lastv] += ' ' + line
        CH[path] = out
    return CH[path]
SBL = {}
def sbl(code):
    if code not in SBL:
        SBL[code] = {}
        p = f'{RAW}/greek/SBLGNT/data/sblgnt/text/{code}.txt'
        if os.path.exists(p):
            for line in open(p, encoding='utf8'):
                m = re.match(r'^\S+ (\d+):(\d+)\t(.*)$', line.strip())
                if m: SBL[code][(int(m.group(1)), int(m.group(2)))] = re.sub(r'[⸀-⸅]', '', m.group(3))
    return SBL[code]
def witnesses(title):
    m = re.match(r'^(?:Hebräische Bibel, )?(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?', title or '')
    if not m or m.group(1).strip() not in BMAP: return {}
    lxx, pes, nt, syr = BMAP[m.group(1).strip()]
    c = int(m.group(2)); v1 = int(m.group(3) or 1); v2 = int(m.group(4) or (m.group(3) or 30))
    vs = range(v1, min(v2, v1 + 40) + 1)
    out = {}
    if lxx:
        L = lxx_verses(); cc = ps_lxx(c) if lxx == 'Ps' else c
        t = [f'{v} ' + L[f'{lxx}.{cc}.{v}'] for v in vs if f'{lxx}.{cc}.{v}' in L]
        if t: out['lxx'] = {'metin': '\n'.join(t)[:4000], 'kaynak': f'Septuaginta (Rahlfs 1935) — {lxx} {cc}:{v1}' + (f'-{v2}' if v2 != v1 else '') + ('; Mezmur numarası LXX düzenine çevrildi' if lxx == 'Ps' and cc != c else '')}
    if pes:
        C = chapters(f'{RAW}/syriac/peshitta/plain/0.1/{pes}.txt', r'^Chapter (\d+)$')
        t = [f'{v} {C[c][v]}' for v in vs if v in C.get(c, {})]
        if t: out['pesitta'] = {'metin': '\n'.join(t)[:4000], 'kaynak': f'Peşitta (ETCBC/peshitta, Leiden metni) — {pes} {c}:{v1}-{v2}'}
    if nt:
        G = sbl(nt); t = [f'{v} {G[(c, v)]}' for v in vs if (c, v) in G]
        if t: out['sblgnt'] = {'metin': '\n'.join(t)[:4000], 'kaynak': f'SBL Greek New Testament — {nt} {c}:{v1}-{v2}'}
        import glob as _g
        ps = _g.glob(f'{RAW}/syriac/syrnt/plain/*/{syr}.txt')
        if ps:
            C = chapters(ps[0], r'^\S+ (\d+)$'); t = [f'{v} {C[c][v]}' for v in vs if v in C.get(c, {})]
            if t: out['syrnt'] = {'metin': '\n'.join(t)[:4000], 'kaynak': f'Süryanice Yeni Ahit (ETCBC/syrnt) — {syr} {c}:{v1}-{v2}'}
    return out

by_ayah = collections.defaultdict(list); rows = {}
for f in glob.glob(f'{RAW}/cc_api/intertexts/*.json.gz'):
    d = json.load(gzip.open(f))['data']
    tr = d.get('translations')
    tr = tr if isinstance(tr, dict) else {}
    rec = {'id': d['id'], 'baslik': d['title'], 'ust': TR.get(d.get('supercategory'), d.get('supercategory')), 'kategori': d.get('category'),
           'dil': LANG.get(d.get('language'), d.get('language')), 'yer': d.get('location'), 'tarih': d.get('dated'), 'kaynak': d.get('source'), 'yazar': d.get('intertext_author'),
           'tespit': d.get('identified_by'), 'madde_yazari': d.get('entry_author'),
           'metin': clean(d.get('content')), 'yon': d.get('content_direction') or 'ltr', 'transkripsiyon': clean(d.get('transcription')) if d.get('transcription') not in (None, 'None') else '',
           'ceviri_de': clean(tr.get('de')), 'ceviri_en': clean(tr.get('en')), 'not_de': clean(d.get('notes'), 3000),
           'cc': f"https://corpuscoranicum.de/de/intertexts/{d['id']}"}
    en = sefaria_en(d['title']) if d.get('supercategory') == 'Hebräische Bibel' else None
    if en:
        rec['sefaria'] = en
    rec.update(witnesses(d['title']))
    ays = []
    for p in d.get('passages') or []:
        s1, v1, s2, v2 = p['start']['sura'], p['start']['verse'], p['end']['sura'], p['end']['verse']
        if s1 == s2:
            for v in range(v1, v2 + 1):
                ays.append(f'{s1}:{v}')
    rec['ayetler'] = ays
    json.dump(rec, open(f"{OUT}/m/{d['id']}.json", 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    short = {k: rec[k] for k in ('id', 'baslik', 'ust', 'kategori', 'dil', 'tarih')}
    for a in set(ays):
        by_ayah[a].append(short)
for s in range(1, 115):
    out = {k: sorted(v, key=lambda x: x['ust'] or '') for k, v in by_ayah.items() if k.startswith(f'{s}:')}
    json.dump({'version': 'k6-2026.10.23', 'kaynak': 'Corpus Coranicum, Texte aus der Umwelt des Korans (CC BY 4.0)', 'ayetler': out},
              open(f'{OUT}/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(sum(1 for f in glob.glob(f'{OUT}/m/*') if '"lxx"' in open(f).read()), 'LXX', sum(1 for f in glob.glob(f'{OUT}/m/*') if '"pesitta"' in open(f).read()), 'Peşitta', sum(1 for f in glob.glob(f'{OUT}/m/*') if '"sblgnt"' in open(f).read()), 'SBLGNT', sum(1 for f in glob.glob(f'{OUT}/m/*') if '"syrnt"' in open(f).read()), 'SyrNT')
print(len(glob.glob(f'{OUT}/m/*')), 'metin', len(by_ayah), 'ayet', sum(1 for f in glob.glob(f'{OUT}/m/*') if 'sefaria' in open(f).read()), 'sefaria')
