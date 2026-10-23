import json,os,time,urllib.request,gzip
B='https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir'
e=json.load(open('/home/claude/lib/raw/tafsir_api/editions.json'))
sel=[x for x in e if x['language_name'] in ('arabic','turkish')]
for x in sel:
    d=f"/home/claude/lib/raw/tafsir_api/{x['slug']}"; os.makedirs(d,exist_ok=True)
    for s in range(1,115):
        p=f'{d}/{s}.json.gz'
        if os.path.exists(p): continue
        for a in range(3):
            try:
                data=urllib.request.urlopen(f"{B}/{x['slug']}/{s}.json",timeout=60).read()
                with gzip.open(p,'wb') as f: f.write(data); break
            except Exception as ex: err=ex; time.sleep(2)
        else: print('FAIL',x['slug'],s,err,flush=True)
    print('done',x['slug'],flush=True)
print('ALL DONE')
