"""Atıf dizinini kitap biçimiyle paketler: gzip üyeleri art arda tek .bin, ofsetler statik sitede.
R2: atif/ayet.bin (ayet → kitap listesi), atif/parca.bin (ayet → metin parçaları), atif/kitap.bin (kitap → bölüm → ayetler)
Site: data/y/ofs.json = {"ayet": {"s:a": [off, len]}, "parca": {...}, "kitap": {id: [off, len]}}
İstemci Range ile tek parçayı çeker, DecompressionStream ile açar (kutuphane.js bolumAl ile aynı yol).
Kullanım: python3 atif_paket.py [--yukleme-yok]"""
import os, sys, json, glob
R2 = '/home/claude/lib/atif/r2'; SITE = '/home/claude/vahiy-/site/data/y'
yukle = '--yukleme-yok' not in sys.argv
sys.argv = [sys.argv[0], '--yukleme-yok']
from shamela_paket import put
def paket(dosyalar, anahtar):
    O = {}; parcalar = []; off = 0
    for k, p in dosyalar:
        b = open(p, 'rb').read(); O[k] = [off, len(b)]; parcalar.append(b); off += len(b)
    blob = b''.join(parcalar)
    print(anahtar, len(O), round(len(blob) / 1e6, 1), 'MB', flush=True)
    if yukle and not put(f'atif/{anahtar}.bin', blob, 'application/octet-stream'): sys.exit('yüklenemedi ' + anahtar)
    return O
def ayetler(d):
    L = []
    for s in sorted(os.listdir(d), key=lambda x: int(x) if x.isdigit() else 999):
        if not s.isdigit(): continue
        for f in sorted(os.listdir(f'{d}/{s}'), key=lambda x: int(x.split('.')[0])): L.append((f"{s}:{f.split('.')[0]}", f'{d}/{s}/{f}'))
    return L
OFS = {'ayet': paket(ayetler(R2), 'ayet'), 'parca': paket(ayetler(f'{R2}/p'), 'parca'),
       'kitap': paket(sorted((os.path.basename(p)[:-5], p) for p in glob.glob(f'{R2}/kitap/*.json')), 'kitap')}
json.dump(OFS, open(f'{SITE}/ofs.json', 'w'), separators=(',', ':'))
print('ofs.json', round(os.path.getsize(f'{SITE}/ofs.json') / 1e3), 'KB')
