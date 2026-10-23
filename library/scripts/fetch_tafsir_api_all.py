"""QUL/tafsir_api: bütün dillerdeki tefsirleri indir (paralel, kaldığı yerden sürer)."""
import json, os, time, urllib.request, gzip, threading, queue
B = 'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir'
e = json.load(open('/home/claude/lib/raw/tafsir_api/editions.json'))
q = queue.Queue()
for x in e:
    d = f"/home/claude/lib/raw/tafsir_api/{x['slug']}"; os.makedirs(d, exist_ok=True)
    for s in range(1, 115):
        if not os.path.exists(f'{d}/{s}.json.gz'): q.put((x['slug'], s))
print(q.qsize(), 'dosya', flush=True)
lock = threading.Lock(); fail = []
def w():
    while True:
        try: slug, s = q.get_nowait()
        except queue.Empty: return
        p = f'/home/claude/lib/raw/tafsir_api/{slug}/{s}.json.gz'
        for a in range(3):
            try:
                data = urllib.request.urlopen(f'{B}/{slug}/{s}.json', timeout=60).read()
                with gzip.open(p, 'wb') as f: f.write(data)
                break
            except Exception as ex:
                err = ex
                if '404' in str(ex): break
                time.sleep(2)
        else:
            with lock: fail.append((slug, s, str(err)))
ts = [threading.Thread(target=w) for _ in range(12)]
[t.start() for t in ts]; [t.join() for t in ts]
print('ALL DONE', 'fail', len(fail), flush=True)
