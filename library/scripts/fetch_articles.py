"""Kur'an çalışmaları makale künyeleri (Crossref açık API): başlık, yazar, dergi, yıl, özet, DOI bağlantısı.
Tam metin alınmaz; ayetle ilişki başlık ve özetteki atıflardan çıkarılır."""
import json,os,time,urllib.request,urllib.parse,re,gzip
O='/home/claude/lib/raw/articles'
SUR=[x['tr'] for x in json.load(open('/home/claude/vahiy-/site/data/surahs.json'))['surahs']]
Q=["Kur'an","Kuran","Kur'ân","ayet","âyet","tefsir","müfessir","sure","kıraat","esbâb-ı nüzûl","nesih Kur'an","münasebet Kur'an","nazm Kur'an","i'câz","Qur'an","Quranic","tafsir","exegesis Quran"]+[f"{s} suresi" for s in SUR]+[f"{s} sûresi" for s in SUR]
seen={}
def get(u):
    for a in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'vahiy-plus-plus/0.1 (personal research)'}),timeout=120))
        except Exception as e: err=e; time.sleep(10*(a+1))
    raise err
SEL='DOI,title,container-title,abstract,author,issued,URL,language,publisher,subject,type'
for q in Q:
    cursor='*'; got=0
    while True:
        u='https://api.crossref.org/works?'+urllib.parse.urlencode({'query.bibliographic':q,'filter':'type:journal-article','rows':1000,'cursor':cursor,'select':SEL})
        try: m=get(u)['message']
        except Exception as e: print('FAIL',q,e,flush=True); break
        items=m['items']
        for it in items:
            if it['DOI'] not in seen: seen[it['DOI']]=it
        got+=len(items)
        if not items or got>=min(m['total-results'],20000): break
        cursor=m['next-cursor']; time.sleep(1)
    print(q,'+',got,'total',len(seen),flush=True)
    time.sleep(1)
with gzip.open(f'{O}/crossref_raw.json.gz','wt',encoding='utf8') as f: json.dump(list(seen.values()),f,ensure_ascii=False)
print('DONE',len(seen))
