"""Kütüphane manifestosu: her ham kaynağın adresi, sürümü, boyutu ve SHA-256 değeri.

Ham dosyalar depoya girmez; bu manifesto ile aynı sürümler yeniden indirilip doğrulanabilir.
"""
import hashlib, json, os, glob, datetime

RAW = '/home/claude/lib/raw'
OUT = '/home/claude/vahiy-/library/manifest.json'


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def dir_stats(d, pattern='*'):
    files = [p for p in glob.glob(f'{d}/**/{pattern}', recursive=True) if os.path.isfile(p)]
    return {'files': len(files), 'bytes': sum(os.path.getsize(p) for p in files)}


qp = json.load(open(f'{RAW}/qp_manifest.json'))
entries = []


def file_entry(name, path, url, version, license, note=''):
    if not os.path.exists(path):
        entries.append({'name': name, 'url': url, 'version': version, 'license': license, 'status': 'eksik', 'note': note})
        return
    entries.append({'name': name, 'url': url, 'version': version, 'license': license, 'status': 'indirildi',
                    'bytes': os.path.getsize(path), 'sha256': sha(path), 'note': note})


file_entry('Quranpedia tam veri paketi', f'{RAW}/qp_complete-all.zip', 'https://quranpedia.net/dumps/complete-all.zip',
           qp['version'], 'Quranpedia veri lisansı', 'Mushaflar (12 rivayet), 149 ayet-bölümlü tefsir, i\'rab, esbâb, nâsih, hizmet dosyaları, kitap fihristi')
file_entry('OpenITI birincil sürüm metaverisi', f'{RAW}/openiti_meta.tsv',
           'https://zenodo.org/records/17767721/files/OpenITI_metadata_2025-1-9.tsv', '2025.1.9 (doi:10.5281/zenodo.17767721)', 'CC BY-NC-SA 4.0')
file_entry('OpenITI birincil sürüm külliyatı', f'{RAW}/openiti_pri_data.zip',
           'https://zenodo.org/api/records/18613982/files/OpenITI-pri-data_v9.zip/content', '2025.1.9 pri (zenodo 18613982)', 'CC BY-NC-SA 4.0',
           'Kalıcı DOI arşivi; ham dosya yeniden yüklenmez, bu adresten doğrulanarak indirilir')
for t in ('uthmani', 'simple', 'simple-clean'):
    file_entry(f'Tanzil Kur\'an metni ({t})', f'{RAW}/tanzil/quran-{t}.xml',
               f'https://tanzil.net/pub/download/index.php?quranType={t}&outType=xml', '1.1', 'CC BY 3.0, metin değiştirilemez')
file_entry('Tanzil sure metaverisi', f'{RAW}/tanzil/quran-data.xml', 'https://tanzil.net/res/text/metadata/quran-data.xml', '1.0', 'CC BY 3.0')

groups = [
    ('Quranpedia kitap tam metinleri', f'{RAW}/qp_books', 'https://api.quranpedia.net/books-contents/book-{id}.json', 'Quranpedia veri lisansı; çağdaş eserlerde müellif hakları saklı'),
    ('Quranpedia mealleri', f'{RAW}/qp_trans', 'https://quranpedia.net/translation-books/{id}.json', 'Mütercim/yayıncı hakları saklı'),
    ('Tanzil mealleri', f'{RAW}/tanzil/trans', 'https://tanzil.net/trans/?transID={id}&type=txt-2', 'Tanzil: ticari olmayan kullanım'),
    ('tafsir_api (QUL) Arapça ve Türkçe tefsirler', f'{RAW}/tafsir_api', 'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/{slug}/{surah}.json', 'MIT paketleme; içerik kaynağına bağlı'),
    ('Corpus Coranicum TEI', f'{RAW}/cc', 'https://github.com/telota/corpus-coranicum-tei', 'CC BY 4.0'),
]
for name, d, url, lic in groups:
    st = dir_stats(d)
    entries.append({'name': name, 'url': url, 'license': lic, 'status': 'indirildi' if st['files'] else 'eksik', **st})

entries.append({'name': 'QAC morfoloji (mustafa0x çatalı)', 'url': 'https://github.com/mustafa0x/quran-morphology', 'license': 'GNU GPL',
                'status': 'indirildi' if os.path.exists('/tmp/qm/quran-morphology.txt') else 'eksik'})

not_collected = [
    {'name': 'Quranpedia PDF ekleri', 'records': 14628,
     'reason': 'Çoğu çağdaş ve telifli eser; toplam boyut çok büyük. Katalogda künyesi ve bağlantısı var, gerektiğinde tek tek indirilecek.'},
    {'name': 'Şâmile (shamela.ws) külliyatı', 'records': 'yaklaşık 8.500 kitap (kategori sayılarının toplamı)',
     'reason': 'Kullanım şartları dizinin tamamının yeniden kurulmasını yasaklıyor. Metinlerin büyük kısmı OpenITI üzerinden zaten mevcut; sayfa doğrulaması için kitap bazında kullanılacak.'},
    {'name': 'archive.org taranmış neşirler', 'records': '-',
     'reason': 'Cilt/sayfa doğrulaması için ihtiyaç duyuldukça eser bazında indirilecek.'},
]

json.dump({'generated': datetime.datetime.now().isoformat(timespec='seconds'), 'sources': entries, 'not_collected': not_collected},
          open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print(json.dumps([{k: e.get(k) for k in ('name', 'status', 'files', 'bytes')} for e in entries], ensure_ascii=False, indent=1))
