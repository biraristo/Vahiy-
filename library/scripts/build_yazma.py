"""El yazmaları: Corpus Coranicum TEI (telota/corpus-coranicum-tei, CC BY 4.0) — 2.323 Kur'an el yazması.
Her yaprak (folio) yüzündeki ayet aralığı ayetlere açılır; görüntü sayfasına bağlantı (CC sitesi) verilir.
Çıktı: site/data/k6/yazma.json (nüsha künyeleri), site/data/k6/y/{sure}.json (ayet → [nüsha, yaprak, sayfa_id])"""
import re, json, glob, os, collections, html
import xml.etree.ElementTree as ET
SRC = '/home/claude/lib/raw/cc/data/quran_manuscripts'
OUT = '/home/claude/vahiy-/site/data/k6'
os.makedirs(f'{OUT}/y', exist_ok=True)
NS = {'t': 'http://www.tei-c.org/ns/1.0'}
AY = [int(x) for x in re.findall(r'ayas="(\d+)"', open('/home/claude/lib/raw/tanzil/quran-data.xml').read())][:114]
def txt(e):
    return ' '.join(''.join(e.itertext()).split()) if e is not None else ''
reg = {}; by = collections.defaultdict(lambda: collections.defaultdict(list)); nf = 0
for f in sorted(glob.glob(f'{SRC}/manuscript-*.xml')):
    try:
        r = ET.parse(f).getroot()
    except ET.ParseError:
        continue
    mid = int(re.search(r'(\d+)', os.path.basename(f)).group(1))
    ms = r.find('.//t:msDesc', NS)
    surf = {s.get('n'): re.sub(r'\D', '', s.get('{http://www.w3.org/XML/1998/namespace}id') or '') for s in r.findall('.//t:facsimile/t:surface', NS)}
    reg[mid] = {'ad': txt(r.find('.//t:titleStmt/t:title', NS)), 'kurum': txt(ms.find('.//t:repository', NS)) if ms is not None else '',
                'no': txt(ms.find('.//t:idno', NS)) if ms is not None else '', 'tarih': txt(r.find('.//t:origDate', NS)),
                'malzeme': txt(r.find('.//t:material', NS)) or txt(r.find('.//t:support', NS))[:120], 'yazi': txt(r.find('.//t:scriptNote', NS))[:200],
                'ozet': txt(ms.find('.//t:summary', NS))[:600] if ms is not None else '', 'gorsel': len(surf)}
    for it in r.findall('.//t:msItem', NS):
        ti = it.find('t:title', NS)
        key = (ti.get('key') if ti is not None else '') or ''
        m = re.match(r'(\d+):(\d+):\d+-(\d+):(\d+):\d+', key)
        if not m: continue
        s1, a1, s2, a2 = map(int, m.groups()); fol = it.get('n') or ''
        if not (1 <= s1 <= 114 and 1 <= s2 <= 114) or (s2, a2) < (s1, a1) or s2 - s1 > 3: continue
        s, a = s1, max(a1, 1)
        while (s, a) <= (s2, a2) and s <= 114:
            by[s][f'{s}:{a}'].append([mid, fol, surf.get(fol, '')]); nf += 1
            a += 1
            if a > AY[s - 1]: s, a = s + 1, 1
json.dump({'kaynak': 'Corpus Coranicum — Manuscripta Coranica (TEI, CC BY 4.0)', 'url': 'https://corpuscoranicum.de/de/manuscript/{id}/page/{sayfa}', 'nushalar': reg},
          open(f'{OUT}/yazma.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
for s in range(1, 115):
    json.dump({'ayetler': by.get(s, {})}, open(f'{OUT}/y/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
cov = sum(len(v) for v in by.values())
print(len(reg), 'nüsha', nf, 'ayet-yaprak bağı', cov, 'ayet kapsanıyor')
