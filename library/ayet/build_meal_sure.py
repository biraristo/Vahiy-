# Ayet ekranı "Mealler" kartı için sure başına Türkçe meal paketi: data/meal/s/{s}.json = {meal_id: [ayet metinleri]}
import json,os
SITE='/home/claude/vahiy-/site/data'
MI=json.load(open(f'{SITE}/meal/index.json'))['mealler']
S=json.load(open(f'{SITE}/k0/surahs.json')); S=S['sureler'] if isinstance(S,dict) else S
say=[x.get('ayet') or x.get('ayah_count') for x in S]
TR=[m['id'] for m in MI if m['dil']=='Türkçe' and m['id']!='tz-tr.transliteration']
os.makedirs(f'{SITE}/meal/s',exist_ok=True)
M={i:json.load(open(f'{SITE}/meal/{i}.json')) for i in TR}
off=0
for n,c in enumerate(say,1):
    json.dump({'version':1,'mealler':{i:M[i][off:off+c] for i in TR}},open(f'{SITE}/meal/s/{n}.json','w'),ensure_ascii=False,separators=(',',':'))
    off+=c
print(len(TR),'meal',off,'ayet')
