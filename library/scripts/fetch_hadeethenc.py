"""HadeethEnc (Hadis Ansiklopedisi, hadeethenc.com) — açık API: bütün hadisler, Arapça asıl + Türkçe çeviri/şerh.
Çıktı: /home/claude/lib/raw/hadeethenc/{ar,tr}/{id}.json, kategoriler.json"""
import json, os, time, urllib.request, threading, queue
B = 'https://hadeethenc.com/api/v1'
O = '/home/claude/lib/raw/hadeethenc'
for l in ('ar', 'tr'): os.makedirs(f'{O}/{l}', exist_ok=True)
H = {'User-Agent': 'vahiy-plus-plus kisisel arastirma'}
def get(u):
    for t in range(4):
        try: return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=60).read())
        except Exception as e: err = e; time.sleep(2)
    raise err
cats = {l: get(f'{B}/categories/list/?language={l}') for l in ('ar', 'tr')}
json.dump(cats, open(f'{O}/kategoriler.json', 'w'), ensure_ascii=False)
ids = {}
for c in cats['ar']:
    page = 1
    while True:
        d = get(f'{B}/hadeeths/list/?language=ar&category_id={c["id"]}&page={page}&per_page=100')
        for x in d.get('data') or []: ids.setdefault(x['id'], x.get('translations') or [])
        meta = d.get('meta') or {}
        if page >= int(meta.get('last_page') or 1): break
        page += 1
print(len(ids), 'hadis', flush=True)
q = queue.Queue()
for i, tr in ids.items():
    for l in ('ar', 'tr'):
        if (l == 'ar' or 'tr' in tr) and not os.path.exists(f'{O}/{l}/{i}.json'): q.put((l, i))
def w():
    while True:
        try: l, i = q.get_nowait()
        except queue.Empty: return
        try: json.dump(get(f'{B}/hadeeths/one/?language={l}&id={i}'), open(f'{O}/{l}/{i}.json', 'w'), ensure_ascii=False)
        except Exception as e: print('FAIL', l, i, e, flush=True)
ts = [threading.Thread(target=w) for _ in range(8)]; [t.start() for t in ts]; [t.join() for t in ts]
print('bitti', len(os.listdir(f'{O}/ar')), len(os.listdir(f'{O}/tr')), flush=True)
