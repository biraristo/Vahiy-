# x/kitaplar.json kitap no → Türkçe künye ve kütüphane kimliği: data/x/tr.json = {no: [kütüphane_id, ad, müellif]}
import json,glob,os
SITE='/home/claude/vahiy-/site/data'
K=json.load(open(f'{SITE}/x/kitaplar.json'))['kitaplar']
M={}
for f in glob.glob(f'{SITE}/kutuphane/*.json'):
    if f.endswith(('dinler.json','tefsir.json')): continue
    for e in json.load(open(f)).get('eserler',[]):
        M[(e['kaynak'],str(e['ref']))]=[e['id'],e['ad'],e['muellif']]
T=json.load(open(f'{SITE}/kutuphane/tefsir.json'))['eserler']
for e in T:
    for r in e.get('k3',[]): M[('k3',str(r))]=[e['id'],e['ad'],e['muellif']]
out={}
for no,k in K.items():
    v=M.get((k['kaynak'],str(k['ref']))) or M.get(('k3',no))
    if v: out[no]=v
json.dump(out,open(f'{SITE}/x/tr.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(K),'kitap,',len(out),'Türkçe künyeli', os.path.getsize(f'{SITE}/x/tr.json'))
