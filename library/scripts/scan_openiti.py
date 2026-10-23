"""OpenITI metinlerini zip'ten açmadan tarar: sayfa işareti (PageVxxPyyy), cilt sayısı, kelime sayısı, neşir bilgisi satırları."""
import zipfile,re,json,sys
Z='/home/claude/lib/raw/openiti_pri_data.zip'
out={}
pg=re.compile(r'PageV(\d+)P(\d+)')
with zipfile.ZipFile(Z) as z:
    names=[n for n in z.namelist() if not n.endswith('/')]
    for i,n in enumerate(names):
        with z.open(n) as f:
            t=f.read().decode('utf8','ignore')
        m=pg.findall(t)
        vols={int(v) for v,_ in m}
        head=t[:6000]
        ed=[l.strip()[:200] for l in head.splitlines() if re.search(r'(الناشر|الطبعة|المحقق|تحقيق|دار |طبعة)',l)][:4]
        uri=n.split('/')[-1]
        out[uri]={'pages':len(m),'vols':len(vols),'max_page':max((int(p) for _,p in m),default=0),'edition_lines':ed,'zip_path':n,'chars':len(t)}
        if i%500==0: print(i,len(names),flush=True)
json.dump(out,open('/home/claude/lib/raw/openiti_scan.json','w',encoding='utf8'),ensure_ascii=False)
print('DONE',len(out), sum(1 for v in out.values() if v['pages']>0),'with page markers')
