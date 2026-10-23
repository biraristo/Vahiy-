import json,os,time,urllib.request,urllib.parse,gzip,re
OUT='/home/claude/lib/raw/sefaria'; UA={'User-Agent':'vahiy-plus-plus personal research'}
fails=[l.split('FAIL ',1)[1].rsplit(' HTTP',1)[0].rsplit(' Incomplete',1)[0].strip() for l in open('/tmp/claude-0/-home-claude/9f39ff41-3bc3-5de9-bdbb-7eb83ee0152d/tasks/b1gm59gf5.output') if l.startswith('FAIL')]
def get(u):
    for a in range(4):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=300))
        except Exception as e: err=e; time.sleep(5)
    raise err
def leaves(node,prefix):
    out=[]
    for n in node.get('nodes',[]):
        t=n.get('title') or next((x['text'] for x in n.get('titles',[]) if x.get('lang')=='en' and x.get('primary')),'')
        ref=f'{prefix}, {t}' if t else prefix
        if n.get('nodes'): out+=leaves(n,ref)
        else: out.append(ref)
    return out
for title in fails:
    fn=f"{OUT}/{title.replace('/','_')}.json.gz"
    if os.path.exists(fn): continue
    try:
        idx=get('https://www.sefaria.org/api/v2/raw/index/'+urllib.parse.quote(title))
        refs=leaves(idx.get('schema',{}),title) or [title]
        parts=[]
        for r in refs:
            try: parts.append(get('https://www.sefaria.org/api/v3/texts/'+urllib.parse.quote(r)+'?version=hebrew&version=english'))
            except Exception as e: parts.append({'ref':r,'error':str(e)})
            time.sleep(0.4)
        with gzip.open(fn,'wt',encoding='utf8') as f: json.dump({'title':title,'complex':True,'parts':parts},f,ensure_ascii=False)
        print('ok',title,len(refs),sum(1 for p in parts if 'error' in p),'errors',flush=True)
    except Exception as e: print('FAIL',title,e,flush=True)
print('DONE')
