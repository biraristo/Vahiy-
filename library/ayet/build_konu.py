# Sure konu bölümleri → data/k0/konu.json ; ayet aralıklarının boşluksuz ve örtüşmesiz olduğunu denetler
import json
SITE='/home/claude/vahiy-/site/data'
S=json.load(open(f'{SITE}/k0/surahs.json')); S=S['sureler'] if isinstance(S,dict) else S
say={i+1:(x.get('ayet') or x.get('ayah_count')) for i,x in enumerate(S)}
K={}
for f in ['konular_1.txt','konular_2.txt']:
    for l in open(f'/home/claude/vahiy-/library/ayet/{f}'):
        l=l.strip()
        if not l or l.startswith('#'): continue
        s,r,ad=l.split('|'); s=int(s); a,b=(r.split('-')+[r])[:2]; K.setdefault(s,[]).append([int(a),int(b),ad])
hata=[]
for s in range(1,115):
    L=sorted(K.get(s,[])); n=1
    for a,b,ad in L:
        if a!=n: hata.append(f'{s}: {n} bekleniyordu, {a} geldi')
        n=b+1
    if n-1!=say[s]: hata.append(f'{s}: son {n-1}, sure {say[s]} ayet')
print('\n'.join(hata) or 'tamam', sum(len(v) for v in K.values()),'bölüm')
json.dump({'version':'konu-2026.10.24','kaynak':'Claude; klasik tefsirlerin pasaj taksimi esas alınarak hazırlandı','sureler':{str(s):sorted(v) for s,v in K.items()}},open(f'{SITE}/k0/konu.json','w'),ensure_ascii=False,separators=(',',':'))
