"""Şamile (shamela.ws resmî veritabanı 1448): sayfa metinlerinde ayet alıntılarını bulur.
- OpenITI'de zaten bulunan Şamile kitapları (OpenITI sürüm adında 'ShamelaNNNNNNN') atlanır.
- Her sayfa ayrı taranır (k3_scan yöntemi); yer bilgisi kitabın kendi sayfa tablosundan: cilt (part) ve basılı sayfa.
- Çıktı: /home/claude/lib/k3tmp/hitss-0.tsv (kitap 'sh:{id}', cilt, 'sayfa:sayfa_id', ...), /home/claude/lib/shamela/kitaplar.json
Kullanım: python3 build_shamela.py"""
import json, gzip, os, re, sys, sqlite3, io, collections, csv
sys.argv = ['x', '-1', '1']
exec(open('/home/claude/lib/scripts/k3_scan.py').read().split('def openiti_jobs')[0])
SH = '/home/claude/lib/shamela/x/database'
m = sqlite3.connect(f'{SH}/master.db')
auth = {a: (n, d) for a, n, d in m.execute('select author_id, author_name, death_number from author')}
cats = {c: n for c, n in m.execute('select category_id, category_name from category')}
G = {1: 'akaid', 2: 'akaid', 3: 'tefsir', 4: 'ulum', 5: 'kiraat', 6: 'hadis', 7: 'hadis', 8: 'hadis', 9: 'hadis', 10: 'hadis', 11: 'fikih', 12: 'fikih', 13: 'felsefe',
     14: 'fikih', 15: 'fikih', 16: 'fikih', 17: 'fikih', 18: 'fikih', 19: 'fikih', 20: 'fikih', 21: 'fikih', 22: 'fikih', 23: 'tasavvuf', 24: 'tarih', 25: 'tarih', 26: 'ricâl', 27: 'tarih',
     28: 'tarih', 29: 'dil', 30: 'dil', 31: 'dil', 32: 'edebiyat', 33: 'edebiyat', 34: 'edebiyat', 35: 'dil', 36: 'diger', 37: 'diger', 38: 'diger', 39: 'modern', 40: 'diger'}
books = {}
for bid, name, cat, date, main in m.execute('select book_id, book_name, book_category, book_date, main_author from book'):
    an, ad = auth.get(main, (None, None))
    d = date if date and date < 99999 else (ad if ad and ad < 99999 else None)
    books[bid] = {'ad': name, 'muellif': an, 'vefat': d, 'kategori': cats.get(cat), 'tur': G.get(cat, 'diger'), 'kaynak': 'Şamile', 'ref': bid}
# OpenITI'deki Şamile numaraları
csv.field_size_limit(10 ** 9)
in_oi = set()
for x in csv.DictReader(open('/home/claude/lib/raw/openiti_pri_meta.tsv'), delimiter='\t'):
    mm = re.search(r'Shamela0*(\d+)', x['version_uri'])
    if mm: in_oi.add(int(mm.group(1)))
for b in books: books[b]['openitide'] = b in in_oi
json.dump(books, open('/home/claude/lib/shamela/kitaplar.json', 'w', encoding='utf8'), ensure_ascii=False)
print(len(books), 'kitap;', sum(1 for b in books if b in in_oi), "OpenITI'de var", flush=True)
pcache = collections.OrderedDict()
def pages_of(bid):
    if bid not in pcache:
        p = f'{SH}/book/{bid % 1000:03d}/{bid}.db'
        d = {}
        if os.path.exists(p):
            try:
                for i, part, pg in sqlite3.connect(p).execute('select id, part, page from page'): d[i] = (part or '1', pg)
            except Exception: pass
        pcache[bid] = d
        if len(pcache) > 64: pcache.popitem(last=False)
    return pcache[bid]
out = open('/home/claude/lib/k3tmp/hitss-0.tsv', 'w', encoding='utf8')
seen_b = collections.Counter(); n = 0; skipped = 0
TAG = re.compile(r'<[^>]+>')
with gzip.open('/home/claude/lib/shamela/pages.jsonl.gz', 'rt', encoding='utf8') as f:
    for line in f:
        try: r = json.loads(line)
        except Exception: continue
        rid = r.get('id') or ''
        mm = re.match(r'(\d+)-(\d+)', rid)
        if not mm: continue
        bid, pid = int(mm.group(1)), int(mm.group(2))
        if bid in in_oi: skipped += 1; continue
        txt = TAG.sub(' ', r.get('nass') or r.get('body') or r.get('text') or '')
        if not txt.strip(): continue
        part, pg = pages_of(bid).get(pid, ('1', pid))
        try: part_n = int(re.sub(r'\D', '', str(part)) or 1)
        except ValueError: part_n = 1
        scan(txt.split(), [], out, f'sh:{bid}', lambda j, a=part_n, b=f'{pg}:{pid}': (a, b))
        seen_b[bid] += 1; n += 1
        if n % 200000 == 0: print(n, 'sayfa', len(seen_b), 'kitap', flush=True)
out.close()
print('bitti', n, 'sayfa tarandı;', len(seen_b), 'kitap;', skipped, "OpenITI'de olduğu için atlandı", flush=True)
