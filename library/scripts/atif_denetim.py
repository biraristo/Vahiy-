"""Atıf taraması kapsam denetimi: her kitap tarandı mı, indirilemeyen var mı, hiç alıntı çıkmayanlar hangi raflarda.
Çıktı: /home/claude/lib/atif/denetim.json"""
import json, glob, collections
DZ = json.load(open('/home/claude/vahiy-/site/data/kutuphane/dizin.json'))
hedef = sorted(k for k in DZ['r'] if k[0] != 't' or k.startswith(('sh', 'oi')))
done = set()
for f in glob.glob('/home/claude/lib/atif/done-*.txt'): done |= set(open(f).read().split())
hit = collections.Counter()
for f in glob.glob('/home/claude/lib/atif/hits-*.tsv'):
    for line in open(f, encoding='utf8'): hit[line.split('\t', 1)[0]] += 1
eksik = [k for k in hedef if k not in done]
sifir = [k for k in hedef if k in done and not hit[k]]
raf = collections.Counter(DZ['r'][k] for k in sifir)
tum = collections.Counter(DZ['r'][k] for k in hedef)
R = {'hedef': len(hedef), 'taranan': len(done & set(hedef)), 'taranmayan': eksik, 'alinti_yok': len(sifir),
     'alinti_yok_raf': {r: [raf[r], tum[r]] for r in tum}, 'alinti_yok_liste': sifir, 'toplam_satir': sum(hit.values())}
json.dump(R, open('/home/claude/lib/atif/denetim.json', 'w'), ensure_ascii=False, indent=1)
print({k: v for k, v in R.items() if k not in ('alinti_yok_liste', 'taranmayan')}, 'taranmayan', len(eksik))
