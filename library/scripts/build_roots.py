"""Kök ve lemma dizini: her kök/lemma için geçtiği kelime konumları (s:a:k)."""
import json, glob, collections, os
SITE = '/home/claude/vahiy-/site/data/k0'
roots, lemmas = collections.defaultdict(list), collections.defaultdict(list)
for p in sorted(glob.glob(f'{SITE}/s/*.json'), key=lambda x: int(os.path.basename(x)[:-5])):
    d = json.load(open(p))
    for a in d['ayetler']:
        for w in a['kelimeler']:
            loc = f"{a['id']}:{w['n']}"
            if w.get('kok'):
                roots[w['kok']].append(loc)
            if w.get('lemma'):
                lemmas[w['lemma']].append(loc)
json.dump({'kok': roots, 'lemma': lemmas}, open(f'{SITE}/dizin.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('kök', len(roots), 'lemma', len(lemmas), os.path.getsize(f'{SITE}/dizin.json') // 1024, 'KB')
