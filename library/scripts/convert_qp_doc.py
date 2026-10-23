"""Quranpedia DOC/DOCX/RTF eklerini toplu metne çevirir (tek soffice süreci, 50'şerli gruplar).
Çıktı: qp_pdf/{kitap}_{cilt}.txt.gz; durum.jsonl'a 'metin' ya da 'bos' satırı eklenir; dönüştürülen DOC silinir."""
import os, glob, gzip, json, subprocess, re, unicodedata, collections
D = '/home/claude/lib/raw/qp_doc'
O = '/home/claude/lib/raw/qp_pdf'
T = '/home/claude/lib/doctmp'
os.makedirs(T, exist_ok=True)
urls = {}
for l in open(f'{O}/durum.jsonl'):
    r = json.loads(l)
    if r.get('durum') == 'doc_kuyrugu': urls[f"{r['kitap']}_{r['cilt']}"] = r
files = sorted(glob.glob(f'{D}/*'), key=os.path.getsize)
st = open(f'{O}/durum.jsonl', 'a'); c = collections.Counter()
for i in range(0, len(files), 50):
    grp = files[i:i + 50]
    subprocess.run(['soffice', '-env:UserInstallation=file:///tmp/lo_batch', '--headless', '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', T] + grp, capture_output=True, timeout=3600)
    for f in grp:
        key = os.path.basename(f).rsplit('.', 1)[0]
        tp = f'{T}/{key}.txt'
        r = dict(urls.get(key, {'kitap': key.split('_')[0], 'cilt': key.split('_')[1], 'url': ''}))
        if os.path.exists(tp):
            t = unicodedata.normalize('NFKC', open(tp, encoding='utf8', errors='replace').read())
            ar = len(re.findall(r'[ء-ي]', t))
            if ar > 500:
                with gzip.open(f'{O}/{key}.txt.gz', 'wt', encoding='utf8') as g: g.write(t)
                r['durum'] = 'metin'; r['kaynak_bicim'] = 'doc'
            else:
                r['durum'] = 'bos'
            r['arapca_harf'] = ar; os.remove(tp)
        else:
            r['durum'] = 'hata'; r['hata'] = 'doc dönüştürülemedi'
        c[r['durum']] += 1
        st.write(json.dumps(r, ensure_ascii=False) + '\n'); st.flush()
        os.remove(f)
    print(i + len(grp), len(files), dict(c), flush=True)
print('bitti', dict(c), flush=True)
