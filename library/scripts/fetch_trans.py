import json,gzip,os,time,urllib.request,re
UA={'User-Agent':'vahiy-plus-plus personal research'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120).read()
m=json.load(open('/home/claude/lib/raw/qp_manifest.json'))
n=0
for t in m['translation_books']:
    p='/home/claude/lib/raw/qp_trans/'+t['name']+'.gz'
    if os.path.exists(p): continue
    try:
        d=get('https://quranpedia.net/translation-books/'+t['name'])
        with gzip.open(p,'wb') as f: f.write(d); n+=1
    except Exception as e: print('FAIL qp',t['name'],e,flush=True)
    time.sleep(0.3)
print('qp trans',n,flush=True)
html=get('https://tanzil.net/trans/').decode('utf8','ignore')
ids=sorted(set(re.findall(r'href="/trans/([a-z]{2}\.[a-z0-9]+)"',html)))
n=0
for i in ids:
    p=f'/home/claude/lib/raw/tanzil/trans/{i}.txt'
    if os.path.exists(p): continue
    try:
        d=get(f'https://tanzil.net/trans/?transID={i}&type=txt-2'); open(p,'wb').write(d); n+=1
    except Exception as e: print('FAIL tz',i,e,flush=True)
    time.sleep(0.5)
print('tanzil trans',n,len(ids))
