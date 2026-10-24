import glob,re,json,html
from xml.etree import ElementTree as ET
NS={'t':'http://www.tei-c.org/ns/1.0'}
def tx(e): return re.sub(r'\s+',' ',''.join(e.itertext())).strip() if e is not None else ''
out=[]
for f in sorted(glob.glob('/home/claude/lib/raw/cc/data/quran_intertexts/intertext-*.xml')):
    r=ET.parse(f).getroot()
    ms=r.find('.//t:msDesc',NS)
    no=tx(ms.find('t:msIdentifier/t:idno',NS))
    it=ms.find('.//t:msItem',NS)
    d={'id':int(no),'baslik':tx(it.find('t:title',NS)),'yazar':tx(it.find('t:author',NS)),
       'dil':(it.find('t:textLang',NS).get('mainLang') if it.find('t:textLang',NS) is not None else ''),'dil_ad':tx(it.find('t:textLang',NS)),
       'ozet':tx(ms.find('.//t:summary',NS)),'tarih':tx(ms.find('.//t:origDate',NS)),'yer':tx(ms.find('.//t:origPlace',NS)),
       'kaynakca':[html.unescape(html.unescape(tx(b))) for b in ms.findall('.//t:listBibl/t:bibl',NS)],
       'gorsel':[g.get('url') for g in r.findall('.//t:graphic',NS)],
       'katkı':[tx(p) for p in r.findall('.//t:revisionDesc//t:persName',NS)]}
    for dv in r.findall('.//t:body/t:div',NS):
        typ=dv.get('type'); lg=dv.get('{http://www.w3.org/XML/1998/namespace}lang')
        ps=[tx(p) for p in dv.findall('.//t:p',NS)]; T='\n'.join(p for p in ps if p)
        if T: d.setdefault('metinler',[]).append({'tur':typ,'dil':lg,'metin':T})
    d['ayetler']=sorted(set(re.findall(r'Q\s?(\d{1,3}\s?:\s?\d{1,3}(?:\s?[-–]\s?\d{1,3})?)',d['ozet'])))
    out.append(d)
json.dump(out,open('cc.json','w'),ensure_ascii=False)
print(len(out)); import collections
print(collections.Counter(len(x.get('metinler',[])) for x in out)); print(sum(len(json.dumps(x,ensure_ascii=False)) for x in out)/1e6,'MB')
print(sorted(set(x['baslik'] for x in out))[:400])
