# vahiy++ kütüphanesi — ham kaynak arşivi

Bu dal (`kutuphane`) yalnızca ham kaynak dosyalarını saklar; site `main` dalından yayınlanır.

| Klasör | Kaynak |
|---|---|
| quranpedia/ | Quranpedia veri paketi (mushaflar, ayet-bölümlü tefsirler, hizmetler), 1.468 kitap tam metni, mealler |
| qurancom/ | Quran.com API v4: 126 meal, Türkçe/İngilizce kelime mealleri, sure tanıtımları |
| sefaria/ | Sefaria: Tanah, Targum, Mişna, Tosefta, Talmud, Midraş, İkinci Tapınak metinleri |
| tanzil/ | Tanzil Kur'an metinleri ve 113 meal |
| tafsir_api/ | QUL kaynaklı Arapça/Türkçe ayet-bölümlü tefsirler |
| git_pins.txt | Kopyalanmayan kalıcı kaynakların (Perseus, LXX, Peşitta, Corpus Coranicum TEI…) tam sürümleri |

OpenITI (CC BY-NC-SA 4.0) burada değildir: kalıcı arşivi doi:10.5281/zenodo.18613982 (sürüm 2025.1.9 pri).

**100 MB'tan büyük dosyalar** parçalara bölündü (`BUYUK_DOSYALAR.txt`). Birleştirmek için:
`cat dosya.json.gz.part-* > dosya.json.gz`

Bütün içerik yalnızca kişisel araştırma içindir; her kaynağın kendi lisansı geçerlidir.
