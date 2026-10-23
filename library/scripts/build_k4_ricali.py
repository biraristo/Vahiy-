"""Katman 4: râvi biyografileri — büyük ricâl ve tabakât kitapları (OpenITI, CC BY-NC-SA).
Her kitabın '### $' madde başları ayrıştırılır; Quranpedia râvisi, Takrîb eşleşmesi varsa Takrîb'deki tam adın
ilk dört kelimesiyle, yoksa kendi adıyla aranır (ad parçaları maddenin ilk 14 kelimesinde ardışık geçmeli).
Çıktı: site/data/k4/r/{râvi_id}.json.gz ve raviler.json'a 'biyografi' sayısı."""
import json, gzip, re, zipfile, os, collections
RAW = '/home/claude/lib/raw'
OUT = '/home/claude/vahiy-/site/data/k4'
os.makedirs(f'{OUT}/r', exist_ok=True)
z = zipfile.ZipFile(f'{RAW}/openiti_pri_data.zip')
BOOKS = [
    ('tabakat', '0230IbnSacd.TabaqatKubra.ShamAY0035884-ara1.mARkdown', "et-Tabakātü'l-kübrâ", 'İbn Sa\'d', 230),
    ('tehzibulkemal', '0742Mizzi.TahdhibKamal.Shamela0003722-ara1.mARkdown', "Tehzîbü'l-Kemâl", 'Mizzî', 742),
    ('mizan', '0748Dhahabi.MizanIctidal.JK001293BK1-ara1.mARkdown', "Mîzânü'l-i'tidâl", 'Zehebî', 748),
    ('siyer', '0748Dhahabi.SiyarAclamNubala.Shamela0010906-ara1.mARkdown', "Siyeru a'lâmi'n-nübelâ", 'Zehebî', 748),
    ('kasif', '0748Dhahabi.Kashif.Shia003276Vols-ara1.mARkdown', 'el-Kâşif', 'Zehebî', 748),
    ('isabe', '0852IbnHajarCasqalani.IsabaFiTamyiz.JK000533-ara1.mARkdown', "el-İsâbe fî temyîzi's-sahâbe", 'İbn Hacer', 852),
    ('tehzibuttehzib', '0852IbnHajarCasqalani.TahdhibTahdhib.JK000134-ara1.mARkdown', "Tehzîbü't-Tehzîb", 'İbn Hacer', 852),
]
HAR = re.compile(r'[ً-ٰٟـ]')
def nz(x):
    x = HAR.sub('', x).translate(str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ة': 'ه'}))
    w = re.sub(r'[^ء-ي ]', ' ', x).split()
    return [t for t in w if len(t) > 1 and t not in {'صد', 'تمييز', 'ماجه', 'ابي', 'داود', 'والنسائي', 'والترمذي', 'مسلم', 'البخاري'} or t in ('ابي',)]
R = json.load(open(f'{OUT}/raviler.json'))
RV = R['raviler']
NOTE = {'بفتح', 'بضم', 'بكسر', 'بالتصغير', 'وسكون', 'وفتح', 'وضم', 'وكسر', 'المهمله', 'المعجمه', 'الموحده', 'بالمهمله', 'بالمعجمه', 'بالتحتانيه', 'التحتانيه', 'ثم', 'وتشديد', 'بعدها', 'مصغر', 'مكبر', 'الجيم', 'الحاء', 'الراء', 'الزاي', 'السين', 'الشين', 'الصاد', 'الدال', 'النون', 'الميم', 'اللام', 'الواو', 'الياء', 'الهاء', 'الفاء', 'القاف', 'الكاف', 'العين', 'الغين', 'الطاء', 'الظاء', 'الضاد', 'الذال', 'الخاء', 'الثاء', 'التاء', 'الباء', 'الهمزه', 'المثلثه', 'المثناه', 'الفوقانيه'}
keys = {}
for rid, r in RV.items():
    base = (r.get('takrib') or {}).get('metin') or r['ad']
    w = [x for x in nz(base) if x not in NOTE] if r.get('takrib') else nz(r['ad'])
    keys[rid] = (w[:6], w[:4]) if r.get('takrib') else (w, w)
found = collections.defaultdict(list); stat = {}
for key, fn, ad, mu, vf in BOOKS:
    t = z.read(fn).decode('utf8', 'replace').split('#META#Header#End#', 1)[-1].replace('\n~~', ' ')
    t = re.sub(r'PageV\d+P\d+|ms\d+', ' ', t)
    ms = list(re.finditer(r'\n### \$ ?([^\n]*)', t))
    ents = []
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(t)
        body = ' '.join(t[m.start():end].replace('###', ' ').replace('$', ' ').split())
        num = re.match(r'\s*\[?\s*(\d+)', m.group(1))
        w = nz(m.group(1))
        LEAD = {'بن', 'ابي', 'داود', 'والنسائي', 'والترمذي', 'الترمذي', 'النسائي', 'ماجه', 'مسلم', 'البخاري', 'الاربعه', 'الجماعه', 'تمييز', 'صد', 'بخ', 'مد', 'تم', 'قد', 'خت', 'سي', 'عس', 'كن', 'فق', 'ل', 'ر', 'ي'}
        while w and w[0] in LEAD:
            w = w[1:]
        ents.append((num.group(1) if num else str(i + 1), body, w[:16]))
    idx = collections.defaultdict(list)
    for e in ents:
        for w in set(e[2][:6]):
            idx[w].append(e)
    n = 0
    for rid, (k6, k4) in keys.items():
        if not k6:
            continue
        cand = []
        guc = 'güçlü'
        for k in (k6, k4):
            cand = [e for e in idx.get(k[0], []) if e[2][:len(k)] == k]
            if cand:
                break
            guc = 'zayıf'
        if len(k6) < 5 or len(cand) > 1:
            guc = 'zayıf'
        if 0 < len(cand) <= 3:
            for e in cand:
                found[rid].append({'kitap': key, 'no': e[0], 'metin': e[1][:6000] + ('…' if len(e[1]) > 6000 else ''), 'aday': len(cand), 'guven': guc})
            n += 1
    stat[key] = {'madde': len(ents), 'eslesen_ravi': n}
    print(key, stat[key], flush=True)
META = {k: {'ad': ad, 'muellif': mu, 'vefat': vf, 'openiti': fn.replace('.mARkdown', '')} for k, fn, ad, mu, vf in BOOKS}
for rid, L in found.items():
    with gzip.open(f'{OUT}/r/{rid}.json.gz', 'wt', encoding='utf8') as f:
        json.dump({'ravi': rid, 'biyografiler': L}, f, ensure_ascii=False, separators=(',', ':'))
    RV[rid]['biyografi'] = len(L)
R['ricâl_kitaplari'] = META; R['ricâl_istatistik'] = stat
R['ricâl_yontem'] = "makine: Takrîb'deki tam adın ilk dört kelimesi (yoksa Quranpedia adı) madde başında aranır; 3'ten fazla aday çıkarsa bağlanmaz"
json.dump(R, open(f'{OUT}/raviler.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(found), 'râvi biyografiye bağlandı /', len(RV))
