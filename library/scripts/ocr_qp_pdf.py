"""Taranmış (metin katmanı olmayan) Quranpedia PDF'leri için Arapça OCR (Tesseract 5, tessdata_fast 'ara').
Öncelik: esbâb, nâsih, i'râb, fezâil, emsâl, münâsebet, müteşâbih; her türde küçük dosyalar önce.
Çıktı: qp_pdf/{kitap}_{cilt}.txt.gz (sayfalar \\f ile ayrılır), ocr_durum.jsonl. Kaldığı yerden sürer.
Not: OCR metni hatalı olabilir; sitede 'OCR' etiketiyle gösterilir."""
import json, gzip, os, subprocess, urllib.request, glob, time, sys, shutil
OUT = '/home/claude/lib/raw/qp_pdf'
TMP = '/home/claude/lib/ocrtmp'
TESS = '/home/claude/lib/tessdata'
os.makedirs(TMP, exist_ok=True)
PRI = ['asbab', 'nasekh', 'e3rab', 'fdael', 'amthal', 'monasbah', 'mutshabeh', 'tafsir', 'qiraat', 'book']
SP = f'{OUT}/ocr_durum.jsonl'
done = set()
if os.path.exists(SP):
    done = {json.loads(l)['url'] for l in open(SP)}
q = []
for l in open(f'{OUT}/durum.jsonl'):
    r = json.loads(l)
    if r.get('durum') == 'ocr_kuyrugu' and r['url'] not in done:
        q.append(r)
q.sort(key=lambda r: (PRI.index(r['tur']) if r['tur'] in PRI else 99, r.get('sayfa') or 9999))
MAXP = int(sys.argv[1]) if len(sys.argv) > 1 else 400  # çok büyük ciltler sonra
st = open(SP, 'a')
for r in q:
    if (r.get('sayfa') or 0) > MAXP:
        continue
    fn = f"{TMP}/{r['kitap']}_{r['cilt']}.pdf"
    rec = {'kitap': r['kitap'], 'cilt': r['cilt'], 'tur': r['tur'], 'url': r['url'], 'sayfa': r.get('sayfa')}
    try:
        with urllib.request.urlopen(urllib.request.Request(r['url'], headers={'User-Agent': 'vahiy-plus-plus kisisel arastirma'}), timeout=300) as u, open(fn, 'wb') as f:
            shutil.copyfileobj(u, f)
        pages = []
        n = r.get('sayfa') or 0
        for p in range(1, n + 1):
            base = f'{TMP}/p'
            subprocess.run(['pdftoppm', '-r', '200', '-gray', '-f', str(p), '-l', str(p), '-png', fn, base], capture_output=True, timeout=300)
            imgs = glob.glob(f'{base}-*.png')
            if not imgs:
                pages.append(''); continue
            o = subprocess.run(['tesseract', imgs[0], '-', '-l', 'ara', '--tessdata-dir', TESS], capture_output=True, timeout=300)
            pages.append(o.stdout.decode('utf8', 'replace'))
            for i in imgs: os.remove(i)
        with gzip.open(f"{OUT}/{r['kitap']}_{r['cilt']}.txt.gz", 'wt', encoding='utf8') as g:
            g.write('\f'.join(pages))
        rec['durum'] = 'ocr'; rec['harf'] = sum(len(x) for x in pages)
    except Exception as e:
        rec['durum'] = 'hata'; rec['hata'] = str(e)[:200]
    finally:
        if os.path.exists(fn): os.remove(fn)
    st.write(json.dumps(rec, ensure_ascii=False) + '\n'); st.flush()
    print(time.strftime('%H:%M:%S'), rec['kitap'], rec['tur'], rec.get('sayfa'), rec['durum'], flush=True)
print('bitti', flush=True)
