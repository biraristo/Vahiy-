"""Corpus Coranicum web API: ayet ayet kıraatler (kaynak eserleriyle), sure şerhleri, intertekstler."""
import json,os,time,urllib.request,gzip,re
B='https://corpuscoranicum.org/api/data'; O='/home/claude/lib/raw/cc_api'
def get(u):
    for a in range(4):
        try: return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'vahiy-plus-plus personal research'}),timeout=180).read()
        except Exception as e:
            err=e
            if '404' in str(e): raise
            time.sleep(5)
    raise err
def save(p,b):
    with gzip.open(p,'wb') as f: f.write(b)
ayas=[int(x) for x in re.findall(r'ayas="(\d+)"',open('/home/claude/lib/raw/tanzil/quran-data.xml').read())][:114]
for s in range(1,115):
    for kind in ('commentary','intertexts'):
        p=f'{O}/{kind}/{s}.json.gz'
        if os.path.exists(p): continue
        try: save(p,get(f'{B}/{kind}/sura/{s}'))
        except Exception as e: print('FAIL',kind,s,e,flush=True)
        time.sleep(0.3)
print('commentary/intertexts done',flush=True)
try: save(f'{O}/intertexts_index.json.gz',get(f'{B}/intertexts'))
except Exception as e: print('FAIL intertexts index',e,flush=True)
n=0
for s in range(1,115):
    for v in range(1,ayas[s-1]+1):
        p=f'{O}/variants/{s}_{v}.json.gz'
        if os.path.exists(p): continue
        try: save(p,get(f'{B}/variants/sura/{s}/verse/{v}')); n+=1
        except Exception as e: print('FAIL var',s,v,e,flush=True)
        time.sleep(0.2)
    print('sura',s,'ok',flush=True)
print('ALL DONE',n)
