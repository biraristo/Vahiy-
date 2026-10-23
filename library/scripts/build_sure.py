"""Sure sayfası verisi: site/data/sure/{n}.json
- künye ve sayım farkları (Katman 0)
- dizimler: mushaf, Mısır nüzul (Tanzil), Nöldeke–Schwally (Robinson); her dizimde önceki/sonraki sure
- temalar: Vikipedi 'Main theme(s)' (İngilizce asıl + Claude'un Türkçe çevirisi), mukattaa harfleri
- tanıtım: Mevdûdî, Tefhîmü'l-Kur'ân (Quran.com, İngilizce)
- Corpus Coranicum kronolojik-edebî şerhi (Neuwirth–Hartwig, Almanca): bölümler ve metin yapısı
- konu haritası: Quranpedia konu dizininin sure içi toplamı
- sayılar: rivayet, alıntı, ihtilaf (Katman 3–7 paketlerinden)"""
import json, gzip, re, html, os, collections
RAW = '/home/claude/lib/raw'
REPO = '/home/claude/vahiy-'
OUT = f'{REPO}/site/data/sure'
os.makedirs(OUT, exist_ok=True)
S = json.load(open(f'{REPO}/site/data/k0/surahs.json'))
SS = S['sureler']
TH_EN = json.load(open('/home/claude/lib/manual/wiki_themes_en.json'))
TH_TR = json.load(open('/home/claude/lib/manual/sure_temalari_tr.json'))
TOP = json.load(open(f'{REPO}/site/data/k1/konular.json'))['konular']


def clean(t, keep_par=True):
    t = re.sub(r'<!--.*?-->', ' ', str(t or ''), flags=re.S)
    if keep_par:
        t = re.sub(r'</p>|<br\s*/?>|</h\d>|</li>', '\n', t)
        t = re.sub(r'<h\d[^>]*>', '\n§ ', t)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    t = re.sub(r'[ \t\r\xa0]+', ' ', t)
    t = re.sub(r'\s*\n\s*', '\n', t).strip()
    return '' if t == 'None' else t


def cc_sections(L):
    out = []
    for s in L or []:
        if s.get('sections'):
            out.append({'baslik': s.get('heading') or s.get('general_title'), 'alt': cc_sections(s['sections'])})
            continue
        body = clean(s.get('content'))
        vc = s.get('verse_content')
        if vc:
            body = '\n'.join(clean(v.get('content')) for v in vc if isinstance(v, dict))
        out.append({'baslik': s.get('general_title'), 'ozel': clean(s.get('specific_title'), False), 'metin': body,
                    'eserler': clean(s.get('works_cited'))[:3000]})
    return out


orders = {'mushaf': {x['n']: x['n'] for x in SS}, 'nuzul_misir': {x['n']: x['tertip']['nuzul_misir'] for x in SS}, 'noldeke': {x['n']: x['tertip']['noldeke'] for x in SS}}
inv = {k: {v: s for s, v in d.items()} for k, d in orders.items()}
ONAME = {'mushaf': 'Mushaf tertibi', 'nuzul_misir': 'Nüzul sırası (Mısır / Kahire 1924)', 'noldeke': 'Nöldeke–Schwally'}

# sayılar
cnt = collections.defaultdict(collections.Counter)
for s in range(1, 115):
    for a in range(1, SS[s - 1]['ayet'] + 1):
        b = json.load(gzip.open(f'{REPO}/site/data/x/{s}/{a}.json.gz'))
        c = cnt[s]
        c['rivayet'] += len(b['k4']); c['ihtilaf'] += len(b['k7']['ihtilaf']); c['fetva'] += len(b['k7']['fetva'])
        c['alinti'] += sum(x[1] for L in b['k3'].values() for x in L)
        for r in b['k4']:
            t = r.get('tur') or ''
            c['nuzul'] += 'نزول' in t; c['nesih'] += 'النسخ' in t

for x in SS:
    n = x['n']
    k1 = json.load(open(f'{REPO}/site/data/k1/{n}.json'))['ayetler']
    tc = collections.Counter(); tays = collections.defaultdict(list)
    for aid, L in k1.items():
        for t in L.get('konu', []):
            tc[t] += 1; tays[t].append(aid)
    konular = [{'id': t, 'ad': TOP[str(t)]['ad'] if str(t) in TOP else TOP.get(t, {}).get('ad'), 'ust': (TOP.get(str(t)) or TOP.get(t) or {}).get('ust'), 'ayetler': tays[t]} for t, _ in tc.most_common(60)]
    ust = collections.Counter()
    for t, k in tc.items():
        u = (TOP.get(str(t)) or TOP.get(t) or {}).get('ust')
        if u: ust[u] += k
    bolumler = collections.OrderedDict()
    for aid, L in k1.items():
        b = (L.get('ayni_bolum') or {}).get('bolum')
        if b is not None:
            bolumler.setdefault(b, []).append(int(aid.split(':')[1]))
    rec = {'n': n, 'ar': x['ar'], 'tr': x['tr'], 'tur': x['tur'], 'ayet': x['ayet'], 'kelime': x['kelime'], 'ruku': x['ruku'], 'ihtilaf': x.get('ihtilaf'),
           'rivayetlere_gore_ayet_sayisi': x.get('rivayetlere_gore_ayet_sayisi'),
           'dizimler': [{'ad': ONAME[k], 'sira': orders[k][n], 'onceki': inv[k].get(orders[k][n] - 1), 'sonraki': inv[k].get(orders[k][n] + 1)} for k in orders],
           'mukattaa': (TH_EN.get(str(n)) or {}).get('muqattaat') or '', 'isim_atfi': (TH_EN.get(str(n)) or {}).get('isim') or '',
           'temalar_tr': TH_TR['temalar'].get(str(n), []), 'temalar_en': [l.strip() for l in ((TH_EN.get(str(n)) or {}).get('tema') or '').split('\n') if l.strip()],
           'temalar_kaynak': TH_TR['kaynak'],
           'konular': konular, 'ust_konular': ust.most_common(15),
           'cc_bolumler': [{'bolum': b, 'ayetler': [min(v), max(v)]} for b, v in bolumler.items()],
           'sayilar': dict(cnt[n])}
    p = f'{RAW}/qurancom/chapter_info/en-{n}.json.gz'
    if os.path.exists(p):
        ci = json.load(gzip.open(p))['chapter_info']
        rec['tanitim'] = {'kaynak': ci.get('source'), 'dil': ci.get('language_name'), 'ozet': clean(ci.get('short_text')), 'metin': clean(ci.get('text'))}
    p = f'{RAW}/cc_api/commentary/{n}.json.gz'
    if os.path.exists(p):
        c = json.load(gzip.open(p))['data']
        rec['cc'] = {'baslik': clean(c.get('title'), False), 'yazar': clean(c.get('author'), False), 'atif': clean(c.get('how_to_cite'), False).replace('%DATE%', '2026'),
                     'bolumler': cc_sections(c.get('sections')),
                     'yapi': [{'a': t.get('verse'), 'ar': t.get('ar'), 'de': t.get('de'), 'kafiye': t.get('rhyme'), 'bolum': t.get('section'), 'ana': t.get('main_part')} for t in c.get('text_structure') or []]}
    json.dump(rec, open(f'{OUT}/{n}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('ok', sum(1 for n in range(1, 115) if os.path.exists(f'{OUT}/{n}.json')))
