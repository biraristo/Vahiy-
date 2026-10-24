// vahiy++ — /r2/<anahtar> isteklerini R2 kovasından (vahiy) sunar; geri kalan her şey statik dosyalardır.
// Kitap metinleri tek dosyada ardışık gzip bölümleridir; okuyucu yalnız açtığı bölümü Range ile ister.
// /api/cevir: Arapça pasajın Türkçe makine çevirisi (Workers AI, yalnız ücretsiz günlük kota içinde).
// Her çeviri bir kez yapılır ve R2'de (ceviri/) saklanır; günlük sınır dolunca 429 döner, sayfa Google Çeviri bağlantısı gösterir.
const CEVIRI_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const GUNLUK_SINIR = 150;   // istek/gün: her istek en çok 2.500 harf; tahmini tüketim ücretsiz 10.000 birimin altında kalır
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
async function cevir(req, env) {
  if (req.method !== 'POST') return json({ hata: 'Yalnızca POST' }, 405);
  let metin = '';
  try { metin = String((await req.json()).metin || '').trim(); } catch { return json({ hata: 'Geçersiz istek' }, 400); }
  if (!metin) return json({ hata: 'Metin yok' }, 400);
  if (metin.length > 2500) return json({ hata: 'Metin çok uzun (en çok 2.500 harf)' }, 413);
  const ozet = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(metin)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const kayit = await env.KUTUP.get(`ceviri/${ozet}.txt`);
  if (kayit) return json({ ceviri: await kayit.text(), saklı: true });
  const gun = new Date().toISOString().slice(0, 10), sk = `ceviri/_sayac/${gun}`;
  const sayac = +(await (await env.KUTUP.get(sk))?.text() || 0);
  if (sayac >= GUNLUK_SINIR) return json({ hata: 'Bugünkü ücretsiz çeviri kotası doldu' }, 429);
  await env.KUTUP.put(sk, String(sayac + 1));
  let cevap;
  try {
    cevap = await env.AI.run(CEVIRI_MODEL, { max_tokens: 3000, temperature: 0.2, messages: [
      { role: 'system', content: "Sen klasik Arapça İslâmî metinleri Türkçeye çeviren bir çevirmensin. Verilen metni eksiksiz, sadık ve akıcı bir Türkçeyle çevir. Kur'an ayetlerini ﴿ ﴾ içinde Arapça bırakıp hemen ardından parantez içinde Türkçe anlamını ver. Özel isimleri TDV İslâm Ansiklopedisi yazımıyla yaz (ör. İbn Abbâs, Mücâhid). İsnadlardaki 'haddesenâ, ahberanâ, an' kalıplarını 'bize ... rivayet etti', '... -den' diye çevir. Açıklama ekleme; yalnızca çeviriyi yaz. /no_think" },
      { role: 'user', content: metin }] });
  } catch (e) { return json({ hata: 'Çeviri servisi şu an yanıt vermiyor' }, 503); }
  const ceviri = String(cevap?.response ?? cevap?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!ceviri) return json({ hata: 'Çeviri boş döndü' }, 502);
  await env.KUTUP.put(`ceviri/${ozet}.txt`, ceviri, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } });
  return json({ ceviri });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/cevir') return cevir(req, env);
    if (!url.pathname.startsWith('/r2/')) return env.ASSETS.fetch(req);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Yalnızca GET', { status: 405 });
    const key = decodeURIComponent(url.pathname.slice(4));
    if (!key || key.includes('..')) return new Response('Geçersiz anahtar', { status: 400 });
    // yalnız yayımlanan kitaplar dışarı açılır; ham arşiv (ham/) ve diğer anahtarlar kapalıdır
    if (!/^kitap\//.test(key)) return new Response('Bulunamadı', { status: 404 });
    const rh = req.headers.get('range');
    const m = rh && /^bytes=(\d+)-(\d+)$/.exec(rh);
    const range = m ? { offset: +m[1], length: +m[2] - +m[1] + 1 } : undefined;
    const obj = await env.KUTUP.get(key, range ? { range } : { onlyIf: req.headers });
    if (obj === null) return new Response('Bulunamadı', { status: 404 });
    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set('etag', obj.httpEtag);
    h.set('cache-control', 'public, max-age=86400');
    h.set('access-control-allow-origin', '*');
    h.set('accept-ranges', 'bytes');
    if (!('body' in obj)) return new Response(null, { status: 304, headers: h });
    if (range) {
      h.set('content-range', `bytes ${range.offset}-${range.offset + range.length - 1}/${obj.size}`);
      h.set('content-length', String(range.length));
      return new Response(req.method === 'HEAD' ? null : obj.body, { status: 206, headers: h });
    }
    const gz = h.get('content-encoding') === 'gzip';
    return new Response(req.method === 'HEAD' ? null : obj.body, { headers: h, encodeBody: gz ? 'manual' : 'automatic' });
  }
};
