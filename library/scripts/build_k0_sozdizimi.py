"""Katman 0 eki: Kur'an sözdizimi ağacı (Quranic Treebank — NoorBayan, QAC tabanlı, MIT) — Quranpedia dökümünden.
Çıktı: site/data/k0/sx/{sure}.json  {ayet: [[kelime_no, metin, [[parça, tür, görev, bağlı_kelime, bağlı_parça, öbek]]]]}"""
import json, gzip, os, collections
OUT = '/home/claude/vahiy-/site/data/k0/sx'
os.makedirs(OUT, exist_ok=True)
d = json.load(gzip.open('/home/claude/lib/raw/qp/syntax.json.gz'))['data']
by = collections.defaultdict(dict); n = 0
for x in d:
    sy = x.get('syntax') or {}
    rows = []
    for sen in sy.get('sentences') or []:
        for w in sen.get('words') or []:
            toks = []
            for t in w.get('tokens') or []:
                h = t.get('head') or {}
                same = h.get('surah') == x['surah'] and h.get('ayah') == x['ayah']
                toks.append([t.get('text'), t.get('pos'), t.get('rel_ar') or ('' if t.get('rel') in (None, 'NonRel', 'root') else t.get('rel')),
                             h.get('word') if same else (f"{h.get('ayah')}:{h.get('word')}" if h else None), h.get('token') if h else None,
                             (t.get('constituent') or {}).get('label')])
            rows.append([w.get('number'), w.get('text'), toks]); n += 1
    if rows:
        by[x['surah']][str(x['ayah'])] = rows
for s, v in by.items():
    json.dump({'kaynak': 'The Quranic Treebank (NoorBayan; Quranic Arabic Corpus tabanlı), MIT — Quranpedia dökümü', 'ayetler': v},
              open(f'{OUT}/{s}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(by), 'sure', n, 'kelime', sum(len(v) for v in by.values()), 'ayet')
