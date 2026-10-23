import json,gzip,os,time,urllib.request
O='/home/claude/lib/raw/cc_api/intertexts'
idx=json.load(gzip.open('/home/claude/lib/raw/cc_api/intertexts_index.json.gz'))['data']
for it in idx:
    p=f"{O}/{it['id']}.json.gz"
    if os.path.exists(p): continue
    for a in range(3):
        try:
            b=urllib.request.urlopen(urllib.request.Request(f"https://corpuscoranicum.org/api/data/intertexts/{it['id']}",headers={'User-Agent':'vahiy-plus-plus personal research'}),timeout=120).read()
            with gzip.open(p,'wb') as f: f.write(b); break
        except Exception as e: err=e; time.sleep(4)
    else: print('FAIL',it['id'],err,flush=True)
    time.sleep(0.3)
print('DONE',len(os.listdir(O)))
