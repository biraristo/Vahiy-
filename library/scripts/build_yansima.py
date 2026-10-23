"""Boşta kitap denetimi: katalogdaki her eserin sitede nereye yansıdığını hesaplar.
Her eser için: bağlandığı ayet sayısı ve hangi katmanlarda göründüğü; hiç bağlanamayanlar için gerekçe.
Çıktı: library/catalog/yansima.jsonl, data/yansima_ozet.json; site/data/catalog.json satırlarına [10]=ayet sayısı, [11]=yansıma kodu.
Yansıma kodları: K2 (ayet ayet tefsir/i'râb/esbâb), K3 (alıntı/bölüm bağı), K5 (lügat), K4R (ricâl biyografisi), K4T (Takrîb),
               BOS-METINYOK (metin elde değil), BOS-ARCHIVE (indirme engelli), BOS-TARANMIS (taranmış, OCR yapılmadı), BOS-ALINTIYOK (metin var, ayet alıntısı yok)"""
import json, gzip, os, collections, glob
REPO = '/home/claude/vahiy-'
SITE = f'{REPO}/site/data'
K = json.load(open(f'{SITE}/x/kitaplar.json'))['kitaplar']
ref2nb = {}
for nb, k in K.items():
    pre = {'OpenITI': 'oi:', 'Quranpedia': 'qp:', 'Quranpedia PDF': 'qpf:'}.get(k['kaynak'], '?:')
    ref2nb[pre + str(k['ref'])] = int(nb)
ay = collections.defaultdict(set)
for f in glob.glob('/home/claude/lib/k3agg/*.tsv'):
    s = os.path.basename(f)[:-4]
    for line in open(f, encoding='utf8'):
        a, nb = line.split('\t', 2)[:2]
        ay[int(nb)].add(f'{s}:{a}')
E2 = json.load(open(f'{SITE}/k2/eserler.json'))['eserler']
k2ay = collections.defaultdict(int)
for f in glob.glob(f'{SITE}/k2/i/*.json'):
    for k, L in json.load(open(f))['ayetler'].items():
        for w, n in L:
            k2ay[w] += 1
L5 = {v['openiti'] for v in json.load(open(f'{SITE}/k5/index.json'))['lugatler'].values()}
R = json.load(open(f'{SITE}/k4/raviler.json'))
L4 = {v['openiti'] for v in R.get('ricâl_kitaplari', {}).values()} | {'0852IbnHajarCasqalani.TaqribTahdhib.JK000121-ara1'}
pdf = collections.defaultdict(list)
if os.path.exists('/home/claude/lib/raw/qp_pdf/durum.jsonl'):
    for l in open('/home/claude/lib/raw/qp_pdf/durum.jsonl'):
        r = json.loads(l); pdf[str(r['kitap'])].append(r)
ocr = set()
if os.path.exists('/home/claude/lib/raw/qp_pdf/ocr_durum.jsonl'):
    for l in open('/home/claude/lib/raw/qp_pdf/ocr_durum.jsonl'):
        r = json.loads(l)
        if r.get('durum') == 'ocr': ocr.add(str(r['kitap']))
out = []; summ = collections.Counter(); per_source = collections.defaultdict(collections.Counter)
for l in open(f'{REPO}/library/catalog/works.jsonl'):
    w = json.loads(l)
    codes, ayset, src = [], set(), []
    for s in w['sources']:
        sid = str(s['id']); src.append(s['source'])
        if s['source'] == 'openiti':
            nb = ref2nb.get('oi:' + sid)
            if nb is not None and ay.get(nb): ayset |= ay[nb]; codes.append('K3')
            base = sid.replace('.mARkdown', '').replace('.completed', '')
            if any(base.startswith(x.replace('.mARkdown', '')) for x in L5): codes.append('K5')
            if any(base.startswith(x.replace('.mARkdown', '')) for x in L4): codes.append('K4R')
        elif s['source'] == 'quranpedia':
            if k2ay.get('qp' + sid): codes.append('K2'); ayset.add(f'K2:{k2ay["qp" + sid]}')
            for pre in ('qp:', 'qpf:'):
                nb = ref2nb.get(pre + sid)
                if nb is not None and ay.get(nb): ayset |= ay[nb]; codes.append('K3' if pre == 'qp:' else 'K3-PDF')
        elif s['source'] == 'tafsir_api':
            if k2ay.get('qul-' + sid.replace('ar-tafseer-', '').replace('ar-tafsir-', '')) or any(k.startswith('qul-') and sid.split('-')[-1] in k for k in k2ay): codes.append('K2')
        elif s['source'] in ('tanzil', 'corpus_coranicum', 'github:mustafa0x/quran-morphology'):
            codes.append('K0')
    n = sum(1 for a in ayset if not a.startswith('K2:')) + sum(int(a[3:]) for a in ayset if a.startswith('K2:'))
    if not codes:
        qps = [str(s['id']) for s in w['sources'] if s['source'] == 'quranpedia']
        P = [r for q in qps for r in pdf.get(q, [])]
        if any(s.get('downloaded') and s.get('text') in ('tam-metin', 'ayet-bolumlu') for s in w['sources']):
            codes.append('BOS-ALINTIYOK')
        elif P and all('403' in r.get('hata', '') for r in P):
            codes.append('BOS-ARCHIVE')
        elif P and any(r.get('durum') == 'ocr_kuyrugu' for r in P) and not any(q in ocr for q in qps):
            codes.append('BOS-TARANMIS')
        elif P and any(r.get('durum') == 'metin' for r in P):
            codes.append('BOS-ALINTIYOK')
        elif P:
            codes.append('BOS-BEKLIYOR')
        else:
            codes.append('BOS-METINYOK')
    codes = sorted(set(codes))
    out.append({'id': w['id'], 'ad': w['title'], 'tur': w['genre'], 'kaynak': src, 'ayet': n, 'yansima': codes})
    summ['+'.join(c for c in codes if c.startswith('BOS')) or 'SITEDE'] += 1
with open(f'{REPO}/library/catalog/yansima.jsonl', 'w', encoding='utf8') as f:
    for r in out: f.write(json.dumps(r, ensure_ascii=False) + '\n')
json.dump({'tarih': '2026-10-23', 'eser': len(out), 'durum': dict(summ),
           'aciklama': {'SITEDE': 'en az bir katmanda ayetlere bağlı', 'BOS-METINYOK': 'katalogda var, metni hiçbir kaynaktan alınamadı (yalnız künye)', 'BOS-ARCHIVE': "metni archive.org'da; bu ortamdan indirme engelli (403)",
                        'BOS-TARANMIS': 'PDF taranmış görüntü; OCR henüz yapılmadı', 'BOS-ALINTIYOK': 'metin var ama içinde ayet alıntısı bulunamadı (konu Kur\'an dışı olabilir)', 'BOS-BEKLIYOR': 'PDF indirme sırasında'}},
          open(f'{REPO}/data/yansima_ozet.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
rows = json.load(open(f'{SITE}/catalog.json'))
m = {r['id']: r for r in out}
for row in rows:
    r = m.get(row[0])
    if r:
        row[10:] = [r['ayet'], ' '.join(r['yansima'])]
json.dump(rows, open(f'{SITE}/catalog.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(json.dumps(dict(summ), ensure_ascii=False, indent=1))
