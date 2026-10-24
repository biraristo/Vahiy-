# vahiy++ özellik defteri

## Senin talimatların (veri işleme)

1. İskelet, güncel kütüphaneyle (12.376 doğrulanmış eser) baştan doldurulacak; dünkü doğrulanmamış veri bırakılacak. İşe yarayan bütün eserler sistemde etkin kullanılacak, her alan için.
2. Ayet açılınca her başlık (tefsir, esbâb, selef, hadis, dil, fıkıh, kelâm…) bizim kütüphanemizdeki eserlerden dolacak.
3. Ricâl: bütün kitaplardan şahıslara dair ne varsa çıkarılacak; râvi kartında bir kişiye dair her şey görülecek.
4. Bütün lügatler ayetlerdeki kelimelerle eşleşecek.
5. Bütün eser adları Türkçe olacak.
6. Her şey istenince Türkçe okunabilecek; çeviri **her durumda ücretsiz** olacak. Önce veri işlenecek, sonra işe yarayan (sayfada görünen) kısımlar çevrilecek.
7. Kapsamlı bir fihrist veritabanı kurulacak (elimizdeki "dünyanın verisi"yle); ihtiyaç oldukça kullanılacak.
8. Bütün kitaplar işlenecek; hiçbir veri atlanmayacak, atlanmadığı denetlenecek.
9. İşlerken bulunan, siteye eklenebilecek özellikler bu deftere yazılacak ve verisi hazırlanacak; onaylanınca doğrudan eklenecek.
10. Veri işleme bir defa, her yönüyle ve ciddiyetle yapılacak.
11. Hiçbir okuma boşa gitmeyecek: her kitap türü (hadis usûlü, tahrîc, ricâl…) kendi sistemini kurmak için okunacak; külliyat en verimli şekilde kullanılacak.

## Bulunan özellikler

Veri işlenirken bulunan, siteye eklenebilecek özellikler. Her madde: ne, hangi veri, durum. Onaylanınca eklenir.

| # | Özellik | Veri | Durum |
|---|---|---|---|
| 1 | **Müellif sayfası**: bir müellifin bütün eserleri, vefatı, hangi ayetlerde ne söylediği (alıntı dizininden), ricâl kitaplarındaki biyografisi | müellif tablosu (Şâmile 3.188 + OpenITI), alıntı dizini | veri hazırlanıyor (Türkçe adlar) |
| 2 | **Ayetin asırlara göre ilgi grafiği**: bir ayetin hangi asırda kaç eserde alıntılandığı (alıntı dizini × vefat) | alıntı dizini | tarama sürüyor |
| 3 | **En çok alıntılanan ayetler / az ilgi görenler** listesi; sure bazında ilgi haritası | alıntı dizini | tarama sürüyor |
| 4 | **Eserin ayet haritası**: bir kitabın hangi sure ve ayetlere ne kadar değindiği (okuyucuda "Bu eserde geçen ayetler") | alıntı dizini | tarama sürüyor |
| 5 | **Kitaptan ayete ters bağ**: okuyucuda alıntılanan ayetler tıklanınca ayet sayfası açılır | alıntı dizini (bölüm + konum) | tarama sürüyor |
| 6 | **Konu fihristi sayfası** (bütün Kur'an): bir konu → ayetler, kaynak eserler, asırlar | fihrist veritabanı | planlandı |

## Külliyat → sistemler (her kitap türü bir kapı)

Ortak altyapı: her kitap bölüm bölüm okunur; **bölüm başlığı + bölümdeki ayet alıntıları + bölümdeki kişi/hadis/kelime** kaydedilir. Türe özel çıkarıcılar bunun üstüne kurulur.

| Tür (raf) | Çıkarılacak sistem | Sitede karşılığı |
|---|---|---|
| Tefsir | ayet → bölüm/sayfa eşlemesi; tefsirlerin pasaj taksimi; meseleler (bölüm başlıkları) | Tefsir bölümü, ayet ayet okuma, "Görüş ayrılıkları" |
| Ulûmü'l-Kur'ân: esbâb, nâsih-mensûh, müteşâbih, mekkî-medenî, fezâil | ayet → nüzûl sebebi, nesh ilişkileri (ağ), fazilet rivayetleri | Esbâb bölümü, nesh ağı, ayet künyesi |
| Kıraat ve tecvid | kelime → kıraat farkları, okuyan imam/râvi | Kelime paneli "Kıraat" |
| Garîb, i'râb, lügat | kelime/kök → anlam, i'râb, şâhid beyit | Kelime paneli "Lügatlerde", "Dilbilgisi" |
| Hadis kitapları (kütüb-i sitte, müsned, cüz) | hadis kaydı: kitap, numara, isnad, metin, bab başlığı | Hadis bölümü, hadis sayfası |
| Şerhler | hadis → şerh pasajı | Hadis sayfasında şerhler |
| Tahrîc ve etrâf | hadis ↔ hadis (aynı rivayetin kaynakları), hüküm (sahih/zayıf) | Hadisin "kaynakları" ağı, hüküm rozeti |
| İlel ve suâlât | hadis/râvi → illet notu | Hadis ve râvi kartında "İlel" |
| Usûl-i hadis | terim sözlüğü (sahih, hasen, mürsel…) tanımlarıyla | Terime dokununca tanım |
| Ricâl, tabakât, cerh-ta'dîl | kişi sicili: ad, künye, nisbe, tabaka, vefat, hocalar/talebeler, cerh-ta'dîl sözleri (kimden, hangi kitapta) | Râvi kartı ve kişi sayfası |
| Ensâb | nisbe/kabile → kişi | Kişi kartında nesep, kabile ağacı |
| Siyer, tarih | olay → tarih, yer, kişiler, ilgili ayetler | Olay zaman çizelgesi, ayetin tarihî bağlamı |
| Coğrafya, rıhle | yer adları sözlüğü (konum) | Yer haritası, ayette geçen yerler |
| Fıkıh (mezhepler), fetva | ayet → ahkâm meselesi, mezheplerin görüşü, delil | Fıkıh bölümü mezhep süzgeciyle; ahkâm ayetleri listesi |
| Usûl-i fıkıh, kavâid | ayet → usûl delili/kaide | Fıkıh bölümünde usûl katmanı |
| Akaid, fırak | ayet → itikadi mesele, fırkaların görüşü | Kelâm bölümü fırka süzgeciyle |
| Tasavvuf, rekâik | ayet → işârî yorum, zühd sözleri | Kelâm/tasavvuf bölümü |
| Edebiyat, şiir | beyit → kullanıldığı tefsir/lügat (şevâhid) | Kelime panelinde şâhid beyitler |
| Fihristler, câmi eserler | eser-müellif kataloğu doğrulaması | Kütüphane künyeleri |
| Mevzûî fihrist kitapları | konu → ayet | Konu fihristi |

## Durum (24.10.2026 18:55)
- Yayında: Türkçe eser/müellif adları; tüm kütüphane atıf dizini (ayet blokları); lügat (28 sözlük); ricâl (685 râvi biyografisi); kütüphane fihristi (8.738 konu, 2.400 Türkçe başlık).
- Toplu betikler R2'yi doğrudan okur (r2oku.py), sitenin /r2/ yolunu kullanmaz (Worker günlük 100k sınırı).
- Sıradaki: fihrist çevirisi girdi_04..12 (/home/claude/lib/tr/fk, cNN.txt satır satır hizalı → fihrist_tr.py); genel kişi kaydı (tüm biyografi maddeleri, müellifler, sahâbe/tâbiûn, cerh-ta'dîl, kişi sayfası); ters bağ (kitap bölümü → ayetler, veri R2 atif/kitap.bin'de hazır, onay bekliyor).
- 24.10 19:10 kullanıcı kararı: kütüphane atıfları (k3, ayet bloklarındaki "kütüphanede geçtiği yerler") site genelinde kapalı (ayet.js ATIF_ACIK=false); veri R2'de duruyor. Ricâl biyografileri ayet ekranından çıkarıldı; râvi adına tıklayınca #/kisi/{id} kişi sayfası açılır.
