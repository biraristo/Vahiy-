"""Kütüphane raflarını kurar: Şâmile (sh), OpenITI tamamlayıcı (oi), eski raflardaki Quranpedia/QUL eserleri.
- Şâmile kategorisi → raf (+ alt alan). OpenITI: etiketlerdeki kategori adları, sonra GAL/_ etiketleri, sonra başlık.
- Bir eserin tek nüshası: eski raftaki OpenITI kaydı Şâmile kopyasıysa sh kimliğine, tamamlayıcı ise oi kimliğine yönlendirilir.
  Eski Quranpedia kaydı Şâmile'de varsa (başlık + vefat) Şâmile'ye yönlendirilir, yoksa olduğu gibi kalır.
- Tefsir rafı: ayet ayet okunabilen eski kayıtlar (t…) korunur; Şâmile'deki karşılığı 'tam' alanına yazılır.
- Türkçe adlar eski kayıtlardan taşınır; olmayanlarda Arapça ad gösterilir.
Çıktı: site/data/kutuphane/{raf}.json, site/data/kutuphane/dizin.json ({r: kimlik→raf, y: eski→yeni})."""
import json, re, os, glob, hashlib, collections
L = '/home/claude/lib/raf'; SITE = '/home/claude/vahiy-/site/data/kutuphane'; OUT = os.environ.get('OUT', SITE)
SH = json.load(open(f'{L}/shamela_katalog.json'))
OI = json.load(open(f'{L}/openiti_katalog.json'))
SEC = json.load(open(f'{L}/openiti_secim.json'))
TAG = {a['book']: a['tags'] for a in json.load(open(f'{L}/openiti_aday.json'))}
DOG = {}
for p in ('sh', 'oi'):
    if os.path.exists(f'{L}/dogrulama_{p}.json'): DOG.update({(p, k): v for k, v in json.load(open(f'{L}/dogrulama_{p}.json')).items()})

RAFLAR = [('tefsir', 'Tefsir', 'التفسير'), ('ulum', "Ulûmü'l-Kur'ân ve kıraat", 'علوم القرآن والقراءات'), ('hadis', 'Hadis', 'الحديث'),
          ('hadisusul', 'Hadis usûlü', 'علوم الحديث'), ('kelam', 'Akaid ve kelâm', 'العقيدة والكلام'), ('fikih', 'Fıkıh', 'الفقه'),
          ('usul', 'Fıkıh usûlü ve kavâid', 'أصول الفقه والقواعد'), ('tasavvuf', 'Tasavvuf, ahlâk ve zühd', 'الرقائق والتصوف'),
          ('tarih', 'Siyer ve tarih', 'السيرة والتاريخ'), ('tabakat', 'Tabakât ve terâcim', 'التراجم والطبقات'), ('lugat', 'Dil ve lügat', 'اللغة والنحو'),
          ('edebiyat', 'Edebiyat, belâgat ve şiir', 'الأدب والبلاغة والشعر'), ('felsefe', 'Felsefe, mantık ve ilimler', 'الفلسفة والمنطق والعلوم'),
          ('farsca', 'Farsça eserler', 'الكتب الفارسية'), ('genel', 'Câmi eserler ve fihristler', 'الجوامع والفهارس')]
KAT = {'العقيدة': ('kelam', 'Akaid'), 'الفرق والردود': ('kelam', 'Fırkalar ve reddiyeler'), 'التفسير': ('tefsir', ''),
       'علوم القرآن وأصول التفسير': ('ulum', "Ulûmü'l-Kur'ân"), 'التجويد والقراءات': ('ulum', 'Kıraat ve tecvid'),
       'كتب السنة': ('hadis', 'Hadis kitapları'), 'شروح الحديث': ('hadis', 'Hadis şerhleri'), 'التخريج والأطراف': ('hadisusul', 'Tahrîc ve etrâf'),
       'العلل والسؤلات الحديثية': ('hadisusul', 'İlel ve suâlât'), 'علوم الحديث': ('hadisusul', 'Usûl-i hadis'),
       'أصول الفقه': ('usul', 'Usûl-i fıkıh'), 'علوم الفقه والقواعد الفقهية': ('usul', 'Kavâid'), 'المنطق': ('felsefe', 'Mantık'),
       'الفقه الحنفي': ('fikih', 'Hanefî'), 'الفقه المالكي': ('fikih', 'Mâlikî'), 'الفقه الشافعي': ('fikih', 'Şâfiî'), 'الفقه الحنبلي': ('fikih', 'Hanbelî'),
       'الفقه العام': ('fikih', 'Genel ve mukayeseli'), 'مسائل فقهية': ('fikih', 'Fıkhî meseleler'), 'السياسة الشرعية والقضاء': ('fikih', 'Siyâset ve kazâ'),
       'الفرائض والوصايا': ('fikih', 'Ferâiz'), 'الفتاوى': ('fikih', 'Fetvâlar'), 'الرقائق والآداب والأذكار': ('tasavvuf', ''),
       'السيرة النبوية': ('tarih', 'Siyer'), 'التاريخ': ('tarih', 'Tarih'), 'التراجم والطبقات': ('tabakat', ''), 'الأنساب': ('tabakat', 'Ensâb'),
       'البلدان والرحلات': ('tarih', 'Coğrafya ve rıhle'), 'كتب اللغة': ('lugat', 'Dil'), 'الغريب والمعاجم': ('lugat', 'Garîb ve sözlükler'),
       'النحو والصرف': ('lugat', 'Nahiv ve sarf'), 'الأدب': ('edebiyat', 'Edebiyat'), 'العروض والقوافي': ('edebiyat', 'Arûz'),
       'الشعر ودواوينه': ('edebiyat', 'Şiir'), 'البلاغة': ('edebiyat', 'Belâgat'), 'الجوامع': ('genel', 'Câmi eserler'),
       'فهارس الكتب والأدلة': ('genel', 'Fihristler'), 'الطب': ('felsefe', 'Tıp'), 'كتب عامة': ('genel', 'Genel'), 'علوm أخرى': ('felsefe', 'Diğer ilimler'),
       'علوم أخرى': ('felsefe', 'Diğer ilimler')}
# OpenITI: (raf, alt, desen) — sıra önemlidir
KURAL = [('ulum', 'Kıraat ve tecvid', r'قراءات|القراءات|تجويد|التجويد|_QIRAA'), ('ulum', "Ulûmü'l-Kur'ân", r'علوم القرآن|غريب القرآن|إعراب القرآن|اعراب القرآن|ناسخ|أحكام القرآن|_QURAN'),
         ('tefsir', '', r'تفسير|التفاسير|تفاسير|_TAFSIR'), ('hadisusul', 'Usûl-i hadis', r'علوم الحديث|مصطلح|العلل|السؤالات|التخريج|الزوائد|الجرح|_DIRAYA'),
         ('hadis', 'Hadis kitapları', r'حديث|حديثية|السنة|مسند|سنن|أجزاء|الأجزاء|الأربعين|أمالي|الأمالي|_HADITH'),
         ('usul', 'Usûl-i fıkıh', r'أصول الفقه|اصول الفقه|القواعد الفقهية|_USUL'),
         ('fikih', 'Fıkıh', r'فقه|_FIQH|فتاوى|فتاوي|_FATAWA|الفرائض|فرائض|القضاء|المناسك|الطهارة|الصلاة|الزكاة|الصوم|الحج|النكاح|الطلاق|البيوع'),
         ('kelam', 'Akaid', r'عقائد|العقيدة|عقيدة|العقائد|الملل|الفرق|الردود|الرد على|_CAQAID|_RUDUD|كلام|الكلام|الإمامة|الامامة|التوحيد|_IMAM'),
         ('tarih', 'Tarih', r'(أخبار|فضائل|فضل|تاريخ).{0,25}(مكة|المدينة|البيت|اليمن|الشام|مصر|بغداد|القدس)|مقتل|وقعة|_TARIKH'),
         ('fikih', 'Fıkıh', r'الأموال|الخراج|الحسبة|مسألة في'),
         ('kelam', 'Akaid', r'مناظرة|الإمام الصادق|الرسالة العلوية'),
         ('hadis', 'Hadis kitapları', r'الكافي|نهج البلاغة'),
         ('tasavvuf', '', r'تصوف|التصوف|الرقاق|الرقائق|الأخلاق|السلوك|الزهد|أذكار|الأذكار|أدعية|الأدعية|دعاء|الآداب|_TASAWWUF'),
         ('tabakat', '', r'التراجم|طبقات|تراجم|رجال|الرجال|الأنساب|أنساب|_TABAQAT|_RIJAL'),
         ('tarih', 'Tarih', r'السيرة|سيرة|_SIRA|_NABI|التاريخ|تاريخ|البلدان|رحلة|الرحلات|_TARIKH|خطط|مغازي|المغازي'),
         ('lugat', 'Dil', r'اللغة|المعاجم|النحو|الصرف|الغريب|معجم|لسان|_LUGHA|_NAHW'),
         ('edebiyat', 'Edebiyat', r'ديوان|دواوين|الشعر|شعر|الأدب|البلاغة|جاهلي|أموي|عباسي|أندلسي|مخضرم|مملوكي|_SHICR|_ADAB|مقامات|كوميدي|رواية|literature'),
         ('felsefe', 'Diğer ilimler', r'المنطق|منطق|فلسفة|الفلسفة|الطب|طب|علوم أخرى|الحكمة|_FALSAFA|حساب|نجوم|الفلك|philosophy|medicine|science'),
         ('genel', 'Genel', r'فهارس|الجوامع|كتب عامة')]
def oi_raf(book, baslik, dil, kat, v=''):
    if dil == 'per': return 'farsca', ''
    if re.search(r'\.(GRAR|ALCorpus)', v): return 'felsefe', 'Felsefe ve tercüme'
    if re.search(r'\.Tertullian', v): return 'genel', 'Hristiyan Arapça metinler'
    tags = TAG.get(book, '')
    katlar = ' '.join([kat or ''] + [t.split('@', 1)[1] for t in re.split(r'\s*::\s*', tags) if '@' in t and not t.startswith(('born', 'died', 'resided', 'visited'))])
    alt = ' '.join(t for t in re.split(r'\s*::\s*', tags) if t.startswith('_'))
    for kaynak in (katlar, alt, baslik):
        for raf, a, d in KURAL:
            if re.search(d, kaynak): return raf, a
    return 'genel', 'Genel'
def donem(v):
    if not v: return 'modern'
    return 'erken' if v <= 310 else 'klasik' if v <= 656 else 'orta' if v <= 922 else 'osmanli' if v <= 1342 else 'modern'
def norm(t):
    t = re.sub(r'[ً-ْٰـ]', '', t or ''); t = re.sub('[أإآٱ]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي')
    return {w[2:] if w.startswith('ال') and len(w) > 4 else w for w in re.sub(r'[^ء-ي ]+', ' ', t).split() if len(w) > 1}
def jac(a, b): return len(a & b) / max(1, len(a | b))
def nesir(k):
    if not k: return ''
    return '، '.join(x for x in [k.get('المحقق') and f"تحقيق: {k['المحقق']}", k.get('الناشر'), k.get('الطبعة') and f"ط. {k['الطبعة']}", k.get('عدد الأجزاء') and f"{k['عدد الأجزاء']} ج"] if x)

E = {}  # kimlik → kayıt
for bid, v in SH.items():
    if not v.get('yuklendi'): continue
    raf, alt = KAT.get(v.get('kategori'), ('genel', 'Genel'))
    den = v.get('denetim') or {}
    e = {'id': f'sh{bid}', 'ad': '', 'ad_ar': v['ad'], 'muellif': '', 'muellif_ar': v.get('muellif') or '', 'vefat': v.get('vefat'), 'donem': donem(v.get('vefat')),
         'alt': alt, 'kaynak': 'Şâmile', 'ref': bid, 'nesir': nesir(v.get('kunye')), 'b': den.get('bolum'), 'kb': v.get('kb'), 'raf': raf}
    if den.get('eksik_sayfa', 0) > max(20, 0.05 * den.get('sayfa_tablo', 1)): e['eksik'] = f"Kaynakta {den['eksik_sayfa']} / {den['sayfa_tablo']} sayfa boş"
    E[e['id']] = e
import zipfile, csv
csv.field_size_limit(10 ** 9)
ELLE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'openiti_basliklar.json')))
_Z = _ZN = _M = None
def oi_baslik(v):
    global _Z, _ZN, _M
    b = v['baslik'].split(' :: ')[0].strip()
    if b: return b
    if v['book'] in ELLE: return ELLE[v['book']]
    if _Z is None:
        _Z = zipfile.ZipFile('/home/claude/lib/raw/openiti_pri_data.zip'); _ZN = {n.rsplit('/', 1)[-1]: n for n in _Z.namelist()}
        _M = {r['version_uri']: r['title_lat'] for r in csv.DictReader(open('/home/claude/lib/raw/openiti_pri_meta.tsv'), delimiter='\t')}
    t = _Z.read(_ZN[v['v']]).decode('utf8', 'replace')[:20000] if v['v'] in _ZN else ''
    m = re.search(r'#META#\s*(?:العنوان|الكتاب|اسم الكتاب|عنوان الكتاب)\s*:\s*(.+)', t)
    if m and re.search('[ء-ي]', m.group(1)): return m.group(1).strip()
    return (_M.get(v['v']) or v['book'].split('.')[1]).split(' :: ')[0].strip()
for eid, v in OI.items():
    if not v.get('yuklendi'): continue
    bas = oi_baslik(v)
    raf, alt = oi_raf(v['book'], bas, v['dil'], v.get('kategori'), v['v'])
    den = v['denetim']
    E[eid] = {'id': eid, 'ad': '', 'ad_ar': bas, 'muellif': '', 'muellif_ar': (v.get('muellif') or '').split(' :: ')[0].strip(), 'vefat': v.get('vefat'), 'donem': donem(v.get('vefat')),
              'alt': alt, 'kaynak': 'OpenITI', 'ref': v['v'], 'nesir': '', 'b': den['bolum'], 'kb': v.get('kb'), 'raf': raf}
KOPYA = {a['book']: f"sh{a['shamela']}" for a in SEC['kopya'] if a.get('shamela')}
def oi_kimlik(book): return 'oi' + hashlib.sha1(book.encode()).hexdigest()[:8]
# başlık dizini (Şâmile) — Quranpedia ve tefsir eşleştirmesi için
IND = collections.defaultdict(list)
for e in E.values():
    if e['kaynak'] == 'Şâmile':
        for w in norm(e['ad_ar']): IND[w].append(e['id'])
def sh_bul(ad, vefat):
    a = norm(ad); say = collections.Counter(i for w in a for i in IND.get(w, []) if len(IND[w]) < 400)
    en = None
    for i, _ in say.most_common(30):
        e = E[i]; j = jac(a, norm(e['ad_ar']))
        ikisi = vefat and e['vefat']
        if ikisi and abs(vefat - e['vefat']) > 2: continue
        if j >= (0.75 if ikisi else 0.9) and len(a) >= 2 and (not en or j > en[1]): en = (i, j)
    return en[0] if en else None

Y = {}; TEFSIR_ESKI = []; istat = collections.Counter()
for f in glob.glob('/home/claude/lib/raf/eski_raflar/*.json'):
    raf0 = os.path.basename(f)[:-5]
    if raf0 in ('dinler', 'dizin') or raf0 not in {'tefsir', 'hadis', 'fikih', 'kelam', 'tasavvuf', 'tarih', 'lugat', 'ulum', 'felsefe'}: continue
    R = json.load(open(f))
    if R.get('version') == 2: raise SystemExit(f'{f} zaten yeni biçimde; eski rafları git ile geri alın')
    for e in R['eserler']:
        if raf0 == 'tefsir':
            t = sh_bul(e['ad_ar'], e.get('vefat'))
            if t: e['tam'] = t; istat['tefsir→sh'] += 1
            TEFSIR_ESKI.append(e); continue
        hedef = None
        if e.get('kaynak') == 'OpenITI':
            book = '.'.join(e['ref'].split('.')[:2])
            hedef = KOPYA.get(book) or (oi_kimlik(book) if oi_kimlik(book) in E else None)
            if not hedef:
                m = re.search(r'Shamela0*(\d+)', e['ref'])
                if m and f'sh{m.group(1)}' in E and jac(norm(e['ad_ar']), norm(E[f'sh{m.group(1)}']['ad_ar'])) >= 0.3: hedef = f'sh{m.group(1)}'
            if not hedef: hedef = sh_bul(e['ad_ar'], e.get('vefat'))
        else:
            hedef = sh_bul(e['ad_ar'], e.get('vefat'))
        if hedef and hedef in E:
            Y[e['id']] = hedef; istat[f"{e.get('kaynak')}→{hedef[:2]}"] += 1
            h = E[hedef]
            if not h['ad']: h['ad'] = e['ad']; h['muellif'] = e['muellif']
        else:
            istat[f"{e.get('kaynak')} korundu"] += 1
            e = dict(e); e['raf'] = {'u': 'ulum', 'q': 'ulum', 'r': 'tabakat' if e.get('alt') == 'r' else 'tarih'}.get(e['id'][0], raf0)
            if e.get('alt') in ('n', 'g', 'l') and raf0 == 'lugat': e['raf'] = 'lugat'
            E[e['id']] = e
# Türkçe adlar (library/raf/tr_adlar.json: eser id → ad, "müellif|vefat" → ad)
TRA = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'raf', 'tr_adlar.json')))
for e in E.values():
    if not e.get('ad'): e['ad'] = TRA['eser'].get(e['id'], '')
    if not e.get('muellif') and e.get('muellif_ar'):
        e['muellif'] = TRA['muellif'].get(f"{e['muellif_ar']}|{e.get('vefat') or ''}") or TRA['muellif'].get(f"{e['muellif_ar']}|", '')
    istat['tr_ad_' + ('var' if e.get('ad') else 'yok')] += 1; istat['tr_muellif_' + ('var' if e.get('muellif') or not e.get('muellif_ar') else 'yok')] += 1
# yazım
ALT_ESKI = {'h': 'Hadis kitapları', 'f': 'Fıkıh', 'u': 'Usûl-i fıkıh', 'k': 'Akaid', 's': '', 't': 'Tarih', 'y': 'Siyer', 'c': 'Coğrafya ve rıhle', 'r': '', 'l': 'Dil', 'n': 'Nahiv ve sarf',
            'q': 'Kıraat ve tecvid', 'U': "Ulûmü'l-Kur'ân", 'a': "Ulûmü'l-Kur'ân", 'g': 'Garîb ve sözlükler', 'p': 'Felsefe', 'm': 'Mantık'}
DON = [['erken', 'Erken dönem', 'h. I–III. asır'], ['klasik', 'Klasik dönem', "h. 311–656 · Bağdat'ın düşüşüne kadar"], ['orta', 'Orta dönem', 'h. 657–922 · Memlükler ve beylikler'],
       ['osmanli', 'Osmanlı dönemi', 'h. 923–1342'], ['modern', 'Modern dönem', 'h. 1343 sonrası ve çağdaş eserler']]
tam_tefsir = {e['tam'] for e in TEFSIR_ESKI if e.get('tam')}
raf_e = collections.defaultdict(list); RI = {}
for e in E.values():
    if e['id'] in tam_tefsir: RI[e['id']] = 'tefsir'; continue  # ayet ayet kaydın tam metni; rafta ayrıca gösterilmez
    raf = e.pop('raf')
    if len(e.get('alt') or '') == 1: e['alt'] = ALT_ESKI.get(e['alt'], '')
    raf_e[raf].append(e); RI[e['id']] = raf
for e in TEFSIR_ESKI: raf_e['tefsir'].append(e); RI[e['id']] = 'tefsir'
NOT = 'Eserler Şâmile veritabanından (sürüm 1448) olduğu gibi alındı; Şâmile\'de bulunmayanlar OpenITI ve Quranpedia nüshalarından eklendi. Her eserin tek nüshası rafta. Metinler sayfa sayfa denetlendi.'
for raf, ad, ar in RAFLAR:
    L_ = sorted(raf_e.get(raf, []), key=lambda e: (e.get('vefat') or 9999, e['ad_ar']))
    for e in L_:
        for k in [k for k, v in e.items() if v in ('', None) and k not in ('ad', 'muellif')]: e.pop(k)
    json.dump({'version': 2, 'tur': raf, 'ad': ad, 'ad_ar': ar, 'donemler': DON, 'eserler': L_, 'not': NOT}, open(f'{OUT}/{raf}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print(raf, len(L_), collections.Counter(e.get('alt', '') for e in L_).most_common(8))
SAY = collections.Counter(RI[i] for i in RI if i not in tam_tefsir)
json.dump([[r, ad, ar, SAY[r]] for r, ad, ar in RAFLAR], open(f'{OUT}/raflar.json', 'w'), ensure_ascii=False)
json.dump({'raflar': RAFLAR, 'r': RI, 'y': Y}, open(f'{OUT}/dizin.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(dict(istat), 'toplam', len(RI))
