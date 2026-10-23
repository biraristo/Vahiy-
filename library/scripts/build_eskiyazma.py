"""En eski Kur'an yazmaları: k6/yazma.json (Corpus Coranicum, Manuscripta Coranica) → site/data/k6/eski.json
Tarih aralığının başlangıcına göre sıralanır; '-750' gibi açık aralıklar 'en geç 750' (başlangıç 600) sayılır. Miladî yıllar."""
import json, re
D = '/home/claude/vahiy-/site/data'
Y = json.load(open(f'{D}/k6/yazma.json'))
out = []
for i, v in Y['nushalar'].items():
    t = (v.get('tarih') or '').strip()
    m = re.fullmatch(r'(\d{3,4})?-(\d{3,4})', t)
    if not m: continue
    bas = int(m.group(1)) if m.group(1) else None; son = int(m.group(2))
    kap = re.search(r"Qurʾānic Text: ([^;]+)", v.get('ozet') or '')
    c14 = bool(re.search(r'C14|radiocarbon|Radiokarbon', v.get('ozet') or '', re.I))
    out.append({'id': i, 'ad': v['ad'], 'kurum': v.get('kurum'), 'bas': bas, 'son': son, 'yazi': v.get('yazi'), 'kapsam': kap.group(1).strip() if kap else None, 'c14': c14})
out.sort(key=lambda x: ((x['bas'] if x['bas'] else x['son'] - 60), x['son']))
json.dump({'kaynak': Y['kaynak'], 'url': Y['url'], 'not': "Tarihler miladî; Corpus Coranicum'un verdiği tahminî üretim aralığıdır. '-750' gibi kayıtlar 'en geç 750' demektir.",
           'toplam_tarihli': len(out), 'nushalar': out[:60]}, open(f'{D}/k6/eski.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), out[:5])
