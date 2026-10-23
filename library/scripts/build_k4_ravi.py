"""Katman 4: râvi kaydı. Quranpedia (Mevsûatü't-tefsîri'l-me'sûr) râvileri ↔ İbn Hacer, Takrîbü't-Tehzîb (OpenITI).
Eşleştirme mekaniktir: ad başı birebir ya da tüm ad parçaları maddenin ilk kelimelerinde. Tek aday → 'tek', çok aday → 'aday'.
Takrîb'deki vefat yılları, İbn Hacer'in usulüne göre yüzyıl eklenerek okunur (tabaka 1–2: +0, 3–8: +100, 9–12: +200)."""
import json, gzip, re, zipfile, collections
RAW = '/home/claude/lib/raw'
OUT = '/home/claude/vahiy-/site/data/k4'
import os; os.makedirs(OUT, exist_ok=True)
z = zipfile.ZipFile(f'{RAW}/openiti_pri_data.zip')
t = z.read('0852IbnHajarCasqalani.TaqribTahdhib.JK000121-ara1.completed').decode('utf8').split('#META#Header#End#', 1)[-1]
t = re.sub(r'PageV\d+P\d+|ms\d+', ' ', t.replace('\n~~', ' '))
HAR = re.compile(r'[ً-ٰٟـ]')
def nz(x):
    x = HAR.sub('', x).translate(str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ة': 'ه'}))
    return re.sub(r'[^ء-ي ]', ' ', x).split()
ONES = {'احدي': 1, 'احد': 1, 'واحد': 1, 'اثنتين': 2, 'اثنين': 2, 'ثلاث': 3, 'ثلاثه': 3, 'اربع': 4, 'اربعه': 4, 'خمس': 5, 'خمسه': 5, 'ست': 6, 'سته': 6, 'سبع': 7, 'سبعه': 7, 'ثمان': 8, 'ثماني': 8, 'ثمانيه': 8, 'تسع': 9, 'تسعه': 9, 'عشر': 10, 'عشره': 10}
TENS = {'عشرين': 20, 'ثلاثين': 30, 'اربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'ثمانين': 80, 'تسعين': 90}
HUND = {'مايه': 100, 'ماييه': 100, 'ماءه': 100, 'مائه': 100, 'مايتين': 200, 'مائتين': 200, 'ثلاثمايه': 300, 'ثلاثمائه': 300}
TAB = {'الاولي': 1, 'الثانيه': 2, 'الثالثه': 3, 'الرابعه': 4, 'الخامسه': 5, 'السادسه': 6, 'السابعه': 7, 'الثامنه': 8, 'التاسعه': 9, 'العاشره': 10, 'الحاديه': 11, 'الثانيه عشره': 12}
GRADES = ['كذبوه', 'صحابي', 'له صحبه', 'ثقه ثبت', 'ثقه حافظ', 'ثقه', 'صدوق يهم', 'صدوق يخطئ', 'صدوق', 'لا باس به', 'مقبول', 'لين الحديث', 'مستور', 'مجهول الحال', 'مجهول', 'ضعيف', 'متروك', 'متهم', 'كذاب']
entries = []
for m in re.finditer(r'### \$ (\d+) (.*?)(?=### |\Z)', t, re.S):
    no, body = int(m.group(1)), ' '.join(m.group(2).split())
    w = nz(body); s = ' '.join(w)
    tab = None
    tm = re.search(r'من (الاولي|الثانيه عشره|الثانيه|الثالثه|الرابعه|الخامسه|السادسه|السابعه|الثامنه|التاسعه|العاشره|الحاديه)', s)
    if tm: tab = TAB[tm.group(1)]
    if 'كبار الصحابه' in s or 'صحابي' in s: tab = tab or 1
    vef = None
    dm = re.search(r'مات سنه ((?:[ء-ي]+ ?){1,6})', s)
    if dm:
        n = 0; full = False
        for x in dm.group(1).split():
            x2 = x[1:] if x.startswith('و') and x[1:] in {**ONES, **TENS, **HUND} else x
            if x2 in ONES: n += ONES[x2]
            elif x2 in TENS: n += TENS[x2]
            elif x2 in HUND: n += HUND[x2]; full = True
        if n:
            if not full and tab:
                n += 0 if tab <= 2 else 100 if tab <= 8 else 200
            vef = n if (full or tab) else None
    gr = next((g for g in GRADES if g in s), None)
    entries.append({'no': no, 'ad': ' '.join(body.split()[:14]), 'w': w[:14], 'metin': body[:900], 'derece': gr, 'tabaka': tab, 'vefat': vef})
print(len(entries), 'Takrîb maddesi')
idx = collections.defaultdict(list)
for e in entries:
    if e['w']: idx[e['w'][0]].append(e)
d = json.load(gzip.open(f'{RAW}/qp/sayings.json.gz'))['data']
cnt = collections.Counter(); names = {}; ayahs = collections.defaultdict(set)
for x in d:
    for s in x['sayings']:
        for n in s.get('narrators') or []:
            cnt[n['id']] += 1; names[n['id']] = n['name']; ayahs[n['id']].add(f"{x['surah']}:{x['ayah']}")
STOP = {'بن', 'ابن', 'ابي', 'ابو', 'مولي', 'عبد'}
out = {}; st = collections.Counter()
# meşhur adlar: Takrîb'deki tam adın başı (elle; madde metniyle doğrulandı)
ELLE = {'الحسن البصري': 'الحسن بن ابي الحسن البصري', 'إسماعيل السدي': 'اسماعيل بن عبد الرحمن بن ابي كريمه', 'عكرمة مولى ابن عباس': 'عكرمه ابو عبد الله مولي بن عباس',
        'عطاء': 'عطاء بن ابي رباح', 'عامر الشعبي': 'عامر بن شراحيل الشعبي', 'أبو هريرة': 'ابو هريره الدوسي', 'محمد بن شهاب الزهري': 'محمد بن مسلم بن عبيد الله بن عبد الله بن شهاب',
        'أبو العالية الرياحي': 'رفيع بالتصغير بن مهران', 'سفيان الثوري': 'سفيان بن سعيد بن مسروق الثوري', 'إبراهيم النخعي': 'ابراهيم بن يزيد بن قيس بن الاسود النخعي', 'محمد بن السائب الكلبي': 'محمد بن السائب بن بشر الكلبي'}
for i, nm in names.items():
    w = nz(nm)
    kind = 'ad başı'
    if nm in ELLE:
        e2 = nz(ELLE[nm]); c = [e for e in idx.get(e2[0], []) if e['w'][:len(e2)] == e2][:1]; kind = 'elle'
    else:
        c = [e for e in idx.get(w[0], []) if e['w'][:len(w)] == w]
    if not c:
        c = [e for e in idx.get(w[0], []) if all(x in e['w'] for x in w)]; kind = 'ad parçaları'
    if not c and nm in ELLE: print('ELLE BULUNAMADI', nm)
    rec = {'ad': nm, 'rivayet': cnt[i], 'ayet': len(ayahs[i])}
    if len(c) == 1:
        e = c[0]; rec['takrib'] = {k: e[k] for k in ('no', 'metin', 'derece', 'tabaka', 'vefat')}; rec['eslesme'] = f'tek ({kind})'; st['tek'] += 1
    elif c:
        rec['adaylar'] = [{k: e[k] for k in ('no', 'ad', 'derece', 'vefat')} for e in c[:4]]; rec['aday_sayisi'] = len(c); rec['eslesme'] = 'çok aday'; st['aday'] += 1
    else:
        rec['eslesme'] = 'yok'; st['yok'] += 1
    out[i] = rec
json.dump({'version': 'k4-2026.10.23', 'kaynak': {'raviler': 'Quranpedia — Mevsûatü\'t-tefsîri\'l-me\'sûr râvi listesi', 'ricâl': "İbn Hacer el-Askalânî (ö. 852), Takrîbü't-Tehzîb — OpenITI (CC BY-NC-SA)"},
           'yontem': 'makine eşleştirmesi; "çok aday" durumunda doğru kişi elle seçilmeli', 'raviler': out}, open(f'{OUT}/raviler.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(st, 'toplam', len(out))
for i in sorted(cnt, key=lambda k: -cnt[k])[:12]:
    r = out[i]; print(r['ad'], r['eslesme'], (r.get('takrib') or {}).get('derece'), (r.get('takrib') or {}).get('vefat'), (r.get('takrib') or {}).get('metin', '')[:70])
