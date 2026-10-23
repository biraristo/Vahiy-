"""Sefaria: Kur'an kıssalarıyla karşılaştırma için temel metinler (Tanah, Targum, Mişna, Tosefta, Talmud, Midraş, İkinci Tapınak)."""
import json,os,time,urllib.request,urllib.parse,gzip
OUT='/home/claude/lib/raw/sefaria'
UA={'User-Agent':'vahiy-plus-plus personal research'}
idx=json.load(urllib.request.urlopen(urllib.request.Request('https://www.sefaria.org/api/index',headers=UA)))
json.dump(idx,open(f'{OUT}/index.json','w'),ensure_ascii=False)
def walk(n,path,out):
    if 'contents' in n:
        for c in n['contents']: walk(c,path+[n.get('category','')],out)
    elif 'title' in n: out.append(('/'.join(p for p in path if p),n['title']))
allt=[]
for n in idx: walk(n,[],allt)
KEEP=('Tanakh/Torah','Tanakh/Prophets','Tanakh/Writings','Tanakh/Targum','Mishnah/Seder','Tosefta/Seder','Talmud/Bavli/Seder','Talmud/Yerushalmi/Seder','Midrash','Second Temple')
SKIP=('Commentary','Rishonim','Acharonim','Modern','Guides','Minor Tractates on')
sel=[(p,t) for p,t in allt if p.startswith(KEEP) and not any(s in p for s in SKIP)]
json.dump(sel,open(f'{OUT}/selection.json','w'),ensure_ascii=False,indent=0)
print('selected',len(sel),flush=True)
ok=fail=0
for i,(p,t) in enumerate(sel):
    fn=f"{OUT}/{t.replace('/','_')}.json.gz"
    if os.path.exists(fn): continue
    url='https://www.sefaria.org/api/v3/texts/'+urllib.parse.quote(t)+'?version=hebrew&version=english'
    for a in range(3):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=180))
            d['_category']=p
            with gzip.open(fn,'wt',encoding='utf8') as f: json.dump(d,f,ensure_ascii=False)
            ok+=1; break
        except Exception as e: err=e; time.sleep(5)
    else: fail+=1; print('FAIL',t,err,flush=True)
    if i%25==0: print(i,len(sel),'ok',ok,'fail',fail,flush=True)
    time.sleep(0.5)
print('DONE ok',ok,'fail',fail)
