"""Kütüphane fihristi: bölüm başlığı (konu) × o bölümde alıntılanan ayetler.
Girdi: /home/claude/lib/fihrist/dizinler.json (dizin_indir.py), /home/claude/lib/atif/r2/kitap/{id}.json (build_kitap_atif.py)
Kural:
  - Tefsir rafı ve biyografi kitapları dışarıda (başlıkları konu değil, ayet ya da kişi).
  - Başlık temizliği: hareke, sayı, ayraç, "· Cilt" sayfa ekleri; baştaki باب/فصل/كتاب/مسألة/ذكر/ما جاء في/في… atılır.
  - Ayet metni, sure adı, kişi adı, "مقدمة/فهرس/خاتمة" gibi başlıklar atılır; 2–8 kelime arası kalır.
  - Bir konu–ayet bağı, en az 2 ayrı eserin aynı konulu bölümünde o ayet alıntılanmışsa kabul edilir; konu en az 3 eserde geçmeli.
Çıktı: site/data/fh2/konu.json  = {"k": [[başlık, eser_sayısı, ayet_sayısı], ...]}
       site/data/fh2/a/{s}.json = {ayet: [[konu_no, eser_sayısı], ...]}  (en güçlü 20)
       site/data/fh2/k/{n//500}.json = {konu_no: [["s:a", eser_sayısı], ...]}"""
import json, re, os, gzip, collections, glob
D = json.load(open('/home/claude/lib/fihrist/dizinler.json'))
DZ = json.load(open('/home/claude/vahiy-/site/data/kutuphane/dizin.json'))
BIO = set(json.load(open('/home/claude/lib/rical/adlar.json'))['kitap'])
OUT = '/home/claude/vahiy-/site/data/fh2'
ON = r'^(?:(?:ال)?(?:باب|فصل|كتاب|مسألة|مسالة|ذكر|بيان|القول|الكلام|حديث|تنبيه|فائدة|مبحث|المبحث|المطلب|مطلب|الفصل|الباب|الفرع|فرع|جماع|أبواب|ابواب|كتب)\b\s*(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)?\s*[:：]?\s*)+'
GEREKSIZ = re.compile(r'^(مقدمة|المقدمة|تمهيد|التمهيد|خاتمة|الخاتمة|فهرس|الفهرس|المحتويات|المراجع|المصادر|ترجمة|تقديم|تقريظ|الإهداء|اهداء|شكر|المؤلف|الناشر|غلاف|وصف|منهج|نماذج|صور)')
def temiz(t):
    if not t or '·' in t: return ''
    t = re.sub(r'[ً-ْٰـ¬]', '', t)
    if re.search(r'[﴿{}]|قوله تعالى|قول الله|سورة|آية|الآية|حرف ال', t): return ''
    t = re.sub(r'[\d٠-٩]+', ' ', t)
    t = re.sub(r'[\[\]\(\)«»\*\-–:،,\.؛/"\'!؟?…]', ' ', t); t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(ON, '', t).strip()
    t = re.sub(r'^(?:في|فى|ما جاء في|ما جاء فى|ما ورد في|ما روي في|ما يذكر في|في ذكر|في بيان|في فضل|عن)\s+', '', t).strip()
    t = t.replace('ى', 'ي')   # hemze korunur: الإيمان (iman) ≠ الأيمان (yeminler)
    w = t.split()
    if not 1 <= len(w) <= 8 or len(t) < 3 or GEREKSIZ.match(t) or re.search('[A-Za-zçğıöşüÇĞİÖŞÜâîû]', t): return ''
    if re.match(r'^(مدخل|بسم الله|الحمد لله|تتمة|تكملة|تابع|ملحق|خلاصة|الخلاصة|نتائج|النتائج|توطئة|استدراك|زيادة|تعليق)', t): return ''
    if len(w) >= 3 and w[1] in ('بن', 'ابن', 'بنت'): return ''
    # harf babları (lügat/kıraat kitaplarının "الميم" bölümleri) ve kişi başlıkları konu değildir
    if re.fullmatch(r'(?:حرف )?(?:ال)?(?:ألف|الف|باء|تاء|ثاء|جيم|حاء|خاء|دال|ذال|راء|زاي|سين|شين|صاد|ضاد|طاء|ظاء|عين|غين|فاء|قاف|كاف|لام|ميم|نون|هاء|واو|ياء)(?: (?:المعجمة|المهملة))?', t): return ''
    if re.match(r'^(?:شيخ الإسلام|الشيخ|الحافظ|ابن|أبو|ابو)\s', t) and len(w) <= 4: return ''
    SIRA = r'(?:ال)?(?:[اأ]ول|[اأ]ولي|ثاني|ثانيه|ثالث|ثالثه|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر|حادي|عشر|عشرون|ثلاثون|[اأ]ربعون|خمسون|ستون|سبعون|ثمانون|تسعون|[اآ]خر|[اأ]خير|[اأ]خيره)'
    if re.match(rf'^(?:ال)?(?:دليل|شبهه|شبهة|شرط|وجه|قول|مذهب|رأي|جواب|اعتراض|مقام|مرتبه|مرتبة|درجه|درجة|طريق|الطريقه|قسم|نوع|صنف|ضرب)\s+{SIRA}', t): return ''
    if t in ('الله', 'المدخل', 'مدخل', 'وفاته', 'وفاتها', 'الوجه', 'نسبه', 'نشأته', 'مولده', 'شيوخه', 'تلاميذه', 'مؤلفاته', 'مصنفاته', 'ثناء العلماء عليه'): return ''
    if re.fullmatch(rf'(?:و?{SIRA}\s*)+', t) or re.match(r'^(?:ال)?(?:وجه|قسم|نوع|ضرب|صنف|شرط|ركن|سبب|مثال|قاعده|ضابط|اصل)\s+' + SIRA + r'$', t): return ''
    if t in ('منه', 'منها', 'تعريفه', 'تعريفها', 'حكمه', 'حكمها', 'تنبيه', 'تنبيهات', 'فوائد', 'فائده', 'الامر', 'امر', 'اخري', 'الأمر', 'أمر', 'أخرى', 'أخري', 'ومنه', 'ومنها', 'مسائل', 'المسائل', 'تفسير', 'التفسير', 'تعريف', 'التعريف', 'شرح', 'الشرح', 'اقسامه', 'انواعه', 'ادلته', 'بعد الصلاة', 'الجواب', 'السؤال', 'الرد', 'تنبيهات', 'قاعده', 'ضابط', 'فرع', 'تتمه'): return ''
    return t
K = collections.defaultdict(lambda: collections.defaultdict(set)); KE = collections.defaultdict(set)
dosya = {os.path.basename(p)[:-5]: p for p in glob.glob('/home/claude/lib/atif/r2/kitap/*.json')}
say = collections.Counter()
for i, b in D.items():
    if not b or DZ['r'].get(i) == 'tefsir' or i in BIO or i not in dosya: continue
    A = json.load(gzip.open(dosya[i]))['b']
    for si, ayetler in A.items():
        si = int(si)
        if si >= len(b): continue
        t = temiz(b[si][1])
        if not t: say['atlanan_baslik'] += 1; continue
        KE[t].add(i)
        for s, a, n, _ in ayetler: K[t][f'{s}:{a}'].add(i)
        say['bolum'] += 1
konular = []
for t, A in K.items():
    if len(KE[t]) < 3: continue
    ay = {k: len(v) for k, v in A.items() if len(v) >= 2}
    if ay: konular.append((t, len(KE[t]), ay))
konular.sort(key=lambda x: -x[1])
os.makedirs(f'{OUT}/a', exist_ok=True); os.makedirs(f'{OUT}/k', exist_ok=True)
json.dump({'k': [[t, n, len(ay)] for t, n, ay in konular], 'kaynak': 'vahiy++ kütüphanesi: bölüm başlıkları × bölümde alıntılanan ayetler', 'istatistik': dict(say)},
          open(f'{OUT}/konu.json', 'w'), ensure_ascii=False, separators=(',', ':'))
AY = collections.defaultdict(list)
parca = collections.defaultdict(dict)
for no, (t, n, ay) in enumerate(konular):
    for k, c in ay.items(): AY[k].append([no, c])
    parca[no // 500][no] = sorted(ay.items(), key=lambda x: -x[1])[:300]
for f in glob.glob(f'{OUT}/a/*.json') + glob.glob(f'{OUT}/k/*.json'): os.remove(f)
for p, v in parca.items(): json.dump(v, open(f'{OUT}/k/{p}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
SU = collections.defaultdict(dict)
for k, L in AY.items():
    s, a = k.split(':'); SU[s][a] = sorted(L, key=lambda x: (-x[1], x[0]))[:20]
for s, v in SU.items(): json.dump(v, open(f'{OUT}/a/{s}.json', 'w'), separators=(',', ':'))
print('konu', len(konular), 'ayet', len(AY), dict(say), 'örnek', [(t, n, len(ay)) for t, n, ay in konular[:25]])
