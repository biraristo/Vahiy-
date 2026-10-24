// vahiy++ — /r2/<anahtar> isteklerini R2 kovasından (vahiy) sunar; geri kalan her şey statik dosyalardır.
// Kitap metinleri tek dosyada ardışık gzip bölümleridir; okuyucu yalnız açtığı bölümü Range ile ister.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/r2/')) return env.ASSETS.fetch(req);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Yalnızca GET', { status: 405 });
    const key = decodeURIComponent(url.pathname.slice(4));
    if (!key || key.includes('..')) return new Response('Geçersiz anahtar', { status: 400 });
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
