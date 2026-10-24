"""Katman kontrol kapısı: python3 gate.py k0 k1 [k2]"""
import json, gzip, os, sys, collections, re
R = '/home/claude/vahiy-/site/data'
# açılış sayaçları her kontrolde veriden yeniden hesaplanır (elle sayı yok)
import subprocess; subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_sayilar.py')], check=True)
errs = collections.defaultdict(list); info = {}
def E(k, m):
    if len(errs[k]) < 8: errs[k].append(m)
    errs[k + '#'] = errs.get(k + '#', 0) + 1 if False else None
cnt = collections.Counter()
def err(k, m):
    cnt[k] += 1
    if cnt[k] <= 5: errs[k].append(m)
S = json.load(open(f'{R}/k0/surahs.json'))['sureler']
AY = [x['ayet'] for x in S]
IDS = {f'{s}:{a}' for s in range(1, 115) for a in range(1, AY[s-1] + 1)}
info['ayet'] = len(IDS)
want = set(sys.argv[1:])
if 'k0' in want:
    words = set(); n = 0
    for s in range(1, 115):
        d = json.load(open(f'{R}/k0/s/{s}.json'))['ayetler']
        if [x['id'] for x in d] != [f'{s}:{a}' for a in range(1, AY[s-1]+1)]: err('k0_sira', s)
        for x in d:
            n += 1
            if not x.get('metin'): err('k0_metin_bos', x['id'])
            if not x.get('kelimeler'): err('k0_kelime_yok', x['id'])
            for w in x.get('kelimeler') or []:
                words.add(f"{x['id']}:{w['n']}")
                if not w.get('ar'): err('k0_kelime_ar_bos', f"{x['id']}:{w['n']}")
                if not w.get('tr'): cnt['k0_kelime_tr_eksik(uyari)'] += 1
            for k in ('cuz', 'sayfa'):
                if not (x.get('konum') or {}).get(k): err('k0_konum_eksik', x['id'])
        r = json.load(open(f'{R}/k0/r/{s}.json'))
    info['k0_ayet'] = n; info['k0_kelime'] = len(words)
    dz = json.load(open(f'{R}/k0/dizin.json'))
    for t in ('kok', 'lemma'):
        for k, v in dz[t].items():
            for w in v:
                if w not in words: err('k0_dizin_kopuk', f'{t}:{k}:{w}')
    mi = json.load(open(f'{R}/meal/index.json'))
    info['meal'] = len(mi['mealler'])
    for m in mi['mealler']:
        a = json.load(open(f"{R}/meal/{m['id']}.json"))
        if len(a) != 6236: err('meal_uzunluk', m['id'])
        e = sum(1 for t in a if not (t or '').strip())
        if e > 30: cnt['meal_kaynakta_eksik(uyari)'] += 1
        elif e: cnt['meal_bos_ayet(uyari)'] += e
if 'k1' in want:
    kon = json.load(open(f'{R}/k1/konular.json'))['konular']
    for s in range(1, 115):
        d = json.load(open(f'{R}/k1/{s}.json'))['ayetler']
        for k, L in d.items():
            if k not in IDS: err('k1_bilinmeyen_ayet', k)
            refs = [y for g in L.get('benzer_ifade', []) for y in g['ayetler']] + [y for g in L.get('ortak_ifade', []) for y in g['ayetler']] + (L.get('ayni_bolum') or {}).get('ayetler', [])
            for y in refs:
                if y not in IDS: err('k1_kopuk_bag', f'{k}->{y}')
            for t in L.get('konu', []):
                if str(t) not in kon and t not in kon: err('k1_kopuk_konu', f'{k}:{t}')
            if k in [y for g in L.get('ortak_ifade', []) for y in g['ayetler']]: err('k1_kendine_bag', k)
    for t, v in kon.items():
        for y in v['ayetler']:
            if y not in IDS: err('k1_konu_kopuk_ayet', f'{t}:{y}')
if 'k2' in want:
    ES = json.load(open(f'{R}/k2/eserler.json'))
    E2 = ES.get('eserler', ES)
    ids = set(E2) if isinstance(E2, dict) else {e['id'] for e in E2}
    info['k2_eser'] = len(ids); bos = 0; refbad = 0
    for s in range(1, 115):
        idx = json.load(open(f'{R}/k2/i/{s}.json'))
        idx = idx.get('ayetler', idx)
        for a in range(1, AY[s-1]+1):
            k = f'{s}:{a}'
            if not idx.get(k): bos += 1
            p = f'{R}/k2/t/{s}/{a}.json.gz'
            if not os.path.exists(p):
                if idx.get(k): err('k2_dosya_yok', k)
                continue
            d = json.load(gzip.open(p))
            P = d['p'] if isinstance(d, dict) else d
            for r in P:
                if r[0] not in ids: err('k2_bilinmeyen_eser', f'{k}:{r[0]}')
                if isinstance(r[-1], dict) and r[-1].get('ref') not in IDS: err('k2_kopuk_ref', f'{k}->{r[-1]}')
    info['k2_tefsirsiz_ayet'] = bos
if 'kx' not in want:
    out = {'bilgi': info, 'hata': {k: [cnt[k], v] for k, v in errs.items() if v is not None}, 'uyari': {k: v for k, v in cnt.items() if 'uyari' in k}}
    print(json.dumps(out, ensure_ascii=False, indent=1))
if 'kx' in want:
    import glob
    K = json.load(open(f'{R}/x/kitaplar.json'))['kitaplar']
    RV = json.load(open(f'{R}/k4/raviler.json'))['raviler']
    E2 = json.load(open(f'{R}/k2/eserler.json'))['eserler']
    for s in range(1, 115):
        for a in range(1, AY[s-1]+1):
            p = f'{R}/x/{s}/{a}.json.gz'
            if not os.path.exists(p): err('x_dosya_yok', f'{s}:{a}'); continue
            d = json.load(gzip.open(p))
            for g, L in d['k3'].items():
                for nb, n, hits in L:
                    if str(nb) not in K: err('k3_bilinmeyen_kitap', f'{s}:{a}:{nb}')
                    if n < len(hits): err('k3_sayi', f'{s}:{a}')
            for r in d['k4']:
                for v in r['raviler']:
                    if str(v) not in RV: err('k4_bilinmeyen_ravi', f'{s}:{a}:{v}')
            for r in d['k7']['ihtilaf']:
                if r[0] not in E2: err('k7_bilinmeyen_eser', f'{s}:{a}:{r[0]}')
    I5 = json.load(open(f'{R}/k5/index.json'))
    for r, n in I5['kokler'].items():
        if not os.path.exists(f'{R}/k5/r/{n}.json.gz'): err('k5_dosya_yok', r)
    for s in range(1, 115):
        for k, L in json.load(open(f'{R}/k6/{s}.json'))['ayetler'].items():
            if k not in IDS: err('k6_ayet', k)
            for x in L:
                if not os.path.exists(f"{R}/k6/m/{x['id']}.json"): err('k6_metin_yok', x['id'])
        K8 = json.load(open(f'{R}/k8/{s}.json'))
        for k, L in K8['ayet'].items():
            if k not in IDS: err('k8_ayet', k)
            for i in L:
                if str(i) not in K8['makale']: err('k8_makale_yok', i)
    info['k5_kok'] = len(I5['kokler'])
    out = {'bilgi': info, 'hata': {k: [cnt[k], v] for k, v in errs.items() if v is not None}, 'uyari': {k: v for k, v in cnt.items() if 'uyari' in k}}
    print(json.dumps(out, ensure_ascii=False, indent=1))
