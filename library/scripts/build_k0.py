"""Katman 0: Kur'an iskeleti.

Girdi : Quranpedia mushafları (12 rivayet), Tanzil (metin + bölümlemeler), Quranpedia morfoloji,
        Quran.com kelime mealleri (tr, en), Corpus Coranicum (kafiye ve bölüm yapısı, kıraat sayıları,
        intertekst sayıları), kronoloji tabloları.
Çıktı : vahiy-/data/k0/*.json      (kanonik veri, sürümlü)
        vahiy-/site/data/k0/*.json (site için sure dosyaları)
        vahiy-/data/k0/report.json (doğrulama raporu)
"""
import gzip, json, os, re, unicodedata, collections, hashlib

RAW = '/home/claude/lib/raw'
REPO = '/home/claude/vahiy-'
OUT = f'{REPO}/data/k0'
SITE = f'{REPO}/site/data/k0'
os.makedirs(OUT, exist_ok=True)
os.makedirs(f'{SITE}/s', exist_ok=True)
VERSION = 'k0-2026.10.23'

def gz(p):
    return json.load(gzip.open(p))

def skeleton(s):
    """Harf iskeleti: hareke, işaret ve yazım farklarını atar (karşılaştırma için)."""
    s = unicodedata.normalize('NFKC', s).replace('ٰ', 'ا')
    s = re.sub(r'[ؐ-ًؚ-ٟۖ-ۭـࣰ-ࣿ]', '', s)
    s = re.sub('[إأآٱ]', 'ا', s).replace('ى', 'ي').replace('ی', 'ي').replace('ک', 'ك')
    s = s.replace('ء', '').replace('ؤ', 'و').replace('ئ', 'ي')
    s = re.sub(r'[^ء-ي]', '', s)
    return re.sub(r'ا+', 'ا', s)

report = {'version': VERSION, 'checks': []}
def check(name, ok, detail='', kind='dogrulama'):
    report['checks'].append({'kontrol': name, 'sonuc': ('geçti' if ok else ('KALDI' if kind == 'dogrulama' else 'kaynaklar ayrışıyor')), 'ayrinti': detail, 'tur': kind})

# ---------------- Tanzil ----------------
tz_xml = open(f'{RAW}/tanzil/quran-uthmani.xml', encoding='utf8').read()
tanzil = {}
for m in re.finditer(r'<sura index="(\d+)"[^>]*>(.*?)</sura>', tz_xml, re.S):
    for a in re.finditer(r'<aya index="(\d+)" text="([^"]*)"(?: bismillah="([^"]*)")?', m.group(2)):
        tanzil[(int(m.group(1)), int(a.group(1)))] = a.group(2)
meta_xml = open(f'{RAW}/tanzil/quran-data.xml', encoding='utf8').read()
sura_meta = {}
for m in re.finditer(r'<sura index="(\d+)" ayas="(\d+)" start="\d+" name="([^"]+)" tname="([^"]+)" ename="([^"]+)" type="(\w+)" order="(\d+)" rukus="(\d+)"', meta_xml):
    sura_meta[int(m.group(1))] = dict(ayas=int(m.group(2)), ar=m.group(3), tname=m.group(4), ename=m.group(5),
                                      type='Mekkî' if m.group(6) == 'Meccan' else 'Medenî', egypt=int(m.group(7)), rukus=int(m.group(8)))
sajda = {(int(m.group(1)), int(m.group(2))): m.group(3) for m in re.finditer(r'<sajda index="\d+" sura="(\d+)" aya="(\d+)" type="(\w+)"', meta_xml)}

# ---------------- Quranpedia mushafları ----------------
mush_index = gz(f'{RAW}/qp/mushafs-index.json.gz')['data']
riwayat = []
for mi in mush_index:
    if mi['id'] in (1, 3, 11, 12):  # 12: Kālûn'un ikinci baskısı (Libya Evkaf); sayım için 7 esas  # aynı Hafs metninin baskı/görünüm varyantları; esas Hafs = 2
        continue
    d = gz(f"{RAW}/qp/mushafs-{mi['id']}.json.gz")['data']
    r = d['rawi']
    q = r.get('qiraa') or {}
    riwayat.append({'id': mi['id'], 'ad': d['name'], 'ravi': r['name'], 'kari': q.get('short_name') or (mi.get('rawi') or {}).get('qiraa', {}).get('short_name'),
                    'sayim': ((q.get('count') or {}).get('name')) or (((mi.get('rawi') or {}).get('qiraa') or {}).get('count') or {}).get('name'),
                    'surahs': d['surahs']})
hafs = next(r for r in riwayat if r['id'] == 2)

# metin doğrulaması: Quranpedia Hafs (2) ile Tanzil harf iskeleti
mismatch = [(int(a['surah']), a['number']) for s in hafs['surahs'] for a in s['ayahs'] if skeleton(a['text']) != skeleton(tanzil[(int(a['surah']), a['number'])])]
check('Hafs metni: Quranpedia (mushaf 2) = Tanzil harf iskeleti', not mismatch, f'{6236 - len(mismatch)}/6236 ayet aynı')

# rivayetlerin Hafs ayetlerine eşlemesi
riv_map = collections.defaultdict(list)   # (s,a) -> [{rivayet, no, hafs_aralik, metin}]
riv_summary = []
for r in riwayat:
    if r['id'] == 2:
        continue
    total = 0
    for s in r['surahs']:
        for a in s['ayahs']:
            total += 1
            hn = a.get('number_in_hafs') or []
            for h in hn:
                riv_map[(int(a['surah']), int(h))].append({'r': r['id'], 'no': a['number'], 'hafs': hn, 'text': a['text']})
    riv_summary.append({'id': r['id'], 'ravi': r['ravi'], 'kari': r['kari'], 'sayim': r['sayim'], 'ayet_toplami': total, 'kaynak': 'Quranpedia'})

# ---------------- Morfoloji ve kelime mealleri ----------------
morph = {(x['surah'], x['ayah']): x['morphology']['words'] for x in gz(f'{RAW}/qp/morphology.json.gz')['data']}
wbw = {}
for lang in ('tr', 'en'):
    for s in range(1, 115):
        for v in gz(f'{RAW}/qurancom/wbw/{lang}-{s}.json.gz'):
            sa = tuple(map(int, v['verse_key'].split(':')))
            ws = [w for w in v['words'] if w.get('char_type_name') == 'word']
            for w in ws:
                wbw.setdefault((sa, w['position']), {})[lang] = (w.get('translation') or {}).get('text')
                if lang == 'en':
                    wbw[(sa, w['position'])]['translit'] = (w.get('transliteration') or {}).get('text')

wbw_count = collections.Counter(k[0] for k in wbw)

# ---------------- Corpus Coranicum: kafiye ve bölüm ----------------
cc_struct = {}
for s in range(1, 115):
    p = f'{RAW}/cc_api/commentary/{s}.json.gz'
    if os.path.exists(p):
        for t in gz(p)['data'].get('text_structure') or []:
            cc_struct.setdefault((s, t['verse']), []).append({'parca': t.get('verse_part'), 'kafiye': t.get('rhyme'), 'bolum': t.get('section'), 'ana_bolum': t.get('main_part'), 'onlu': t.get('decade')})
cc_var_count = {}
for s in range(1, 115):
    for a in range(1, sura_meta[s]['ayas'] + 1):
        p = f'{RAW}/cc_api/variants/{s}_{a}.json.gz'
        if os.path.exists(p):
            d = gz(p)['data']
            vr = d.get('variant_readings') or []
            works = {(v.get('work') or {}).get('display_name') for v in vr if v.get('work')}
            cc_var_count[(s, a)] = {'okuyus': len(vr), 'kaynak_eser': len(works)}
inter = gz(f'{RAW}/cc_api/intertexts_index.json.gz')['data']
inter_count = collections.Counter((i['sura'], i['verse']) for i in inter if i.get('sura') and i.get('verse'))

# ---------------- Kronolojiler ----------------
nold = json.load(open(f'{RAW}/chronology/noldeke_egypt_wikipedia.json'))
qp_surah = {x['surah']: x['information'] for x in gz(f'{RAW}/qp/surahs.json.gz')['data']}
egypt_qp_diff = [s for s in range(1, 115) if str(sura_meta[s]['egypt']) != str((qp_surah[s].get('descent') or {}).get('value', '')).strip()]
check('Mısır nüzul tertibi: Tanzil = Robinson/Vikipedi tablosu', all(sura_meta[s]['egypt'] == nold['data'][str(s)]['egypt'] for s in range(1, 115)))
check('Mısır nüzul tertibi: Tanzil = Quranpedia', not egypt_qp_diff, f'farklı sureler: {egypt_qp_diff}', 'kaynak_farki')
type_diff = [s for s in range(1, 115) if (qp_surah[s].get('surah_type') or {}).get('value', '').strip() not in (('مكية',) if sura_meta[s]['type'] == 'Mekkî' else ('مدنية',))]
check('Mekkî/Medenî: Tanzil = Quranpedia', not type_diff, f'farklı sureler: {type_diff}', 'kaynak_farki')

TR = json.load(open(f'{REPO}/data/k0/sure_adlari_tr.json'))

# ---------------- Sure ve ayet kayıtları ----------------
ayah_rows = []
surah_rows = []
word_total = word_mismatch = 0
for s in hafs['surahs']:
    sn = int(s['id'])
    m = sura_meta[sn]
    counts = {}
    for r in riwayat:
        if r['id'] == 2:
            continue
        counts[f"{r['ravi']} ({r['sayim']})"] = len(r['surahs'][sn - 1]['ayahs'])
    ayahs_out = []
    for a in s['ayahs']:
        an = a['number']
        key = (sn, an)
        words = []
        mw = morph.get(key, [])
        for w in mw:
            word_total += 1
            stem = next((g for g in w['segments'] if g['role'] == 'stem'), w['segments'][0] if w['segments'] else {})
            ww = wbw.get((key, w['number']), {})
            words.append({'n': w['number'], 'ar': w['text'], 'kok': stem.get('root'), 'lemma': stem.get('lemma'),
                          'tur': stem.get('pos'), 'irab': stem.get('inflection'), 'nitelik': stem.get('qualifiers') or [],
                          'aciklama': stem.get('description'), 'tr': ww.get('tr'), 'en': ww.get('en'), 'okunus': ww.get('translit'),
                          'dogrulandi_qac': w.get('verified')})
        if wbw_count.get(key) and len(mw) != wbw_count[key]:
            word_mismatch += 1
        # sayım farkları: bu Hafs ayeti diğer rivayetlerde nasıl bölünüyor
        by_r = collections.defaultdict(list)
        for e in riv_map.get(key, []):
            by_r[e['r']].append(e)
        sayim, riv_texts = [], {}
        for rid, es in by_r.items():
            rr = next(r for r in riwayat if r['id'] == rid)
            if len(es) > 1 or len(es[0]['hafs']) != 1:
                sayim.append({'rivayet': rr['ravi'], 'sayim': rr['sayim'],
                              'durum': 'bölünüyor' if len(es) > 1 else 'birleşiyor',
                              'ayet_no': [e['no'] for e in es], 'hafs_karsiligi': sorted({h for e in es for h in e['hafs']})})
            joined = ' '.join(e['text'] for e in es)
            riv_texts[rr['ravi']] = {'sayim': rr['sayim'], 'ayet_no': [e['no'] for e in es], 'metin': [e['text'] for e in es],
                                     'iskelet_farkli': skeleton(joined) != skeleton(a['text'])}
        row = {
            'id': f'{sn}:{an}', 's': sn, 'a': an, 'metin': a['text'], 'metin_tanzil': tanzil[key],
            'konum': {'cuz': a.get('juz'), 'hizb': a.get('hizb'), 'ruku': a.get('ruku'), 'menzil': a.get('manzil'), 'sayfa': a.get('page_number')},
            'secde': sajda.get(key), 'kelimeler': words, 'sayim_farki': sayim, 'rivayetler': riv_texts,
            'cc_yapi': [dict(t) for t in {tuple(sorted(x.items())) for x in cc_struct.get(key, [])}], 'cc_kiraat': cc_var_count.get(key), 'cc_intertekst': inter_count.get(key, 0),
            'quranpedia_hizmetleri': a.get('options') or [],
        }
        ayahs_out.append(row)
        ayah_rows.append(row)
    srow = {'n': sn, 'ar': m['ar'], 'tr': TR[sn - 1], 'tname': m['tname'], 'en': m['ename'], 'ayet': m['ayas'], 'tur': m['type'],
            'tertip': {'mushaf': sn, 'nuzul_misir': m['egypt'], 'noldeke': nold['data'][str(sn)]['noldeke']},
            'ihtilaf': {k: v for k, v in {
                'tur': ({'Tanzil': m['type'], 'Quranpedia': (qp_surah[sn].get('surah_type') or {}).get('value', '').strip()} if sn in type_diff else None),
                'nuzul_misir': ({'Tanzil': m['egypt'], 'Quranpedia': (qp_surah[sn].get('descent') or {}).get('value', '').strip()} if sn in egypt_qp_diff else None)}.items() if v},
            'ruku': m['rukus'], 'rivayetlere_gore_ayet_sayisi': counts,
            'cc_serh': os.path.exists(f'{RAW}/cc_api/commentary/{sn}.json.gz'),
            'kelime': sum(len(x['kelimeler']) for x in ayahs_out)}
    surah_rows.append(srow)
    os.makedirs(f'{SITE}/r', exist_ok=True)
    json.dump({'version': VERSION, 'sure': srow, 'ayetler': [{k: v for k, v in x.items() if k != 'rivayetler'} for x in ayahs_out]},
              open(f'{SITE}/s/{sn}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({x['id']: x['rivayetler'] for x in ayahs_out}, open(f'{SITE}/r/{sn}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

check('Morfoloji: 6.236 ayetin kelime çözümlemesi var', len(morph) == 6236, f'{len(morph)} ayet, {word_total} kelime')
check('Kelime meali ile morfoloji kelime sayısı uyumu', word_mismatch == 0, f'{word_mismatch} ayette kelime sayısı farklı')
check('Ayet toplamı (Hafs/Kûfî) = 6.236', len(ayah_rows) == 6236)
sum_by = collections.defaultdict(set)
for r in riv_summary:
    sum_by[r['sayim']].add(r['ayet_toplami'])
check('Aynı sayım geleneğindeki rivayetlerin toplamı tutarlı', all(len(v) == 1 for v in sum_by.values()), json.dumps({k: sorted(v) for k, v in sum_by.items()}, ensure_ascii=False), 'kaynak_farki')

sources = {
    'metin': 'Quranpedia mushaf 2 (Hafs, Kral Fahd, Osmanlı hattı); Tanzil Uthmani ile harf iskeleti düzeyinde karşılaştırıldı',
    'rivayetler': 'Quranpedia mushafları (Verş, Kālûn, Bezzî, Kunbul, Dûrî, Sûsî, Şu\'be); sayım geleneği bilgisi Quranpedia kaydıdır',
    'bolumleme': 'Cüz/hizb/rükû/menzil/sayfa: Quranpedia (Kral Fahd baskısı); secde: Tanzil',
    'nuzul_misir': 'Tanzil quran-data.xml; Quranpedia ve Robinson (2003) ile aynı',
    'noldeke': nold['source'],
    'mekki_medeni': 'Tanzil (Quranpedia ile karşılaştırıldı)',
    'morfoloji': 'Quranic Arabic Corpus v0.4 (Quranpedia aracılığıyla), GNU GPL',
    'kelime_meali': 'Quran.com API v4 (Türkçe, İngilizce)',
    'cc_yapi': 'Corpus Coranicum, Hartwig–Neuwirth edebî-kronolojik şerhindeki ayet yapısı (kafiye, bölüm), CC BY 4.0',
    'cc_kiraat': 'Corpus Coranicum kıraat veri tabanı, CC BY 4.0',
}
json.dump({'version': VERSION, 'kaynaklar': sources, 'rivayetler': riv_summary, 'sureler': surah_rows},
          open(f'{SITE}/surahs.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
with open(f'{OUT}/ayahs.jsonl', 'w', encoding='utf8') as f:
    for r in ayah_rows:
        f.write(json.dumps({k: v for k, v in r.items() if k != 'rivayetler'}, ensure_ascii=False) + '\n')
json.dump({'version': VERSION, 'kaynaklar': sources, 'rivayetler': riv_summary, 'sureler': surah_rows}, open(f'{OUT}/surahs.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
report['ozet'] = {'ayet': len(ayah_rows), 'kelime': word_total, 'sayim_farki_olan_ayet': sum(1 for r in ayah_rows if r['sayim_farki']),
                  'iskeleti_farkli_rivayet_metni': sum(1 for r in ayah_rows for v in r['rivayetler'].values() if v['iskelet_farkli']),
                  'cc_kiraat_kaydi_olan_ayet': sum(1 for r in ayah_rows if r['cc_kiraat'] and r['cc_kiraat']['okuyus']),
                  'intertekst_bagli_ayet': sum(1 for r in ayah_rows if r['cc_intertekst'])}
json.dump(report, open(f'{OUT}/report.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False, indent=1))
