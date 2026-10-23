"""Katman 8: akademik literatür. Makale künyesi + kısa özet + bağlantı (tam metin yok).
Bağ yöntemi makinedir (başlık/özetteki ayet veya sure atfı). Çıktı: site/data/k8/{sure}.json"""
import json, os, collections
A = '/home/claude/vahiy-/library/articles'
OUT = '/home/claude/vahiy-/site/data/k8'
os.makedirs(OUT, exist_ok=True)
arts = [json.loads(l) for l in open(f'{A}/articles.jsonl')]
for s in range(1, 115):
    ay = collections.defaultdict(list); su = []
    for a in arts:
        if s in a['surahs']:
            hit = [k for k in a['ayahs'] if k.startswith(f'{s}:')]
            for k in hit:
                ay[k].append(a['id'])
            if not hit:
                su.append(a['id'])
    ids = {i for v in ay.values() for i in v} | set(su)
    rec = {i: {k: arts[i][k] for k in ('title', 'authors', 'journal', 'year', 'abstract', 'url', 'ayahs')} for i in ids}
    json.dump({'version': 'k8-2026.10.23', 'yontem': 'makine: başlık/özetteki ayet ve sure atıfları (Crossref)', 'ayet': ay, 'sure': su, 'makale': rec},
              open(f'{OUT}/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('ok')
