// vahiy++ MCP sunucusu (Streamable HTTP, JSON yanıt). Claude'a "özel bağlayıcı" olarak eklenir: https://<site>/mcp
// Ücretsiz Workers planında istek başına işlemci süresi kısa olduğu için:
//  - küçük, satır tabanlı veri (site/data/mcp/*, build_mcp.py) yalıtım (isolate) başına bir kez okunur ve bellekte tutulur;
//  - kitap metni R2'den yalnız istenen bölüm(ler) aralığıyla (Range) okunur;
//  - kitap içinde arama bir çağrıda sınırlı bayt tarar, kalan için "devam" noktası döner.
const SURUM = '0.1.0';
const SITE = 'https://vahiy.bunyaminatalay07.workers.dev';
const TARAMA_BAYT = 600_000;   // kitapta_ara: bir çağrıda en çok bu kadar sıkıştırılmış veri
const OKUMA_HARF = 14_000;     // bolum_oku: bir çağrıda dönen en çok harf
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-expose-headers': 'mcp-session-id' };

const bellek = new Map();
const tut = (k, f) => { if (!bellek.has(k)) bellek.set(k, f().catch(e => { bellek.delete(k); throw e; })); return bellek.get(k); };
const varlik = (env, yol) => tut('v:' + yol, async () => { const r = await env.ASSETS.fetch(new Request(SITE + yol)); if (!r.ok) throw new Error('veri yok: ' + yol); return r.text(); });
async function gunzip(buf) { return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
async function r2(env, key, range) { const o = await env.KUTUP.get(key, range ? { range } : undefined); if (!o) return null; return o.arrayBuffer(); }

// --- Arapça ve Türkçe sadeleştirme (build_mcp.py anahtar() ile aynı)
const sade = s => String(s || '').replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().replace(/[âáà]/g, 'a').replace(/[îí]/g, 'i').replace(/[ûú]/g, 'u').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/[’'`ʿʾ\-]/g, '');
// metinde hareke/tatvil arada olsa da eşleşen düzenli ifade
const HAR = '[\\u064B-\\u0652\\u0670\\u0640]*';
const KUME = { 'ا': '[اأإآٱ]', 'أ': '[اأإآٱ]', 'إ': '[اأإآٱ]', 'آ': '[اأإآٱ]', 'ٱ': '[اأإآٱ]', 'ي': '[يى]', 'ى': '[يى]', 'ه': '[هة]', 'ة': '[هة]' };
function aramaRe(q) {
  const t = String(q).replace(/[ً-ْٰـ]/g, '').trim();
  if (!t) return null;
  const p = [...t].map(c => /\s/.test(c) ? '\\s+' : (KUME[c] || c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) + HAR).join('');
  return new RegExp(p, /[a-z]/i.test(t) ? 'gi' : 'g');
}

// --- veri
const eserler = env => tut('eserler', async () => (await varlik(env, '/data/mcp/eserler.tsv')).split('\n').filter(Boolean).map(l => l.split('\t')));
const eserHarita = env => tut('eserMap', async () => { const m = new Map(); for (const e of await eserler(env)) { m.set(e[0], e); m.set(e[7], e); } return m; });
const atifKitap = env => tut('k', async () => { const m = new Map(); for (const l of (await varlik(env, '/data/mcp/k.tsv')).split('\n')) { const p = l.split('\t'); if (p[0]) m.set(p[0], p); } return m; });
const dizinler = new Map();
async function dizin(env, id) {
  if (dizinler.has(id)) return dizinler.get(id);
  const b = await r2(env, `kitap/${id}.json`);
  if (!b) return null;
  let d; try { d = JSON.parse(await gunzip(b)); } catch { d = JSON.parse(new TextDecoder().decode(b)); }
  if (dizinler.size > 30) dizinler.delete(dizinler.keys().next().value);
  dizinler.set(id, d.b); return d.b;
}
const temizMetin = t => t.replace(/\x01([^\x01]*)\x01/g, (m, x) => ` ⟨s. ${x.replace(':', '/')}⟩ `).replace(/\n\x04/g, '\n[dipnot] ').replace(/\x04/g, '');
async function bolumler(env, id, b, ilk, son) {   // [ilk, son] aralığındaki bölümlerin metni (tek R2 okuması)
  const L = []; for (let i = ilk; i <= son; i++) if (b[i] && b[i][3]) L.push(i);
  if (!L.length) return [];
  const bas = b[L[0]][2], bit = b[L[L.length - 1]][2] + b[L[L.length - 1]][3];
  const buf = await r2(env, `kitap/${id}.bin`, { offset: bas, length: bit - bas });
  return Promise.all(L.map(async i => [i, await gunzip(buf.slice(b[i][2] - bas, b[i][2] - bas + b[i][3]))]));
}
async function eserBul(env, id) {
  const m = await eserHarita(env), e = m.get(id);
  return { e, oku: e ? e[7] : id };
}
const eserAdi = e => e ? `${e[3] || e[4]}${e[5] ? ' — ' + e[5] : ''}${e[2] ? ` (ö. ${e[2]})` : ''}` : '';
const sayfaAl = (t, i) => { const m = [...t.slice(0, i).matchAll(/\x01([^\x01]*)\x01/g)].pop(); return m ? m[1].replace(':', '/') : ''; };

// --- araçlar
const ARACLAR = [
  { name: 'eser_ara', title: 'Eser ara',
    description: "vahiy++ kütüphanesinde (12 bini aşkın klasik İslâmî eser: tefsir, hadis, fıkıh, kelam, lügat, tarih, tabakat…) eser adı veya müellif adıyla arar. Arapça ya da Türkçe yazılabilir (ör. 'taberi', 'جامع البيان', 'ibn kesir', 'lisanul arab'). Dönen 'eser_id' ile icindekiler, bolum_oku ve kitapta_ara kullanılır.",
    inputSchema: { type: 'object', properties: { sorgu: { type: 'string', description: 'Eser veya müellif adı (birkaç kelime; hepsi geçmeli)' }, raf: { type: 'string', description: 'İsteğe bağlı raf: tefsir, ulum, hadis, hadisusul, kelam, fikih, usul, tasavvuf, tarih, tabakat, lugat, edebiyat, felsefe, farsca, genel' }, adet: { type: 'integer', description: 'En çok sonuç (varsayılan 15, en çok 40)' } }, required: ['sorgu'] } },
  { name: 'icindekiler', title: 'İçindekiler',
    description: 'Bir eserin bölüm listesi (bölüm no, düzey, başlık). Büyük kitaplarda "ara" ile başlıklarda süzün ya da "baslangic" ile sayfalayın. Bölüm no bolum_oku için kullanılır.',
    inputSchema: { type: 'object', properties: { eser_id: { type: 'string' }, ara: { type: 'string', description: 'Başlıklarda geçen kelime (Arapça; harekeler önemsiz)' }, baslangic: { type: 'integer', description: 'İlk bölüm no (varsayılan 0)' }, adet: { type: 'integer', description: 'Varsayılan 100, en çok 300' } }, required: ['eser_id'] } },
  { name: 'bolum_oku', title: 'Bölüm oku',
    description: `Bir eserin bir bölümünün tam metni (Arapça). Uzun bölümler ${OKUMA_HARF} harflik parçalar hâlinde döner; devamı için "baslangic" verin. "ara" verilirse okuma o ifadenin ilk geçtiği yerden başlar (ör. lügatte madde başı). ⟨s. c/p⟩ işaretleri cilt/sayfa, [dipnot] dipnottur.`,
    inputSchema: { type: 'object', properties: { eser_id: { type: 'string' }, bolum: { type: 'integer' }, baslangic: { type: 'integer', description: 'Bölüm içindeki harf konumu (varsayılan 0)' }, ara: { type: 'string' } }, required: ['eser_id', 'bolum'] } },
  { name: 'kitapta_ara', title: 'Kitapta ara',
    description: 'Bir eserin tam metninde kelime/ifade arar (Arapça; harekeler, elif/hemze ve yâ/tâ farkları önemsenmez). Büyük kitaplar parça parça taranır: yanıt kaç bölümün tarandığını ve devam için "bolum_bas" değerini söyler. Bulunan yerler bölüm no, sayfa ve kısa alıntıyla döner; tam metin için bolum_oku.',
    inputSchema: { type: 'object', properties: { eser_id: { type: 'string' }, sorgu: { type: 'string' }, bolum_bas: { type: 'integer', description: 'Taramanın başlayacağı bölüm (varsayılan 0)' }, bolum_son: { type: 'integer', description: 'İsteğe bağlı son bölüm' } }, required: ['eser_id', 'sorgu'] } },
  { name: 'ayet', title: 'Ayet',
    description: 'Bir ayetin Arapça metni ve Diyanet meali; sitedeki ayet sayfasının bağlantısı.',
    inputSchema: { type: 'object', properties: { sure: { type: 'integer' }, ayet: { type: 'integer' }, bitis: { type: 'integer', description: 'İsteğe bağlı: aralığın son ayeti (en çok 20 ayet)' } }, required: ['sure', 'ayet'] } },
  { name: 'ayeti_alintilayanlar', title: 'Ayeti alıntılayan eserler',
    description: 'Kütüphanenin tamamı taranarak bulunmuş, bir ayeti alıntılayan eserler; ilim dalına göre gruplu (tefsir, hadis, fikih, kelam, tasavvuf, tarih, dil, ulum, cagdas…). Her eser için alıntı sayısı ve bölüm/sayfa yerleri döner; metin için bolum_oku.',
    inputSchema: { type: 'object', properties: { sure: { type: 'integer' }, ayet: { type: 'integer' }, grup: { type: 'string', description: 'İsteğe bağlı tek grup' }, adet: { type: 'integer', description: 'Grup başına en çok eser (varsayılan 12)' } }, required: ['sure', 'ayet'] } },
  { name: 'lugat', title: 'Lügat maddesi',
    description: "Bir Kur'an kökünün klasik Arapça sözlüklerdeki (Lisânü'l-Arab, Mekāyîs, Müfredât, Sıhâh…) maddeleri: sözlük, bölüm no ve madde başlığı. Metni okumak için bolum_oku(eser_id, bolum, ara=<madde başlığı>).",
    inputSchema: { type: 'object', properties: { kok: { type: 'string', description: 'Arapça kök, ör. قوم, كرس, رحم' } }, required: ['kok'] } },
];

async function calistir(ad, a, env) {
  if (ad === 'eser_ara') {
    const q = sade(a.sorgu).split(/\s+/).filter(Boolean); if (!q.length) throw new Error('sorgu boş');
    const n = Math.min(+a.adet || 15, 40), out = [];
    for (const e of await eserler(env)) {
      if (a.raf && e[1] !== a.raf) continue;
      if (q.every(w => e[8].includes(w))) { out.push(e); if (out.length >= n) break; }
    }
    if (!out.length) return 'Eşleşen eser yok. Daha kısa ya da Arapça yazımla deneyin.';
    return out.map(e => `• eser_id=${e[7]} · ${e[3] || e[4]} (${e[4]}) — ${e[5] || e[6]}${e[2] ? `, ö. ${e[2]}` : ''} · raf: ${e[1]} · ${SITE}/#/eser/${e[7]}`).join('\n');
  }
  if (ad === 'icindekiler') {
    const { e, oku } = await eserBul(env, a.eser_id); const b = await dizin(env, oku);
    if (!b) throw new Error('Bu eserin metni bulunamadı: ' + a.eser_id);
    const re = a.ara ? aramaRe(a.ara) : null, bas = Math.max(0, +a.baslangic || 0), n = Math.min(+a.adet || 100, 300), out = [];
    for (let i = bas; i < b.length && out.length < n; i++) { if (re) { re.lastIndex = 0; if (!re.test(b[i][1])) continue; } out.push(`${i}\t${'  '.repeat(Math.max(0, b[i][0] - 1))}${b[i][1]}${b[i][3] ? '' : ' (metinsiz başlık)'}`); }
    const son = out.length ? +out[out.length - 1].split('\t')[0] : bas;
    return `${eserAdi(e)} · eser_id=${oku} · toplam ${b.length} bölüm\n` + (out.join('\n') || 'Eşleşen başlık yok.') + (son + 1 < b.length && out.length >= n ? `\n… devamı: baslangic=${son + 1}` : '');
  }
  if (ad === 'bolum_oku') {
    const { e, oku } = await eserBul(env, a.eser_id); const b = await dizin(env, oku);
    if (!b) throw new Error('Bu eserin metni bulunamadı: ' + a.eser_id);
    const i = +a.bolum; if (!b[i]) throw new Error(`Bölüm yok (0–${b.length - 1})`);
    if (!b[i][3]) return `${b[i][1]}: bu başlığın kendi metni yok; alt bölümlerine bakın (icindekiler, baslangic=${i + 1}).`;
    const [[, t0]] = await bolumler(env, oku, b, i, i);
    let bas = Math.max(0, +a.baslangic || 0);
    if (a.ara) { const re = aramaRe(a.ara); const m = re && re.exec(t0); if (m) bas = Math.max(0, t0.lastIndexOf('\n', m.index) + 1); }
    const parca = t0.slice(bas, bas + OKUMA_HARF), son = bas + parca.length;
    return `${eserAdi(e)} · bölüm ${i}: ${b[i][1]}${sayfaAl(t0, bas) ? ` · s. ${sayfaAl(t0, bas)}` : ''}\nKaynak: ${SITE}/#/eser/${oku}/${i}\n\n${temizMetin(parca)}` + (son < t0.length ? `\n\n… (${t0.length} harfin ${son}'ı) devamı: baslangic=${son}` : '');
  }
  if (ad === 'kitapta_ara') {
    const { e, oku } = await eserBul(env, a.eser_id); const b = await dizin(env, oku);
    if (!b) throw new Error('Bu eserin metni bulunamadı: ' + a.eser_id);
    const re = aramaRe(a.sorgu); if (!re) throw new Error('sorgu boş');
    const bas = Math.max(0, +a.bolum_bas || 0), sonSinir = Math.min(b.length - 1, a.bolum_son != null ? +a.bolum_son : b.length - 1);
    let bayt = 0, son = bas - 1;
    for (let i = bas; i <= sonSinir; i++) { bayt += b[i][3]; son = i; if (bayt > TARAMA_BAYT) break; }
    const sonuc = [];
    for (const [i, t] of await bolumler(env, oku, b, bas, son)) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(t)) && sonuc.length < 40) {
        const x = Math.max(0, m.index - 110), y = Math.min(t.length, m.index + m[0].length + 110);
        sonuc.push(`• bölüm ${i} (${b[i][1].slice(0, 60)})${sayfaAl(t, m.index) ? ` s. ${sayfaAl(t, m.index)}` : ''}: …${temizMetin(t.slice(x, y)).replace(/\s+/g, ' ')}…`);
      }
      if (sonuc.length >= 40) { son = i; break; }
    }
    const bitti = son >= sonSinir;
    return `${eserAdi(e)} · eser_id=${oku} · "${a.sorgu}" · taranan bölümler ${bas}–${son} / ${b.length - 1}\n` + (sonuc.join('\n') || 'Bu aralıkta bulunamadı.') +
      (bitti ? '\n(Tarama tamamlandı.)' : `\n… taramanın devamı: bolum_bas=${son + 1}`);
  }
  if (ad === 'ayet') {
    const s = +a.sure, x = +a.ayet, y = Math.min(+(a.bitis || x), x + 19);
    if (!(s >= 1 && s <= 114)) throw new Error('sure 1–114 olmalı');
    const A = JSON.parse(await varlik(env, `/data/mcp/a/${s}.json`)).filter(r => r[0] >= x && r[0] <= y);
    if (!A.length) throw new Error('ayet bulunamadı');
    return A.map(r => `${s}:${r[0]}\n${r[1]}\nDiyanet meali: ${r[2]}\n${SITE}/#/${s}/${r[0]}`).join('\n\n');
  }
  if (ad === 'ayeti_alintilayanlar') {
    const k = `${+a.sure}:${+a.ayet}`, satir = (await varlik(env, '/data/mcp/atif.tsv')).match(new RegExp(`^${k}\\t(\\d+)\\t(\\d+)$`, 'm'));
    if (!satir) throw new Error('ayet bulunamadı: ' + k);
    const buf = await r2(env, 'atif/ayet.bin', { offset: +satir[1], length: +satir[2] });
    const G = JSON.parse(await gunzip(buf)).g, K = await atifKitap(env), n = Math.min(+a.adet || 12, 40);
    const out = [`${k} ayetini alıntılayan eserler (kütüphane taraması; [cilt/sayfa → bölüm], * tam ayet):`];
    const SIRA = ['tefsir', 'hadis', 'ulum', 'dil', 'fikih', 'kelam', 'tasavvuf', 'tarih', 'cagdas'];
    for (const [g, L] of Object.entries(G).sort((x, y) => (SIRA.indexOf(x[0]) + 99) % 99 - (SIRA.indexOf(y[0]) + 99) % 99)) {
      if (a.grup && g !== a.grup) continue;
      out.push(`\n## ${g} (${L.length} eser)`);
      for (const [id, say, yer] of L.slice(0, n)) {
        const m = K.get(id) || [];
        out.push(`• eser_id=${id} · ${m[1] || id}${m[3] ? ' — ' + m[3] : ''}${m[4] ? `, ö. ${m[4]}` : ''} · ${say} yer: ` + yer.map(([c, p, bl, tam]) => `[${+c ? c + '/' : ''}${+p ? 's. ' + p + ' → ' : ''}bölüm ${bl}${tam ? '*' : ''}]`).join(' '));
      }
      if (L.length > n) out.push(`… ${L.length - n} eser daha (adet artırın)`);
    }
    return out.join('\n');
  }
  if (ad === 'lugat') {
    const kok = String(a.kok || '').replace(/[ً-ْٰـ\s]/g, '').replace(/[أإآٱ]/g, 'ء');
    const tsv = await varlik(env, '/data/mcp/lugat.tsv');
    const m = tsv.match(new RegExp(`^${kok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\t(.*)$`, 'm'));
    if (!m) return `"${a.kok}" kökü için kayıt yok. Kökü üç harf olarak yazın (ör. قوم).`;
    const KT = JSON.parse(await varlik(env, '/data/mcp/lugat_kitap.json'));
    return `${kok} kökü — sözlük maddeleri (metin: bolum_oku(eser_id, bolum, ara=başlık)):\n` +
      JSON.parse(m[1]).map(([id, bl, bas]) => `• ${KT[id]?.[0] || KT[id]?.[1] || id}${KT[id]?.[2] ? ` (ö. ${KT[id][2]})` : ''} · eser_id=${id} · bölüm ${bl} · başlık: ${bas}`).join('\n');
  }
  throw new Error('Bilinmeyen araç: ' + ad);
}

const SURUMLER = ['2025-06-18', '2025-03-26', '2024-11-05'];
async function mesaj(m, env) {
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result }), hata = (code, message) => ({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  if (m.method === 'initialize') return ok({
    protocolVersion: SURUMLER.includes(m.params?.protocolVersion) ? m.params.protocolVersion : SURUMLER[0],
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: 'vahiy++', title: 'vahiy++ Kur\'an kütüphanesi', version: SURUM },
    instructions: "vahiy++ (" + SITE + "): Kur'an ayetleri ve 12 bini aşkın klasik İslâmî eserin tam metni. Akış: eser_ara → icindekiler → bolum_oku; kitap içinde kelime için kitapta_ara (gerekirse bolum_bas ile devam ettirin); bir ayeti işleyen eserler için ayeti_alintilayanlar; kelime kökü için lugat. Metinler Arapçadır; kullanıcıya Türkçe özetleyip çevirin ve her alıntıda eser adı, bölüm/sayfa ve verilen site bağlantısını kaynak olarak gösterin. Metinde olmayan bir şeyi esere isnat etmeyin.",
  });
  if (m.method === 'ping') return ok({});
  if (m.method === 'tools/list') return ok({ tools: ARACLAR.map(t => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: false } })) });
  if (m.method === 'tools/call') {
    try { return ok({ content: [{ type: 'text', text: await calistir(m.params?.name, m.params?.arguments || {}, env) }] }); }
    catch (e) { return ok({ content: [{ type: 'text', text: 'Hata: ' + (e.message || e) }], isError: true }); }
  }
  if (m.method === 'resources/list') return ok({ resources: [] });
  if (m.method === 'prompts/list') return ok({ prompts: [] });
  return hata(-32601, 'Yöntem yok: ' + m.method);
}

export async function mcp(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('vahiy++ MCP sunucusu. Claude > Ayarlar > Bağlayıcılar > Özel bağlayıcı ekle: bu adres.', { status: 405, headers: { ...CORS, allow: 'POST, OPTIONS', 'content-type': 'text/plain; charset=utf-8' } });
  let g; try { g = await req.json(); } catch { return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Geçersiz JSON' } }, { status: 400, headers: CORS }); }
  const L = Array.isArray(g) ? g : [g], cevap = [];
  for (const m of L) if (m && m.id !== undefined && m.id !== null && m.method) cevap.push(await mesaj(m, env));
  if (!cevap.length) return new Response(null, { status: 202, headers: CORS });
  return Response.json(Array.isArray(g) ? cevap : cevap[0], { headers: CORS });
}
