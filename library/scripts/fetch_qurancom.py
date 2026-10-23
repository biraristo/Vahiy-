"""Quran.com API v4: bütün mealler, Türkçe/İngilizce kelime mealleri, sure tanıtımları."""
import json,os,time,urllib.request,gzip
B='https://api.quran.com/api/v4'; O='/home/claude/lib/raw/qurancom'
def get(u):
    for a in range(4):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'vahiy-plus-plus personal research'}),timeout=120))
        except Exception as e: err=e; time.sleep(4)
    raise err
def save(p,d):
    with gzip.open(p,'wt',encoding='utf8') as f: json.dump(d,f,ensure_ascii=False)
tr=get(f'{B}/resources/translations'); save(f'{O}/translations_index.json.gz',tr)
for t in tr['translations']:
    p=f"{O}/translations/{t['id']}.json.gz"
    if os.path.exists(p): continue
    try: save(p,get(f"{B}/quran/translations/{t['id']}?fields=verse_key"))
    except Exception as e: print('FAIL tr',t['id'],e,flush=True)
    time.sleep(0.3)
print('translations done',flush=True)
for lang in ('tr','en'):
    for ch in range(1,115):
        p=f'{O}/wbw/{lang}-{ch}.json.gz'
        if os.path.exists(p): continue
        pages=[];page=1
        try:
            while True:
                d=get(f'{B}/verses/by_chapter/{ch}?language={lang}&words=true&word_fields=text_uthmani,location,root,lemma&per_page=50&page={page}')
                pages.extend(d['verses'])
                if not d['pagination'].get('next_page'): break
                page+=1; time.sleep(0.2)
            save(p,pages)
        except Exception as e: print('FAIL wbw',lang,ch,e,flush=True)
        time.sleep(0.3)
    print('wbw done',lang,flush=True)
for lang in ('tr','en','ar'):
    for ch in range(1,115):
        p=f'{O}/chapter_info/{lang}-{ch}.json.gz'
        if os.path.exists(p): continue
        try: save(p,get(f'{B}/chapters/{ch}/info?language={lang}'))
        except Exception as e: print('FAIL info',lang,ch,e,flush=True)
        time.sleep(0.2)
print('ALL DONE')
