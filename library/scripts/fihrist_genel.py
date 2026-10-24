"""Fihrist etiketlerini genel başlıklara bağlar ve her ayete bir genel konu verir → site/data/fh/genel.json
Genel başlıklar (Claude sınıflaması): kissa, iman, ahiret, hukum, ahlak; listede olmayan etiket 'diger'.
Ayetin genel konusu: kıssa etiketi varsa kıssa; yoksa etiketlerinin ağırlıklı çoğunluğu; ağırlık = 1 / log2(2 + etiketin Kur'an'daki ayet sayısı)
(çok genel etiketler rengi belirlemesin diye). Etiketi olmayan ayet: null."""
import json, math, os, collections
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'data')
ET = json.load(open(f'{D}/fh/etiket.json')); E = ET['etiketler']
G = {
 'kissa': """Adem (a.s)|Ademoğulları|Habil ve Kabil|Nuh (a.s) ve Kavmi|Tufan|Cudi|Hud (a.s) Ve Ad Kavmi|İrem|Salih (a.s) ve Semud Kavmi|Hicr Halkı|İbrahim (a.s) Kavmi|Azer|İsmail (a.s)|İshak (a.s)|Lut (a.s) ve Kavmi|Yakup (a.s)|Yusuf (a.s)|Başak Rüyası ve Tabiri|Başak Örneği|Şuayb (a.s) ve Medyen Halkı|Eykeliler|Hz.Musa (a.s)|Harun (a.s)|Firavun|Haman|Karun|Samiri|Buzağıya Tapınma|Cumartesi Yasağı|İsrailoğulları|İsrail|Tur-i Sina|Tuva|Talut|Calut|Davud (a.s)|Süleyman (a.s)|Saba Melikesi|Hüdhüd|İfrit|Zekeriya (a.s)|Yahya (a.s)|İmran|Meryem|İsa (a.s)|Mesih|Havari|Yunus (a.s)|Eyüb (a.s)|İdris (a.s)|İlyas (a.s)|Elyesa (a.s)|Zülkifl|Lokman (a.s)|Üzeyir (a.s)|Zü'l-Karneyn|Ye'cüc Me'cüc|Ashab-ı Kehf|Rakim Sahipleri|Ashab-ı Uhdud|Fil Sahipleri|Ebu Leheb|Tubba Kavmi|Ress Hakkı|Arim Seli|Harut ve Marut|Babil|Bedir|Uhud Savaşı|Hendek Savaşı|Huneyn Günü|Hudeybiye Barışı|Tebuk Seferi|Hicret|Muhacir|Ensar|Zeyd|Kıssa|Peygamberleri Hatırlamak|Nesr|Suva|Vedd|Ye'uk|Yeğus|Uzza|Mısır|Rum|Kureyş""",
 'iman': """Allah Her Yerdedir|Allah'ın Birliği|Allah'ın İnsanlara Yakınlığı|Allah'ın İsimleri|Allah'ın Rızası|Tevhid|Rahman|Arş (Kürsü)|İstiva|Kader|Gayb|Levh-i Mahfuz|Vahiy|Kur'an|Furkan|Kitaplar|Tevrat|İncil|Zebur|Sahife|Melekler|Cebrail (a.s)|Mikail (a.s)|Ruhu-l Kudüs|Cinler|Şeytan|İblis|Peygamberler|Muhammed'in (a.s) Peygamberliği|Risaliyet|Nebi|Ahmed (a.s)|Mucize|Delil|Belge|Kanıt|İspat|Kainatın Yaratılışı|Gökler|Yeryüzü|Alemler|Güneş|Ay|Yıldız|Gece|Sabah|Gölge|Rüzgar|Bulut|Yağmur|Şimşek|Yıldırım|Dağ|Deniz|Irmak|Bitki|Hayvanlar|Döl Yatağı|Cenin|Damla|Balçık|Çamur|Toprak|Fıtrat|Kalu Bela|Misak|İman|Müminler|Kafir|Küfür|Müşrik|Şirk|Ortak Koşmak|Put|Tağut|Münafıklar|Hanif (Muhavvid)|Muvahhid|Teslis-Üçleme|Kitap Ehli|Yahudi|Hıristiyanlar|Sabii|Mecusi|İslam|Din|Hidayet|Nur|Tesbih|Hamd|Mevla|Veli|Vekil|Müheymin|Mütekebbir|Müstağni|Aziz|Hak|Batıl|Uyarıcı|Müjdeleşme|Tebliğ|Davet|Kuşku|Sihir|Büyü-Büyücü|Kahin|Şair|Efsane|Muhkem ve Müteşabih Ayetler|Neshetmek|Arapça""",
 'ahiret': """Ahiret|Kıyamet|Saat|Din Günü|Dirilme-Diriliş|Haşr|Sur|Sorgu-Hesap Anı|Amel Defteri|Amel Terazisi|Şefaat|Cennet|Adn|Huri|Selsebil|Kevser|Zencefil|Cehennem|Ateş|Alev|Hutame|Zakkum|Zebaniler|Siccin|Araf|Ashab-ı Yemin|Ashab-ı Meymene|Ashab-ı Meş'eme|Kabir|Ölüm|Ölüm Baygınlığı-Sarhoşluğu|Ecel|Ölü|Ceza|Mükafat|Ödül|Ecir|Sevap|Hüsran|Sonsuzluk|Karia|Vakia|Dabbet-ül Arz|Sidretü'l Münteha""",
 'hukum': """Abdest|Gusül|Teyemmüm|Cünüplük|Temizlik|Namaz|Salat|Rüku|Secde|Kıyam Etmek|Kıble|Cuma|Savaşta Namaz|Oruç|Ramazan|Kadir Gecesi|İtikaf|Zekat|Sadaka|İnfak|Hacc|Umre|İhram|Tavaf|Safa ve Merve|Arafat|Meş'ar-ı Haram|Kabe|Mescid-i Haram|Haram Aylar|Kurban|Adak|Yemin|Yemini Bozmak|Yeminin Kefareti|Keffaret|Fidye|Nikah|Evlilik|Boşanmak|İddet|Zıhar|Emzirmek|Süt Anaları|Nafaka|Miras Hükümleri|Vasiyet|Varis|Borç|Faiz|Ticaret|Ölçüyü-Tartıyı Tam Tutma|Tartı|Ölçü|Kısas|Zina|Hırsız-Hırsızlık|Eşcinsellik-Livata|İçki|Kumar|Fal Okları|Domuz|Leş|Haram|Helal Rızık|Yasak|Cihad|Savaş|Ganimetler|Fey|Cizye|Esirler|Savaşmama İzni Alanlar|Savaşta Taktik ve Tedbirler|Savaştan Kaçanlar ve Bozguncular|Antlaşma|Ahid-Anlaşma|Söz Verme|Şahitlik|Katip|Emanet|Emanete Riayet|Kadınların Giyimi|Kadınların Mahremleri|Mahrem Olanlar|Evlere Girme|İstişare|Şura|Hüküm-Hükmetmek|Hakem|Fetva|Şeriat|Cariyeler|Köle|Yetim|Evlat Edinme|Adet Görme|Hayız|Erginlik|Karı-Kocanın Arasını Düzeltmek|Ara Bulma|Selam|Kadınlar|Eşler|Aile""",
 'ahlak': """Adalet-Adil Olmak|Affetmek|Bağışlamak (Affetmek)|Sabır|Şükür|Nankörlük|Tevekkül|Takva|Allah Korkusu|Haşyet|Muttaki|İhlas|Gösteriş Yapmak|Kibir|Büyüklük Taslamak|Böbürlenmek|Alçak Gönüllülük|Tevazu|Cimrilik|İsraf|İfrat-Tefrit|Doğruluk|Yalan|İftira|Zan|Gıybet|Fısıldaşma|Kötü Ad Takmamak|Alay|Başa Kakmak|Hile|Aldatmak-Aldatılmak|Hainlik-İhanet|İhanet|Güvenilirlik|Merhamet|Şefkat|İyilik|Hayır (İyilik)|Kötülük|Şer|Öfkelenmek|Kin|Kıskançlık|Tutku|Heva|Nefis|Kalp|Akıl|Düşünmek-Tefekkür|Basiret|Öğüt|Ders|Hikmet|İlim|Bilgi|Alimler|Cahillik|Tevbe|İstiğfar|Dua|Yalvarmak|Zikir|Zikr|Allah'ı Anmak|Teslimiyet|İbadet|Kul-Kulluk|Amel|Günah|Suç-Suçlu|Zulm|Zalim|Fasık|Fısk|Fesat-Fesatçılık|Bozgunculuk|Azgın|Taşkınlık|Şımarmak-Şımarıklık|Fuhuş|İffet|Akraba|Komşu|Yoksul|Fakirlik-Fakirler|Yolcu|Kardeşlik-Kardeşler|Dost|Düşman|Güzel Söz|Kötü Söz|Boş Söz ve Amel|Acelecilik|Kolaylık|Zorluk-Zorlama|İmtihan|Denemek|Belalar|Musibet|Dünya|Meta|Süs|Mallar|Servet|Zenginlik-Zenginler|Gurur-Aldanma|Aldanış|Lanet|Gazap|Rahmet|Nimet|Rızık|Bereket|Fazl-İhsan|Mutluluk|Mutsuzluk|Ümitsizlik|Sevgi|Saygi|İtaat, İsyan ve Elçinin Görevi|Örf|Utanmaz|Gönülden Yapılan Davranışlar|Islah|Hoşgörmek|Ülfet|Birlik|Anlaşmazlık|Fitne|Tartışma|Çekişmek|Ümmet|Orta (Orta Bir Ümmet)|Atalar|Vaad|Sünnet|Şuur|Ebrar|Muhsin|Sadık"""}
ADI = {'kissa': 'Kıssa', 'iman': 'İman ve tevhid', 'ahiret': 'Ahiret', 'hukum': 'Hüküm', 'ahlak': 'Ahlâk ve öğüt', 'diger': 'Diğer'}
K = {}
for g, s in G.items():
    for ad in s.split('|'): K.setdefault(ad.strip(), g)
ad2i = {e[0]: i for i, e in enumerate(E)}
eksik = [ad for ad in K if ad not in ad2i]
tg = ['diger'] * len(E)
for ad, g in K.items():
    if ad in ad2i: tg[ad2i[ad]] = g
AY = {}
S = json.load(open(f'{D}/k0/surahs.json'))['sureler']
for s in range(1, 115):
    F = json.load(open(f'{D}/fh/{s}.json'))['ayetler']
    L = []
    for a in range(1, S[s - 1]['ayet'] + 1):
        T = F.get(str(a), [])
        if not T: L.append(None); continue
        if any(tg[i] == 'kissa' for i in T): L.append('kissa'); continue  # anlatı bağlamı ayetin genel konusunu belirler
        p = collections.Counter()
        for i in T: p[tg[i]] += 1 / math.log2(2 + len(E[i][1]))
        if len(p) > 1 and 'diger' in p: p['diger'] *= .5
        L.append(p.most_common(1)[0][0])
    AY[s] = L
json.dump({'kaynak': 'Genel başlıklar Claude tarafından KuranFihristi.net etiketlerinden sınıflandı', 'adlar': ADI, 'etiket_genel': tg, 'sureler': AY},
          open(f'{D}/fh/genel.json', 'w'), ensure_ascii=False, separators=(',', ':'))
c = collections.Counter(g for L in AY.values() for g in L)
print('listede olup fihristte olmayan', eksik[:20]); print('etiket dağılımı', collections.Counter(tg)); print('ayet dağılımı', c)
