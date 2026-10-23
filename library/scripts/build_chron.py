"""Sure sıralamaları: birincil metinlerden (OpenITI) sure dizilerini çıkarır.
Her sıralama: {id, ad, tur (nuzul|mushaf), kaynak, eser, yer (dosya + satır), dizi [mushaf no], eksik, notlar}
Çıktı: /home/claude/lib/raw/chronology/siralamalar.json ve rapor."""
import json, re, sys
sys.path.insert(0, '/home/claude/lib/scripts')
from chron_names import coz, norm, koru
SRC = '/home/claude/lib/raw/chronology/src'


def satirlar(f, a, b):
    L = open(f'{SRC}/{f}', encoding='utf8').read().split('\n')[a - 1:b]
    return ' '.join(x.replace('~~', ' ').lstrip('# ') for x in L)


def ayikla(metin, ayrac, ozel=None, atla=()):
    parca = [p for p in re.split(ayrac, koru(metin)) if p.strip()]
    dizi, cozulemeyen = [], []
    for p in parca:
        pn = norm(p)
        if not pn or any(a in pn for a in atla):
            continue
        n = (ozel or {}).get(pn) or coz(p)
        if n is None:
            cozulemeyen.append(pn)
        elif n not in dizi:
            dizi.append(n)
    return dizi, cozulemeyen


def kes(m, bas, son):
    i = m.index(bas) + len(bas)
    j = m.index(son, i)
    return m[i:j]


OUT = []
rapor = []


def ekle(id_, ad, tur, kaynak, eser, yer, dizi, coz_yok, notlar=''):
    eksik = [n for n in range(1, 115) if n not in dizi]
    OUT.append({'id': id_, 'ad': ad, 'tur': tur, 'kaynak': kaynak, 'eser': eser, 'yer': yer, 'dizi': dizi, 'eksik': eksik, 'notlar': notlar})
    rapor.append(f"{id_}: {len(dizi)} sure, eksik {eksik}, çözülemeyen {coz_yok[:12]}")


# 1) İbn Abbas (İbnü'd-Ḍurays, Feḍâilü'l-Kur'ân; Atâ el-Horasânî → İbn Abbas)
F = '0294IbnDurays.FadailQuran.Shamela0009317-ara1'
m = satirlar(F, 170, 200)
mek = kes(m, 'وكان أول ما أنزل من القرآن:', 'فهذا ما أنزل الله')
med = kes(m, 'ثم أنزل بالمدينة', 'فذلك ثمان وعشرون')
ozel = {'الحواريون': 61, 'يا أيها النبي إذا طلقتم': 65, 'والفجر وليال عشر': 89, 'ق والقرآن': 50, 'ص والقرآن': 38, 'يس والقرآن': 36, 'والنجم إذا هوى': 53, 'عبس وتولى': 80,
        'أعوذ برب الفلق': 113, 'أعوذ برب الناس': 114}
d1, c1 = ayikla(mek, r'ثم|،', ozel)
d2, c2 = ayikla(med, r'ثم|،', ozel)
ekle('ibn_abbas', 'İbn Abbas', 'nuzul', "İbnü'd-Ḍurays (ö. 294), Feḍâilü'l-Kur'ân — Atâ el-Horasânî kanalıyla İbn Abbas'tan", 'oi:0294IbnDurays.FadailQuran.Shamela0009317-ara1',
     f'{F}, satır 170–200 (basılı s. 33–34)', d1 + [x for x in d2 if x not in d1], c1 + c2, 'Mekke 86, Medine 28 sure. Süyûtî, el-İtkân (nevʿ 1) aynı rivayeti İbnü\'d-Ḍurays\'tan aktarır.')

# 2) Zührî, Tenzîlü'l-Kur'ân
F = '0124IbnShihabZuhri.TanzilQuran.JK000872-ara2'
m = satirlar(F, 1, 400)
mek = kes(m, 'فأول ما أنزل الله بمكة', 'ثم يأتي ما أنزل بالمدينة')
mek = re.sub(r'ترتيب التنزيل ترتيب المصحف', ' ', mek)
med = kes(m, 'وهي هذه', 'وهي آخر ما نزل')
med = re.sub(r'ترتيب التنزيل ترتيب المصحف', ' ', med)
d1, c1 = ayikla(mek, r'ثم', {'نون': 68, 'المص': 7, 'يسن': 36})
d2, c2 = ayikla(med, r'ثم|فأول ما أنزل بالمدينة', {'المتحرم': 66, 'محمد صلى الله عليه وسلم': 47})
ekle('zuhri', 'Zührî', 'nuzul', "İbn Şihâb ez-Zührî (ö. 124), Tenzîlü'l-Kur'ân — Sülemî rivayeti", 'oi:0124IbnShihabZuhri.TanzilQuran.JK000872-ara2', f'{F}, s. 23–31',
     d1 + [x for x in d2 if x not in d1], c1 + c2, "Mekke 85, Medine 29 sure. Medine listesi Fâtiha ile başlar; 5. sırada el-Ahzâb yerine el-A'râf yazılıdır (İbnü'n-Nedîm listesinde de böyle); A'râf Mekke listesinde de geçtiği için ikinci geçiş sayılmadı, bu yüzden Ahzâb eksik görünür.")

# 3) Übey b. Kâ'b mushafı (Süyûtî, el-İtkân, nevʿ 18; İbn Eşte, el-Meṣâḥif)
F = '0911Suyuti.Itqan.JK001295-ara1'
m = satirlar(F, 3696, 3720)
m = kes(m, 'هذا تأليف مصحف أبي', 'ثم الناس') + ' ثم الناس'
d, c = ayikla(m, r'ثم', {'الحمد': 1, 'الزمر أولها حم': 39, 'الصمد': 112, 'سورة أهل الكتاب وهي لم يكن': 98}, atla=('الخلع', 'الحفد'))
ekle('ubey', 'Übey b. Kâ\'b mushafı', 'mushaf', "Süyûtî (ö. 911), el-İtkân, nevʿ 18 — İbn Eşte (ö. 360), Kitâbü'l-Meṣâḥif'ten", 'oi:0911Suyuti.Itqan.JK001295-ara1', f'{F}, satır 3704–3729 (s. 174–175)',
     d, c, 'Hal\' ve Hafd duaları da sure olarak sayılmıştır; burada atlandı.')

# 4) İbn Mes'ûd mushafı (aynı yer)
m = satirlar(F, 3721, 3744)
m = kes(m, 'تأليف مصحف عبد الله بن مسعود', 'وليس فيه الحمد')
m = re.sub(r'الطوال|والمئين|والمثاني|والمفصل', ' و ', m)
d, c = ayikla(m, r'\s+و\s*(?=\S)|@QB@|@QE@', {'الحواميم': None, 'حم المؤمن': 40, 'السجدة': 41, 'تنزيل السجدة': 32, 'إنا أرسلنا': 71, 'ألم تر كيف': 105, 'سبح': 87, 'اقرأ باسم ربك': 96,
                                              'ون': 68, 'ن': 68, 'القلم': 68, 'الكوثر': 108})
ekle('ibn_mesud', 'İbn Mes\'ûd mushafı', 'mushaf', "Süyûtî, el-İtkân, nevʿ 18 — İbn Eşte, Kitâbü'l-Meṣâḥif'ten (Cerîr b. Abdülhamîd)", 'oi:0911Suyuti.Itqan.JK001295-ara1', f'{F}, satır 3729–3743 (s. 175–176)',
     d, c, 'Fâtiha ile Muavvizeteyn bu mushafta yoktur (metinde açıkça belirtilir).')

# 5) Hz. Ali mushafı (Ya'kûbî, Târîḫ: yedi cüz)
F = '0292Yacqubi.Tarikh.JK001493-ara1.mARkdown'
m = satirlar(F, 8113, 8150)
cuzler = re.findall(r'الجزء (?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع)(.*?)فذلك جزء', m)
dizi, cy, gruplar = [], [], []
oz = {'سبحان': 17, 'واقترب': 21, 'اقترب': 21, 'موسى وفرعون': 28, 'الشريعة': 45, 'الملائكة': 35, 'الم تنزيل': 32, 'الم تنزيل السجدة': 32, 'السجدة': 32, 'حم السجدة': 41, 'طس': 27, 'طس النمل': 27,
      'النمل': 27, 'المعوذتين': None, 'ألهاكم': 102, 'أرأيت': 107, 'تبت': 111}
for k, cz in enumerate(cuzler):
    cz = cz.replace('و @QB@', '|').replace('@QE@', '|')
    dz, c = ayikla(cz, r'\|| و(?=[^\s])|\s+و\s+', oz)
    if k == 6:
        dz += [113, 114]  # "والمعوذتين"
    gruplar.append(dz)
    dizi += [x for x in dz if x not in dizi]
    cy += c
ekle('ali', 'Hz. Ali mushafı', 'mushaf', "Ya'kûbî (ö. 292), Târîḫ — Hz. Ali'nin yedi cüzlük tertibi", 'oi:0292Yacqubi.Tarikh.JK001493-ara1', f'{F}, satır 8113–8143 (c. 2, s. 135)',
     dizi, cy, 'Yedi cüz; cüz içi sıra rivayetteki sıradır. Cüzler: ' + ' / '.join(str(len(g)) for g in gruplar))
OUT[-1]['gruplar'] = gruplar

# 6) Zencânî, Târîḫu'l-Ḳur'ân (1935): numaralı tablolar (Şehristânî ve İbnü'n-Nedîm aktarımları)
F = '1360AbuCabdAllahZanjani.TarikhQuran.Hindawi091931968-ara1'
ZL = open(f'{SRC}/{F}', encoding='utf8').read().split('\n')


def zliste(a, b, bas=None, ozel=None, atla=(), ilk=1, tashih=None):
    t = ' '.join(l.replace('~~', ' ').lstrip('# ').strip() for l in ZL[a - 1:b] if l.strip())
    if bas:
        t = t[t.index(bas) + len(bas):]
    t = re.sub(r'ms\d+|PageV\d+P\d+', ' ', t)
    toks = re.findall(r'(\d{1,3})\s+([^\d]+?)(?=\s+\d{1,3}\s|\s*$)', t)
    beklenen, dizi, cy, ham = ilk, [], [], []
    for n, ad in toks:
        if int(n) != beklenen:
            continue
        beklenen += 1
        ad = ad.strip()
        ham.append(ad)
        if tashih and int(n) in tashih:
            dizi.append(tashih[int(n)])
            continue
        if any(x in ad for x in atla):
            continue
        k = (ozel or {}).get(norm(ad)) or coz(koru(ad))
        if k is None:
            cy.append(ad)
        elif k not in dizi:
            dizi.append(k)
    return dizi, cy, ham


d, c, h = zliste(5170, 5640, 'كما ذكره الشهرستاني في مقدمة تفسيره.', {'محمد صلى الله عليه وسلم': 47})
ekle('cafer', "Ca'fer es-Sâdık mushafı", 'nuzul', "Şehristânî (ö. 548), Mefâtîḥu'l-esrâr mukaddimesi — Zencânî (ö. 1360), Târîḫu'l-Ḳur'ân aktarımıyla", 'oi:' + F,
     f'{F}, satır 5170–5640', d, c, "Nüzul sırasına göre tertip edilmiş mushaf. Şehristânî'nin kendi tablosu OpenITI'deki OCR nüshada okunamıyor; liste Zencânî'den.")
d, c, h = zliste(4685, 5170, 'وهو سند أمين.', {'تبت يدا': 111}, tashih={77: 78})
ekle('ibn_abbas_sehristani', 'İbn Abbas mushafı (Şehristânî)', 'nuzul', "Şehristânî, Mefâtîḥu'l-esrâr mukaddimesi — Zencânî aktarımıyla", 'oi:' + F,
     f'{F}, satır 4685–5170', d, c, "İbnü'd-Ḍurays rivayetinden farklı bir İbn Abbas tertibi. Tashih: 77. sırada metinde 'en-Nisâ' yazılı; Nisâ Medine listesinde ayrıca geçtiği ve bu sırada diğer rivayetlerde en-Nebe' bulunduğu için en-Nebe' (78) okundu.")
d, c, h = zliste(2632, 3134, 'في مكة هو:', {'حم الشريعة': 45})
d2, c2, h2 = zliste(2990, 3134, 'نزل بالمدينة:', ilk=90)
d, c = d + [x for x in d2 if x not in d], c + c2
ekle('ibn_nedim', 'İbnü\'n-Nedîm (nüzul)', 'nuzul', "İbnü'n-Nedîm (ö. 385?), el-Fihrist — Muhammed b. Nu'mân b. Beşîr isnadıyla; Zencânî aktarımı", 'oi:' + F,
     f'{F}, satır 2632–3134', d, c, "Mekke 86, Medine 27 sure (Zencânî Medine kısmını 90'dan numaralar). Medine listesinde el-Ahzâb yerine el-A'râf geçer. el-Fihrist'in OpenITI'de nüshası yok; liste Zencânî'den.")
t = ' '.join(l.replace('~~', ' ').lstrip('# ') for l in ZL[6075:6086])
nums = [int(x) for x in re.findall(r'\d+', t.split('على رأي نولدكه')[0])] + [int(x) for x in re.findall(r'\d+', re.sub(r'ms\d+', '', t.split('على رأي نولدكه')[1]))]
dz = []
for x in nums:
    if 1 <= x <= 114 and x not in dz:
        dz.append(x)
ekle('ibn_abdulkafi', 'İbn Abdülkâfî', 'nuzul', "Ebü'l-Kâsım Ömer b. Muhammed b. Abdülkâfî (5. yy) — Nöldeke ve Zencânî aktarımıyla", 'oi:' + F,
     f'{F}, satır 6074–6085', dz, [], "Nöldeke'nin Geschichte des Qorāns'ta esas aldığı geleneksel liste; Zencânî bunu 'Nöldeke'ye göre' başlığıyla verir.")

json.dump(OUT, open('/home/claude/lib/raw/chronology/siralamalar.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\n'.join(rapor))
