"""Katman 7 (ara çıktı): tefsir pasajlarından ihtilaf kayıtları.
Bir pasajda ihtilaf kalıbı (اختلف، قولان، أقوال، وجهان، أوجه، "وقيل") geçerse, kalıbın etrafındaki cümle parçası alınır.
Mekanik bir tespittir; görüşlerin kendisini değil, ihtilafın kaydedildiği yeri gösterir. Eser başına ayet başına en fazla 2 kayıt."""
import json, gzip, re, os, collections
K2 = '/home/claude/vahiy-/site/data/k2'
OUT = '/home/claude/lib/k7tmp'
os.makedirs(OUT, exist_ok=True)
E = json.load(open(f'{K2}/eserler.json'))['eserler']
AY = [x['ayet'] for x in json.load(open('/home/claude/vahiy-/site/data/k0/surahs.json'))['sureler']]
HAR = re.compile(r'[ً-ٰٟـ]')
PAT = re.compile(r'(اختلف(?:ت|وا)?\s+(?:أهل التأويل|أهل العلم|العلماء|المفسرون|القراء|الناس|السلف|الفقهاء|أهل اللغة|النحويون)?|(?:فيه|وفيه|ففيه|على)\s+(?:قولان|قولين|ثلاثة أقوال|أربعة أقوال|أقوال|وجهان|وجهين|ثلاثة أوجه|أوجه)|في (?:ذلك|معناه|تأويله|هذا) (?:قولان|أقوال|وجهان|أوجه)|والقول الثاني|القول الثالث)')
KIND = [('اختلف', 'ihtilaf'), ('قول', 'aqwal'), ('أقوال', 'aqwal'), ('وجه', 'vucuh'), ('أوجه', 'vucuh')]
stat = collections.Counter()
for s in range(1, 115):
    res = {}
    for a in range(1, AY[s - 1] + 1):
        P = json.load(gzip.open(f'{K2}/t/{s}/{a}.json.gz'))['p']
        per = collections.Counter(); out = []
        for r in P:
            if not isinstance(r[3], str) or E.get(r[0], {}).get('tur') != 'tefsir' or per[r[0]] >= 2:
                continue
            txt = HAR.sub('', r[3])
            m = None
            for mm in PAT.finditer(txt):
                ctx = txt[max(0, mm.start() - 120):mm.end() + 120]
                if any(x in ctx for x in ('في نسخة', 'سنة وفاته', 'اختلف الخط', 'في (ب)', 'في (أ)', 'المخطوط')):
                    continue  # muhakkik dipnotu
                m = mm; break
            if not m:
                continue
            st = max(txt.rfind('.', 0, m.start()) + 1, txt.rfind('\n', 0, m.start()) + 1, m.start() - 220)
            en = min(len(txt), m.end() + 650)
            ex = txt[st:en].strip().replace('\n§ ', ' — ').replace('\n', ' ')
            k = next((v for key, v in KIND if key in m.group(0)), 'ihtilaf')
            out.append([r[0], r[1], r[2], k, ex + ('…' if en < len(txt) else '')]); per[r[0]] += 1; stat[k] += 1
        out.sort(key=lambda x: E[x[0]].get('vefat') or 9999)
        if out:
            res[f'{s}:{a}'] = out
    json.dump(res, open(f'{OUT}/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    stat['ayet'] += len(res)
print(dict(stat))
