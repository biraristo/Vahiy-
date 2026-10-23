import json,gzip,os,time,urllib.request,sys
OUT='/home/claude/lib/raw/qp_books'
b=json.load(gzip.open('/home/claude/lib/raw/qp/books.json.gz'))['data']
todo=[x for x in b if x.get('contents_url')]
ok=fail=skip=0
for i,x in enumerate(todo):
    p=f"{OUT}/book-{x['id']}.json.gz"
    if os.path.exists(p) and os.path.getsize(p)>100: skip+=1; continue
    url=x['contents_url'].replace('https://quranpedia.net/','https://api.quranpedia.net/') if 'api.' not in x['contents_url'] else x['contents_url']
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'vahiy-plus-plus personal research (bunyamin)'})
            data=urllib.request.urlopen(req,timeout=120).read()
            with gzip.open(p,'wb') as f: f.write(data)
            ok+=1; break
        except Exception as e:
            err=str(e); time.sleep(3)
    else:
        fail+=1; print('FAIL',x['id'],url,err,flush=True)
    if i%50==0: print(i,len(todo),'ok',ok,'fail',fail,'skip',skip,flush=True)
    time.sleep(0.3)
print('DONE ok',ok,'fail',fail,'skip',skip)
