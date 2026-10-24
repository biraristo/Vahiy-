"""Kütüphane fihristi konu başlıklarının Türkçesi: /home/claude/lib/tr/fk/girdi_NN.tsv (no\tArapça) + cNN.txt (satır satır Türkçe)
→ site/data/fh2/tr.json {Arapça başlık: Türkçe}. Çeviri: Claude (anlam çevirisi; fıkıh ve hadis bab başlıklarında yerleşik Türkçe terimler)."""
import json, glob, os
T = {}
for g in sorted(glob.glob('/home/claude/lib/tr/fk/girdi_*.tsv')):
    c = g.replace('girdi_', 'c').replace('.tsv', '.txt')
    if not os.path.exists(c): continue
    A = [l.rstrip('\n').split('\t', 1)[1] for l in open(g, encoding='utf8') if l.strip()]
    B = [l.rstrip('\n') for l in open(c, encoding='utf8')]
    assert len(A) == len(B), (g, len(A), len(B))
    T.update({a: b for a, b in zip(A, B) if b})
json.dump(T, open('/home/claude/vahiy-/site/data/fh2/tr.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(T))
