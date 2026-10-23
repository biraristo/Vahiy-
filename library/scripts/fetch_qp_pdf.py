"""Quranpedia kitap ekleri (PDF/DOC): indir → metni çıkar → sıkıştırıp sakla → asıl dosyayı sil (disk sınırı).
Metin katmanı olmayan (taranmış) dosyalar 'ocr_kuyrugu' olarak işaretlenir; OCR ayrı betikle yapılır.
Durum: /home/claude/lib/raw/qp_pdf/durum.jsonl (her ek için bir satır). Tekrar çalıştırılınca kaldığı yerden sürer.
Kullanım: python3 fetch_qp_pdf.py [işçi_sayısı]"""
import json, gzip, os, sys, time, subprocess, urllib.request, threading, queue, unicodedata, re

RAW = '/home/claude/lib/raw'
OUT = f'{RAW}/qp_pdf'
TMP = '/home/claude/lib/pdftmp'
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
NW = int(sys.argv[1]) if len(sys.argv) > 1 else 3
PRI = ['asbab', 'nasekh', 'e3rab', 'fdael', 'amthal', 'monasbah', 'mutshabeh', 'tafsir', 'qiraat', 'book', 'translations']
books = json.load(gzip.open(f'{RAW}/qp/books.json.gz'))['data']
done = set()
SP = f'{OUT}/durum.jsonl'
if os.path.exists(SP):
    for l in open(SP):
        try:
            r = json.loads(l)
            if r.get('durum') in ('metin', 'ocr_kuyrugu') or '403' in r.get('hata', ''): done.add(r['url'])
        except Exception: pass
jobs = []
for b in sorted(books, key=lambda b: (PRI.index(b['type']) if b['type'] in PRI else 99, b['id'])):
    for at in b.get('book_attachments') or []:
        if at['url'] not in done:
            jobs.append((b['id'], b['type'], at.get('part') or 1, at['url']))
print(len(jobs), 'ek kaldı', flush=True)
lock = threading.Lock()
st = open(SP, 'a')
q = queue.Queue()
for j in jobs: q.put(j)


def fix(t):
    t = unicodedata.normalize('NFKC', t)
    return t.replace('هللا', 'الله').replace('‫', '').replace('‬', '').replace('‪', '')


def work():
    while True:
        try: bid, typ, part, url = q.get_nowait()
        except queue.Empty: return
        ext = url.rsplit('.', 1)[-1].lower()[:4]
        fn = f'{TMP}/{bid}_{part}.{ext}'
        rec = {'kitap': bid, 'tur': typ, 'cilt': part, 'url': url}
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'vahiy-plus-plus kisisel arastirma'})
            with urllib.request.urlopen(req, timeout=300) as r, open(fn, 'wb') as f:
                while True:
                    c = r.read(1 << 20)
                    if not c: break
                    f.write(c)
            rec['bayt'] = os.path.getsize(fn)
            txt = ''
            if ext == 'pdf':
                p = subprocess.run(['pdftotext', '-enc', 'UTF-8', fn, '-'], capture_output=True, timeout=900)
                txt = p.stdout.decode('utf8', 'replace')
                pi = subprocess.run(['pdfinfo', fn], capture_output=True, timeout=60).stdout.decode('utf8', 'replace')
                m = re.search(r'Pages:\s+(\d+)', pi); rec['sayfa'] = int(m.group(1)) if m else None
            elif ext in ('doc', 'docx', 'rtf'):
                subprocess.run(['soffice', f'-env:UserInstallation=file:///tmp/lo_{threading.get_ident()}', '--headless', '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', TMP, fn], capture_output=True, timeout=600)
                tp = fn.rsplit('.', 1)[0] + '.txt'
                if os.path.exists(tp):
                    txt = open(tp, encoding='utf8', errors='replace').read(); os.remove(tp)
            txt = fix(txt)
            ar = len(re.findall(r'[ء-ي]', txt))
            rec['arapca_harf'] = ar
            if ar > 500 and (not rec.get('sayfa') or ar / max(rec['sayfa'], 1) > 150):
                with gzip.open(f'{OUT}/{bid}_{part}.txt.gz', 'wt', encoding='utf8') as g:
                    g.write(txt)
                rec['durum'] = 'metin'
            else:
                rec['durum'] = 'ocr_kuyrugu' if ext == 'pdf' else 'bos'
        except Exception as e:
            rec['durum'] = 'hata'; rec['hata'] = str(e)[:200]
        finally:
            if os.path.exists(fn): os.remove(fn)
        with lock:
            st.write(json.dumps(rec, ensure_ascii=False) + '\n'); st.flush()
        time.sleep(0.2)


ts = [threading.Thread(target=work) for _ in range(NW)]
[t.start() for t in ts]
last = time.time()
while any(t.is_alive() for t in ts):
    time.sleep(30)
    print('kalan', q.qsize(), time.strftime('%H:%M:%S'), flush=True)
print('bitti', flush=True)
