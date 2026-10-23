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
print(len(glob.glob(f'{OUT}/m/*')), 'metin', len(by_ayah), 'ayet', sum(1 for f in glob.glob(f'{OUT}/m/*') if 'sefaria' in open(f).read()), 'sefaria')
