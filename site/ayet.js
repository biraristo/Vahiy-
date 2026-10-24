'use strict';
/* vahiy++ — ayet ekranı: tüm mealler, suredeki yer şeridi (konu bölümleri), eser grupları için zaman çizelgesi + okuma paneli.
   app.js içindeki ayah() iskeleti kurar ve en sonda ayetYeni()'yi çağırır. "Diğer katmanlar" bölümleri app.js'de (k2, kx) kalır. */
const AY_SEK = [];
const AY_MEAL = ['tz-tr.diyanet', 'tz-tr.yazir', 'tz-tr.ates', 'tz-tr.golpinarli', 'tz-tr.bulac', 'tz-tr.yildirim', 'tz-tr.vakfi', 'tz-tr.ozturk', 'tz-tr.yuksel', 'qp-13656', 'qp-13627', 'qc-210', 'qc-124', 'qc-112', 'qp-2004'];
const AY_MEAL_AD = { 'tz-tr.diyanet': 'Diyanet İşleri', 'tz-tr.yazir': 'Elmalılı Hamdi Yazır', 'tz-tr.ates': 'Süleyman Ateş', 'tz-tr.golpinarli': 'Abdülbaki Gölpınarlı', 'tz-tr.bulac': 'Ali Bulaç', 'tz-tr.yildirim': 'Suat Yıldırım', 'tz-tr.vakfi': 'Diyanet Vakfı', 'tz-tr.ozturk': 'Yaşar Nuri Öztürk', 'tz-tr.yuksel': 'Edip Yüksel', 'qp-13656': 'Diyanet (Quranpedia)', 'qp-13627': 'Türkçe meal (Quranpedia)', 'qc-210': 'Dar al-Salam', 'qc-124': 'Muslim Shahin', 'qc-112': 'Shaban Britch', 'qp-2004': 'el-Muhtasar (Türkçe)' };
const TM_ETIKET_RENK = { g: '#B08D35', m: '#9a5b12', n: '#1E3A5F' };
const tmNorm = t => (t || '').replace(/[ً-ْٰـ]/g, '');
const tmKisa = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };
const tmVurgu = (html, ifade) => {
  if (!ifade) return html;
  const ES = { 'ا': '[اأإآٱ]', 'ي': '[يىئ]', 'ه': '[هة]', 'و': '[وؤ]' };
  const rx = new RegExp([...tmNorm(ifade)].map(c => c === ' ' ? '\\s+' : ES[c] || c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\u064B-\\u0652\\u0670\\u0640\\u06D6-\\u06ED]*'), 'g');
  return html.replace(rx, m => `<mark>${m}</mark>`);
};
const ayetIsaret = h => h.replace(/﴿([^﴾]{1,600})﴾/g, '<span class="ayt">﴿$1﴾</span>').replace(/\{([^}]{1,600})\}/g, '<span class="ayt">{$1}</span>');
const paragraflar = (t, vurgu) => esc(t).split('\n').filter(l => l.trim()).map(l => `<p>${tmVurgu(ayetIsaret(l), vurgu)}</p>`).join('');
const isArYazi = t => /[؀-ۿ]/.test(String(t || '').slice(0, 80));

function ayetYeni(s, a, A, su, S, D, MI) {
  /* ---- tüm mealler ---- */
  load(`/data/meal/s/${s}.json`).then(M => {
    const L = AY_MEAL.filter(m => M.mealler[m] && M.mealler[m][a - 1]);
    $('#a3Mealler').innerHTML = `<details class="a3-tum"><summary>Tüm mealler (${L.length})</summary><ul>${L.map(m => `<li><b>${esc(AY_MEAL_AD[m] || m)}</b><span>${esc(M.mealler[m][a - 1])}</span></li>`).join('')}</ul></details>`;
  }).catch(() => {});

  /* ---- suredeki yer: her konu bölümü tek kutu, sağdan sola; kutuya basınca ayet seçme ekranı ---- */
  load('/data/k0/konu.json').then(K => {
    const B = K.sureler[String(s)] || [[1, su.ayet, su.tr]];
    const bu = B.find(([x, y]) => a >= x && a <= y);
    $('#a3SureNot').innerHTML = `${B.length} bölüm · ${su.ayet} ayet`;
    const el = $('#aySerit');
    el.innerHTML = `<div class="ss-ic" dir="rtl">${B.map(([x, y, ad], i) => `<button type="button" class="ss-k${bu && bu[0] === x ? ' bu' : ''}" data-i="${i}" style="--c:var(--k${i % 8})" dir="ltr"><span class="r">${x === y ? `${x}. ayet` : `${x}–${y}`}</span><span class="t">${esc(ad)}</span>${bu && bu[0] === x ? `<span class="b">${a}. ayet burada</span>` : ''}</button>`).join('')}</div><p class="ss-not">Konu bölümleri Claude tarafından klasik tefsirlerin pasaj taksimine bakılarak hazırlandı; tefsirlerle karşılaştırın. ${chain([{ r: 'Bölümleme', t: K.kaynak, k: 'claude' }])}</p>`;
    const ic = el.querySelector('.ss-ic'), cur = el.querySelector('.ss-k.bu');
    if (cur) { const r1 = cur.getBoundingClientRect(), r0 = ic.getBoundingClientRect(); ic.scrollLeft += (r1.left + r1.width / 2) - (r0.left + r0.width / 2); }
    ic.addEventListener('click', e => { const k = e.target.closest('.ss-k'); if (k) ayetSec(s, a, su, D, B[+k.dataset.i], +k.dataset.i); });
  }).catch(() => {});

  /* ---- kelimeler: ayet metnindeki kelimeye dokununca bilgi paneli ---- */
  const kelSec = i => {
    view.querySelectorAll('#ayMetin .kw').forEach(x => x.classList.toggle('sec', +x.dataset.i === i));
    kelimePanel(s, a, A, i);
  };
  $('#ayMetin').addEventListener('click', e => { const k = e.target.closest('.kw'); if (k) { kelSec(+k.dataset.i); $('#kwIpucu')?.remove(); try { localStorage.setItem('kwIpucu', '1'); } catch { /* yok */ } } });
  $('#ayMetin').addEventListener('keydown', e => { const k = e.target.closest('.kw'); if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kelSec(+k.dataset.i); } });

  /* ---- bloklar: görünür oldukça yüklenir ---- */
  const BLOK = { tefsir: blokTefsir, hadis: blokHadis, dil: blokDil, fikih: blokFikih, kelam: blokKelam, esbab: blokEsbab, cagdas: blokCagdas, selef: blokSelef, rivayet: blokRivayet, dinler: blokDinler, yazma: blokYazma, literatur: blokLiteratur };
  const calistir = el => { const k = el.id.slice(2); BLOK[k](s, a, A).then(items => zcKur(el, items, k, s, a)).catch(err => { el.querySelector('.zc-govde').innerHTML = `<p class="srcs">${esc(err.message)}</p>`; }); };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); calistir(e.target); } }), { rootMargin: '700px 0px' }) : null;
  Object.keys(BLOK).forEach(k => { const el = $(`#b-${k}`); if (io) io.observe(el); else calistir(el); });
  masaKur(s, a);
  try { if (!localStorage.getItem('kwIpucu')) { $('#ayMetin').insertAdjacentHTML('afterend', '<p class="kw-ipucu" id="kwIpucu">Kelimelere dokunun: anlamı, kökü, kıraati, lügatlerde ve tefsirlerde geçtiği yerler açılır.</p>'); } } catch { /* yok */ }
}

/* ================= veri sağlayıcılar ================= */
const AYX = {};
const ayX = (s, a) => (AYX[`${s}:${a}`] ||= Promise.all([loadGz(`/data/x/${s}/${a}.json.gz`), load('/data/x/kitaplar.json').then(d => d.kitaplar), load('/data/x/tr.json').catch(() => ({}))]));
const TM = {};
/* k2 dizini: bu ayetteki ayet ayet bölünmüş eserler (tefsir, esbâb, i'râb…) */
async function k2Veri(s, a) {
  const key = `${s}:${a}`; if (TM[key]) return TM[key];
  const [E, I, P, R] = await Promise.all([load('/data/k2/eserler.json'), load(`/data/k2/i/${s}.json`), loadGz(`/data/k2/t/${s}/${a}.json.gz`), load('/data/kutuphane/tefsir.json')]);
  const tr = {}; R.eserler.forEach(e => e.k2.forEach(r => { tr[r] = e; }));
  const byW = {}; P.p.forEach(r => (byW[r[0]] ||= []).push(r));
  const W = (I.ayetler[key] || []).map(([w]) => ({ w, e: E.eserler[w], tr: tr[w] || {} }))
    .filter(x => x.e && ['ar', 'tr'].includes(x.e.dil || 'ar'))
    .map(x => { const rows = byW[x.w] || []; const r0 = rows.find(r => typeof r[3] === 'string'); return { ...x, rows, metin: r0 ? r0[3] : '', ortak: rows.length && !r0 ? rows[0][3].ref : '' }; })
    .sort((p, q) => (p.e.vefat || 9999) - (q.e.vefat || 9999));
  const tek = new Map();
  W.forEach(x => { const k = x.tr.id || `${x.e.muellif}|${x.e.ad}|${x.e.tur}`; const o = tek.get(k); if (!o) tek.set(k, x); else if (!o.metin && x.metin) { x.rows = [...x.rows, ...o.rows]; tek.set(k, x); } });
  return (TM[key] = [...tek.values()]);
}
const yerYaz = r => [r[1] && +r[1] ? `c. ${r[1]}` : '', r[2] ? `s. ${r[2]}` : ''].filter(Boolean).join(', ');
async function k2Metin(x) {
  const out = [];
  for (const r of x.rows) {
    let t = r[3];
    if (typeof t !== 'string') { try { const [ts, ta] = t.ref.split(':'); const P = await loadGz(`/data/k2/t/${ts}/${ta}.json.gz`); const m = P.p.find(y => y[0] === r[0] && y[1] === r[1] && y[2] === r[2] && typeof y[3] === 'string'); t = m ? m[3] : ''; } catch { t = ''; } }
    if (t) out.push([r, t]);
  }
  return out;
}
/* k2 eserini zaman çizelgesi öğesine çevir */
const k2Oge = (x, s, a) => ({
  k: x.w, yil: x.e.vefat || null, ad: x.tr.muellif || x.e.muellif || x.e.kisa || '—', arAd: !x.tr.muellif, eser: x.tr.ad || x.e.ad, tr: x.e.dil === 'tr',
  kitap: x.tr.id ? `#/kitap/${x.tr.id}/${s}/${a}` : (x.w.startsWith('qp') ? qpUrl(x.w.slice(2)) : null), disKitap: !x.tr.id,
  ozet: x.metin || x.ortak ? '1' : '', ara: tmNorm(x.metin),
  yukle: async (vurgu) => { const P = await k2Metin(x); return { dil: x.e.dil === 'tr' ? 'tr' : 'ar', html: P.map(([r, t]) => `${yerYaz(r) ? `<span class="sy">${esc(yerYaz(r))}</span>` : ''}${paragraflar(t, vurgu)}`).join('') || '<p>Metin bulunamadı.</p>', yer: P[0] ? yerYaz(P[0][0]) : '' }; },
  kunye: chain([{ r: 'Eser', t: `${x.e.muellif || ''}${x.e.vefat ? ` (ö. ${x.e.vefat})` : ''}, ${x.e.ad}`, u: x.w.startsWith('qp') ? qpUrl(x.w.slice(2)) : null }, { r: 'Veri', k: x.w.startsWith('qp') ? 'quranpedia' : 'qul' }, { r: 'İşleme', t: 'ayet ayet ayrıştırma:', b: 'k2' }])
});
/* k3: kitaplarda ayetin geçtiği yerler */
const k3Oge = (nb, n, hits, K, TR, s, a) => {
  const k = K[nb] || {}, t = TR[nb];
  const loc = h => k.kaynak === 'OpenITI' ? (+h[0] ? `c. ${+h[0]}, s. ${h[1]}` : (h[1] !== '0' ? `s. ${h[1]}` : '')) : k.kaynak === 'Quranpedia PDF' ? `c. ${+h[0]}, PDF s. ${+h[1]}` : '';
  const kitap = t ? (t[0][0] === 't' ? `#/kitap/${t[0]}/${s}/${a}` : `#/eser/${t[0]}`) : (k.kaynak === 'OpenITI' ? oiUrl(k.ref) : qpUrl(k.ref));
  return {
    k: 'k3' + nb, yil: k.vefat || null, ad: t ? t[2] : (k.muellif || '—').replace(/\s*\(المتوفى[^)]*\)/, ''), eser: t ? t[1] : k.ad, arAd: !t, say: n,
    kitap, disKitap: !t, ozet: hits.some(h => h[4]) ? '1' : '',
    yukle: async () => ({ dil: 'ar', html: hits.map(h => `${loc(h) ? `<span class="sy">${esc(loc(h))}</span>` : ''}${h[4] ? `<p>${ayetIsaret(esc(h[4]))}</p>` : '<p class="srcs">Bu yerin metin parçası kayıtlı değil; kitapta açın.</p>'}`).join('') + (n > hits.length ? `<p class="srcs">Bu eserde ${n - hits.length} yer daha var.</p>` : ''), yer: loc(hits[0] || []) }),
    kunye: chain([{ r: 'Kitap', t: `${(k.muellif || '').replace(/\s*\(المتوفى[^)]*\)/, '')}${k.vefat ? ` (ö. ${k.vefat})` : ''}, ${k.ad}`, u: k.kaynak === 'OpenITI' ? oiUrl(k.ref) : qpUrl(k.ref) }, k.nesir && { r: 'Neşir', t: k.nesir }, { r: 'Veri', k: k.kaynak === 'OpenITI' ? 'openiti' : k.kaynak === 'Quranpedia PDF' ? 'quranpedia_pdf' : 'quranpedia' }, { r: 'Bağ', t: 'makine: ayet metni eşleşmesi ya da kaynağın kendi ayet bağı', b: 'k3,paket' }])
  };
};
const k3Gruplar = async (s, a, gruplar) => {
  const [b, K, TR] = await ayX(s, a);
  return gruplar.flatMap(g => (b.k3[g] || []).map(([nb, n, hits]) => k3Oge(nb, n, hits, K, TR, s, a)));
};

async function blokTefsir(s, a) {
  const [W, K9] = await Promise.all([k2Veri(s, a), load('/data/k9/index.json').then(I => I.sureler.includes(s) ? load(`/data/k9/${s}.json`) : { ayetler: {} }).catch(() => ({ ayetler: {} }))]);
  const L = W.filter(x => x.e.tur === 'tefsir').map(x => k2Oge(x, s, a));
  L.meseleler = [...((K9.ayetler || {})[`${s}:${a}`] || [])];
  /* ihtilaf kayıtları: tefsir pasajlarında "ihtilaf / iki görüş / vecihler" kalıbı geçen yerler */
  const [[b], OZ] = await Promise.all([ayX(s, a), load('/data/k7/ozet.json').catch(() => ({ ayetler: {} }))]);
  const KN = { ihtilaf: 'ihtilaf', aqwal: 'görüşler', vucuh: 'vecihler' };
  const ih = b.k7.ihtilaf.filter(r => L.some(x => x.k === r[0]));
  const oz = OZ.ayetler?.[`${s}:${a}`];
  if (ih.length) L.meseleler.push({ ad: 'Görüş ayrılıkları', alt: 'ihtilaf, görüşler, vecihler', etiketler: { g: 'ihtilaf', m: 'görüşler', n: 'vecihler' },
    eserler: [...new Map(ih.map(r => [r[0], { w: r[0], e: { ihtilaf: 'g', aqwal: 'm', vucuh: 'n' }[r[3]] || 'g', vurgu: tmKisa(tmNorm(r[4]), 40).replace(/…$/, '').split(' ').slice(0, 5).join(' ') }])).values()],
    ozet: oz ? oz.maddeler : null });
  return L;
}
async function blokEsbab(s, a) {
  const W = (await k2Veri(s, a)).filter(x => ['esbab', 'nasih'].includes(x.e.tur)).map(x => k2Oge(x, s, a));
  const { riv, books, K } = await esbParts(s, a);
  const [, , TR] = await ayX(s, a);
  const B = books.map(([nb, n, hits]) => k3Oge(nb, n, hits, K, TR, s, a));
  const M = riv.length ? [{ k: 'mevsua-esb', yil: null, ad: "Mevsûatü't-tefsîri'l-me'sûr", eser: `Nüzul ve nesih rivayetleri (${riv.length})`, kitap: null, ozet: '1',
    yukle: async () => ({ dil: 'ar', html: riv.map(x => `<div class="rv1"><span class="sy">${/النسخ/.test(x.tur) ? 'Nesih' : 'Nüzul'}${x.hukum ? ' · tahrîcte: ' + esc(x.hukum) : ''}</span><p>${ayetIsaret(esc(x.metin))}</p>${x.tahric ? `<p class="thr">${esc(x.tahric)}</p>` : ''}</div>`).join('') }),
    kunye: chain([{ r: 'Eser', k: 'mevsua' }, { r: 'Veri', k: 'quranpedia' }]) }] : [];
  return [...W, ...B, ...M];
}
async function blokCagdas(s, a) {
  const L = await k3Gruplar(s, a, ['cagdas']);
  const [b] = await ayX(s, a);
  if (b.notlar.length) L.push({ k: 'notlar', yil: null, ad: 'Tedebbür notları', eser: `Quranpedia kullanıcı notları (${b.notlar.length})`, ozet: '1',
    yukle: async () => ({ dil: 'ar', html: b.notlar.map(n => `<div class="rv1"><span class="sy">${esc(n.yazar || '—')}${n.kategori ? ' · ' + esc(n.kategori) : ''}</span><p>${esc(n.metin)}</p></div>`).join('') }), kunye: chain([{ r: 'Notlar', t: 'Quranpedia kullanıcı notları', k: 'quranpedia' }]) });
  return L;
}
async function blokSelef(s, a) {
  const [[b], R] = await Promise.all([ayX(s, a), load('/data/k4/raviler.json')]);
  const RV = R.raviler;
  return b.k4.map(x => {
    const rv = x.raviler.map(r => RV[r]).filter(Boolean); const r0 = rv[rv.length - 1] || rv[0];
    const yil = r0?.takrib?.vefat || null;
    return { k: 'rv' + x.id, yil, ad: r0 ? r0.ad : (x.metin.match(/^(?:قال|عن)\s+([^:،,]{3,40})/)?.[1] || 'Rivayet'), arAd: true, eser: RTYPE(x.tur), ozet: '1', kitap: null,
      yukle: async () => ({ dil: 'ar', html: `<p>${ayetIsaret(para(x.metin))}</p>${x.hukum ? `<p class="srcs">tahrîcte: ${esc(x.hukum)}</p>` : ''}${x.tahric ? `<p class="thr">${para(x.tahric)}</p>` : ''}${rv.length ? `<p class="srcs">Râviler: ${rv.map(r => `${esc(r.ad)}${r.takrib?.derece ? ` (${esc(GRADE_TR[r.takrib.derece] || r.takrib.derece)})` : ''}`).join(' · ')}</p>` : ''}` }),
      kunye: chain([{ r: 'Rivayet', t: `Mevsûa kayıt no ${x.id}` }, { r: 'Eser', k: 'mevsua' }, { r: 'Veri', k: 'quranpedia' }, { r: 'Râvi dereceleri', t: "Takrîbü't-Tehzîb ile makine eşleştirmesi", b: 'k4_ravi' }]) };
  });
}
async function blokHadis(s, a) {
  const L = await k3Gruplar(s, a, ['hadis']);
  const H = await load(`/data/k4/he/${s}.json`).catch(() => null);
  const ids = H?.ayet?.[`${s}:${a}`] || [];
  ids.forEach(i => { const h = H.hadis[i], t = h.tr || {}, ar = h.ar || {};
    L.push({ k: 'he' + i, yil: null, ad: t.title || ar.title || 'Hadis', arAd: !t.title, eser: `Hadis Ansiklopedisi${t.grade || ar.grade ? ' · ' + (t.grade || ar.grade) : ''}`, tr: !!t.hadeeth, ozet: '1', kitap: h.url, disKitap: true,
      yukle: async () => ({ dil: t.hadeeth ? 'tr' : 'ar', html: `${t.hadeeth ? `<p>${para(t.hadeeth)}</p>` : ''}<p class="ar" dir="rtl">${para(ar.hadeeth || '')}</p>${t.explanation ? `<details><summary>Açıklama</summary><p>${para(t.explanation)}</p></details>` : ''}${ar.reference ? `<p class="srcs" dir="rtl">${esc(ar.reference)}</p>` : ''}` }),
      kunye: chain([{ r: 'Hadis', t: `HadeethEnc no ${i}`, u: h.url }, { r: 'Ayet bağı', t: 'makine: hadis metni ve şerhindeki ayet alıntısı', b: 'hadeethenc' }]) }); });
  return L;
}
async function blokDil(s, a) {
  const W = (await k2Veri(s, a)).filter(x => ['irab', 'garib', 'kiraat'].includes(x.e.tur)).map(x => k2Oge(x, s, a));
  /* garîbü'l-Kur'ân sözlükleri: kelime kelime açıklamalar */
  const [G, E] = await Promise.all([load(`/data/k2/g/${s}.json`).then(d => d.ayetler[`${s}:${a}`] || []).catch(() => []), load('/data/k2/eserler.json')]);
  const vef = {}; Object.values(E.eserler).forEach(e => { if (e.vefat) vef[tmNorm(e.ad)] = e.vefat; });
  const GL = G.map((g, i) => ({ k: 'gr' + i, yil: vef[tmNorm(g.eser)] || null, ad: g.muellif || '—', arAd: true, eser: g.eser, alt: "garîb", ozet: '1', kitap: null, ara: g.kelimeler.map(k => tmNorm(k.k)).join(' '),
    yukle: async () => ({ dil: 'ar', html: `<table class="zo-gr">${g.kelimeler.map(k => `<tr><td>${esc(k.k)}</td><td>${esc(k.a)}</td></tr>`).join('')}</table>${g.nesir ? `<p class="srcs">${esc(g.nesir)}</p>` : ''}` }),
    kunye: chain([{ r: 'Eser', t: `${g.muellif || ''}, ${g.eser}` }, g.nesir && { r: 'Neşir', t: g.nesir }, { r: 'Veri', k: 'quranpedia' }]) }));
  return [...W, ...GL, ...(await k3Gruplar(s, a, ['dil', 'ulum']))];
}
async function blokFikih(s, a) {
  const L = await k3Gruplar(s, a, ['fikih']);
  const [b] = await ayX(s, a);
  b.k7.fetva.forEach((f, i) => L.push({ k: 'fv' + i, yil: null, ad: f.muftu || 'Fetva', arAd: true, eser: 'Fetva', ozet: '1', kitap: null,
    yukle: async () => ({ dil: 'ar', html: `<p><b>${esc(f.soru)}</b></p><p>${para(f.cevap)}</p>` }), kunye: chain([{ r: 'Fetva', t: `${f.muftu || ''}${f.kategori ? ' · ' + f.kategori : ''}` }, { r: 'Veri', k: 'quranpedia' }]) }));
  return L;
}
const blokKelam = (s, a) => k3Gruplar(s, a, ['kelam', 'tasavvuf', 'tarih']);

/* ================= zaman çizelgesi bileşeni ================= */
/* vefat yılı hicrî; 1447'den büyükler ya "yaşıyor" işaretidir (1450 gibi) ya da yanlışlıkla milâdî girilmiştir */
const hicri = y => !y ? null : y >= 1500 ? Math.round((y - 622) * 1.0307) : y > 1447 ? 'c' : y;
const ASIR_H = y => y == null ? 'Tarihsiz' : y === 'c' ? 'Çağdaş' : `${Math.floor((y - 1) / 100) + 1}. asır`;
const yilYazH = (y, onek = 'ö.') => y == null ? '' : y === 'c' ? 'çağdaş' : `${onek} ${y}`;
function zcKur(el, items, tur, s, a) {
  const govde = el.querySelector('.zc-govde'), sayEl = el.querySelector(`#b-${tur}-n`);
  const MES = items.meseleler || [], MIL = items.takvim === 'm', BIRIM = items.birim || 'eser', GIRIS = items.giris || '';
  const ASIR = MIL ? (y => y == null ? 'Tarihsiz' : y < 0 ? `MÖ ${Math.ceil(-y / 100)}. yüzyıl` : `MS ${Math.floor((Math.max(y, 1) - 1) / 100) + 1}. yüzyıl`) : ASIR_H;
  const yilYaz = MIL ? (y => y == null ? '' : y < 0 ? `MÖ ${-y}` : `MS ${y}`) : (y => yilYazH(y, items.onek));
  items = items.map(x => ({ ...x, yil: MIL ? x.yil : hicri(x.yil) })).sort((p, q) => (p.yil === 'c' ? 1448 : p.yil ?? 99999) - (q.yil === 'c' ? 1448 : q.yil ?? 99999));
  if (!items.length) { govde.innerHTML = '<p class="zc-bos">Bu ayet için bu grupta kayıt yok.</p>'; el.classList.add('bos'); return; }
  const yillar = items.map(x => x.yil).filter(y => typeof y === 'number');
  if (sayEl) sayEl.textContent = `${items.length} ${BIRIM}${yillar.length ? ` · ${MIL ? `${yilYaz(Math.min(...yillar))}–${yilYaz(Math.max(...yillar))}` : `h. ${Math.min(...yillar)}–${Math.max(...yillar)}`}` : ''}`;
  let mes = -1, aktif = (items.find(x => x.ozet) || items[0]).k, pin = [], kel = null;
  const kelVar = x => !kel || nAr(x.ara || '').includes(kel.k);
  govde.innerHTML = `${GIRIS}${MES.length ? '<div class="zc-mes"></div>' : ''}<div class="zc-serit" tabindex="0" aria-label="Eserler, tarihe göre"></div><div class="zc-arac"></div><div class="zc-oku" aria-live="polite"></div>`;
  const serit = govde.querySelector('.zc-serit');
  const meseleOf = k => mes >= 0 ? MES[mes].eserler.find(m => m.w === k) : null;
  const cizSerit = () => {
    const gr = []; items.forEach(x => { const as = ASIR(x.yil); const g = gr[gr.length - 1]; if (g && g.as === as) g.L.push(x); else gr.push({ as, L: [x] }); });
    const sl = serit.scrollLeft;
    serit.innerHTML = gr.map(g => `<div class="zc-asir"><div class="zc-as">${g.as}<small>${g.L.length}</small></div><div class="zc-kol">${g.L.map(x => { const m = meseleOf(x.k); const sonuk = (mes >= 0 && !m) || !kelVar(x); return `<button type="button" class="zc-k${x.k === aktif ? ' sec' : ''}${sonuk ? ' sonuk' : ''}${pin.includes(x.k) ? ' pin' : ''}" data-k="${esc(x.k)}"${m ? ` style="--c:${TM_ETIKET_RENK[m.e]}"` : ''}><span class="y">${yilYaz(x.yil) || '&nbsp;'}</span><b${x.arAd ? ' lang="ar"' : ''}>${esc(x.ad)}</b><small${isArYazi(x.eser) ? ' lang="ar"' : ''}>${esc(x.eser)}</small>${m ? `<i style="--c:${TM_ETIKET_RENK[m.e]}">${esc(MES[mes].etiketler?.[m.e] || '')}</i>` : x.tr ? '<i class="tr">Türkçe</i>' : x.rozet ? `<i>${esc(x.rozet)}</i>` : ''}</button>`; }).join('')}</div></div>`).join('');
    serit.scrollLeft = sl;
    const mo = mes >= 0 && MES[mes].ozet ? MES[mes].ozet : null;
    let ozk = govde.querySelector('.zc-mozet'); if (!ozk) { ozk = document.createElement('div'); ozk.className = 'zc-mozet'; serit.before(ozk); }
    ozk.innerHTML = mo ? `<small>Türkçe özet · makine, kaynaklardan kontrol edin</small>${mo.map(m => `<p><b>${esc(m.mesele)}</b> ${esc(m.ozet)} <span class="srcs">${m.kaynaklar.map(esc).join(' · ')}</span></p>`).join('')}` : '';
    if (MES.length) govde.querySelector('.zc-mes').innerHTML = `<span>Meseleler</span>${MES.map((M, i) => `<button type="button" data-m="${i}" aria-pressed="${mes === i}">${esc(M.ad)} <small>${M.eserler.length}</small></button>`).join('')}${mes >= 0 ? '<button type="button" data-m="-1">Tüm eserler</button>' : ''}`;
    const kn = kel ? items.filter(kelVar).length : 0;
    govde.querySelector('.zc-arac').innerHTML = (kel ? `<span class="zc-kel">Süzgeç: <b lang="ar">${esc(kel.ar)}</b> geçen ${kn} eser</span><button type="button" class="zc-kelx">Süzgeci kaldır</button>` : '') + (pin.length ? `<button type="button" class="zc-kars">Yan yana oku (${pin.length})</button><button type="button" class="zc-temiz">Karşılaştırmayı temizle</button>` : '');
  };
  const bas = x => `<div><b${x.arAd ? ' lang="ar"' : ''}>${esc(x.ad)}</b><small>${x.yil ? yilYaz(x.yil) + ' · ' : ''}<span${isArYazi(x.eser) ? ' lang="ar"' : ''}>${esc(x.eser)}</span></small></div>`;
  const oku = async () => {
    const x = items.find(y => y.k === aktif); if (!x) return;
    const box = govde.querySelector('.zc-oku'), m = meseleOf(x.k);
    box.innerHTML = `<div class="zo-bas">${bas(x)}</div><p class="durum">Yükleniyor…</p>`;
    const r = await x.yukle(m?.vurgu || (kel && kelVar(x) ? kel.k : undefined));
    if (aktif !== x.k) return;
    box.innerHTML = `<div class="zo-bas">${bas(x)}
      <div class="zo-dug">${x.kitap ? `<a href="${esc(x.kitap)}"${x.disKitap ? ' target="_blank" rel="noopener"' : ''}>${esc(x.kitapAd || 'Kitaba git')}${r.yer ? ' · ' + esc(r.yer) : ''}</a>` : ''}<button type="button" data-ac="pin" aria-pressed="${pin.includes(x.k)}">${pin.includes(x.k) ? 'Karşılaştırmada' : 'Karşılaştır'}</button><button type="button" data-ac="atif">Atıf ver</button></div></div>
      ${m && m.ozet ? `<div class="zo-oz"><small>Türkçe özet · makine, metinden kontrol edin</small>${esc(m.ozet)}</div>` : ''}
      <div class="zo-metin${r.dil === 'ar' ? ' ar' : ''}"${r.dil === 'x' ? '' : ` dir="${r.dil === 'ar' ? 'rtl' : 'ltr'}" lang="${r.dil}"`}>${r.html}</div>
      <p class="srcs zo-k">${x.kunye || ''}</p>`;
    box.querySelector('[data-ac="atif"]').onclick = async ev => {
      const t = `${x.ad}${typeof x.yil === 'number' ? ` (${yilYaz(x.yil)})` : ''}, ${x.eser}${r.yer ? ', ' + r.yer : ''}. vahiy++: ${location.origin}/#/${s}/${a}`;
      try { await navigator.clipboard.writeText(t); } catch { /* yok */ } ev.target.textContent = 'Kopyalandı';
    };
  };
  const kars = async () => {
    const L = pin.map(k => items.find(x => x.k === k)).filter(Boolean);
    const box = govde.querySelector('.zc-oku');
    box.innerHTML = `<div class="zk" style="--n:${L.length}">${L.map(x => `<section data-k="${esc(x.k)}"><div class="zo-bas">${bas(x)}</div><div class="zo-metin ar" dir="rtl">Yükleniyor…</div></section>`).join('')}</div>`;
    for (const x of L) { const r = await x.yukle(meseleOf(x.k)?.vurgu); const c = box.querySelector(`section[data-k="${CSS.escape(x.k)}"] .zo-metin`); if (!c) return; c.className = `zo-metin${r.dil === 'ar' ? ' ar' : ''}`; c.dir = r.dil === 'ar' ? 'rtl' : 'ltr'; c.innerHTML = r.html; }
  };
  govde.addEventListener('click', e => {
    const mb = e.target.closest('.zc-mes button'); if (mb) { mes = +mb.dataset.m; if (mes >= 0) { const w = MES[mes].eserler.find(m => items.some(x => x.k === m.w)); if (w) aktif = w.w; } cizSerit(); oku(); return; }
    const k = e.target.closest('.zc-k'); if (k) { aktif = k.dataset.k; cizSerit(); oku(); return; }
    if (e.target.closest('[data-ac="pin"]')) { pin = pin.includes(aktif) ? pin.filter(y => y !== aktif) : [...pin, aktif].slice(-3); cizSerit(); oku(); return; }
    if (e.target.closest('.zc-kars')) { kars(); return; }
    if (e.target.closest('.zc-temiz')) { pin = []; cizSerit(); oku(); }
    if (e.target.closest('.zc-kelx')) { kel = null; cizSerit(); oku(); }
  });
  el.addEventListener('kelime', e => { kel = e.detail; mes = -1; const ilk = items.find(kelVar); if (ilk) aktif = ilk.k; cizSerit(); oku(); const sec = serit.querySelector('.zc-k.sec'); if (sec) serit.scrollLeft = sec.closest('.zc-asir').offsetLeft - 8; });
  cizSerit(); oku();
}

/* ================= ayet metni: kelimelere bölünmüş ================= */
const nAr = t => String(t || '').replace(/[ً-ٰٟـۖ-ۭ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
function ayetKelimeli(A) {
  const T = A.metin.split(' '), W = A.kelimeler;
  const kelimeler = T.filter(x => /[ء-يٱ]/.test(x));
  if (kelimeler.length !== W.length) return esc(A.metin);
  let i = 0;
  return T.map(x => /[ء-يٱ]/.test(x) ? `<span class="kw${i % 2 ? ' k2' : ''}" role="button" tabindex="0" data-i="${i}" title="${esc(W[i++].tr || '')}">${esc(x)}</span>` : `<span class="dur">${esc(x)}</span>`).join(' ');
}

/* ================= bölüm içinde ayet seçme ekranı ================= */
function ayetSec(s, a, su, D, bol, bi) {
  let m = $('#ssEkran'); if (!m) { m = document.createElement('div'); m.id = 'ssEkran'; m.className = 'ss-ekran'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); }
  const [x, y, ad] = bol;
  m.innerHTML = `<div class="se-ic"><div class="se-bas"><div><small>${esc(su.tr)} · ${x === y ? `${x}. ayet` : `${x}–${y}. ayetler`}</small><b>${esc(ad)}</b></div><button type="button" class="se-kapat" aria-label="Kapat">×</button></div>
    <div class="se-ay">${Array.from({ length: y - x + 1 }, (_, j) => x + j).map(n => { const t = (D.ayetler[n - 1]?.metin || '').split(' ').slice(0, 5).join(' '); return `<a href="#/${s}/${n}"${n === a ? ' aria-current="true"' : ''}><b>${n}</b><span lang="ar">${esc(t)}…</span></a>`; }).join('')}</div></div>`;
  m.hidden = false; document.body.classList.add('se-acik');
  const kapat = () => { m.hidden = true; document.body.classList.remove('se-acik'); removeEventListener('keydown', esc1); };
  const esc1 = e => { if (e.key === 'Escape') kapat(); };
  addEventListener('keydown', esc1);
  m.onclick = e => { if (e.target === m || e.target.closest('.se-kapat') || e.target.closest('.se-ay a')) kapat(); };
  m.querySelector('.se-kapat').focus();
  addEventListener('hashchange', kapat, { once: true });
}

/* ================= kelime paneli ================= */
async function kelimePanel(s, a, A, i) {
  const w = A.kelimeler[i], box = $('#a3Kel'), id = `${s}:${a}`, nw = nAr(w.ar);
  box.hidden = false;
  const kok = w.kok, lem = w.lemma;
  box.innerHTML = `<div class="kp-bas"><div class="kp-k" lang="ar">${esc(w.ar)}</div><div class="kp-a"><b>${esc(w.tr || '')}</b><span>${esc(w.okunus || '')}${w.en ? ` · ${esc(w.en)}` : ''}</span></div><button type="button" class="kp-kapat" aria-label="Kelime panelini kapat">×</button></div>
    <div class="kp-izgara">
      <section><h4>Dilbilgisi</h4><dl>${kok ? `<dt>Kök</dt><dd lang="ar">${esc(kok)}</dd>` : ''}${lem ? `<dt>Sözlük biçimi</dt><dd lang="ar">${esc(lem)}</dd>` : ''}<dt>Tür · i'râb</dt><dd lang="ar">${esc(w.aciklama || [w.tur, w.irab].filter(Boolean).join('، '))}</dd></dl><div id="kpSx"></div></section>
      <section id="kpKuran"><h4>Kur'an'da</h4><p class="durum">Yükleniyor…</p></section>
      <section id="kpKir"><h4>Kıraat</h4><p class="durum">Yükleniyor…</p></section>
      <section id="kpGr"><h4>Garîb sözlüklerinde</h4><p class="durum">Yükleniyor…</p></section>
      <section id="kpBag"><h4>Kur'an içi ilişkiler</h4><p class="durum">Yükleniyor…</p></section>
      <section id="kpLug"><h4>Lügatlerde</h4><p class="durum">Yükleniyor…</p></section>
      <section id="kpTef"><h4>Tefsirlerde</h4><p class="durum">Yükleniyor…</p></section>
    </div>
    <p class="srcs kp-k2">${chain([{ r: 'Kelime', t: `${id}:${w.n}` }, { r: 'Morfoloji', k: 'qac' }, { r: 'Kelime meali', k: 'qurancom' }, { r: 'İşleme', b: 'k0' }])} Morfoloji: Quranic Arabic Corpus${w.dogrulandi_qac ? ' (elle doğrulanmış)' : ''}</p>`;
  box.querySelector('.kp-kapat').onclick = () => { box.hidden = true; view.querySelectorAll('#ayMetin .kw.sec').forEach(x => x.classList.remove('sec')); };
  const S = await meta();
  const ayLink = r => { const [x, y] = r.split(':'); return `<a href="#/${x}/${y}"${r === id ? ' aria-current="true"' : ''}>${esc(S.sureler[x - 1].tr)} ${y}</a>`; };
  const yaz = (sel, html) => { const el = box.querySelector(sel); if (el && box.contains(el)) el.innerHTML = el.querySelector('h4').outerHTML + html; };
  const liste = (L, n = 24) => `<p class="kp-ay">${L.slice(0, n).map(ayLink).join('')}</p>${L.length > n ? `<details class="kp-daha"><summary>${L.length - n} ayet daha</summary><p class="kp-ay">${L.slice(n).map(ayLink).join('')}</p></details>` : ''}`;
  // Kur'an'da geçtiği yerler
  load('/data/k0/dizin.json').then(Z => {
    const ay = o => [...new Set((o || []).map(x => x.split(':').slice(0, 2).join(':')))];
    const ok = kok ? Z.kok[kok] || [] : [], ol = lem ? Z.lemma?.[lem] || [] : [];
    yaz('#kpKuran', `${lem && ol.length ? `<p><span lang="ar">${esc(lem)}</span> biçimi <b>${fmt(ol.length)}</b> kez, ${fmt(ay(ol).length)} ayette.</p>${liste(ay(ol), 16)}` : ''}${kok ? `<p><span lang="ar">${esc(kok)}</span> kökü <b>${fmt(ok.length)}</b> kez, ${fmt(ay(ok).length)} ayette.</p>${liste(ay(ok), 16)}` : '<p class="srcs">Bu kelimenin kökü yok (edat ya da zamir).</p>'}`);
  }).catch(e => yaz('#kpKuran', `<p class="srcs">${esc(e.message)}</p>`));
  // Kıraat
  load(`/data/k2/q/${s}.json`).then(Q => {
    const q = Q.ayetler[id] || {};
    const qp = (q.qp || []).filter(x => nAr(x.kelime).includes(nw) || nw.includes(nAr(x.kelime)));
    const cc = (q.cc || []).filter(x => x.okuyus && x.okuyus[String(w.n)]);
    const tek = {}; cc.forEach(x => { const o = x.okuyus[String(w.n)]; (tek[o] ||= { o, ok: new Set(), es: [] }); x.okuyanlar.forEach(r => tek[o].ok.add(r)); tek[o].es.push(x.eser); });
    yaz('#kpKir', (qp.length || cc.length) ? `${qp.length ? `<table class="kp-t">${qp.map(x => `<tr><td lang="ar">${esc(x.okuyus)}</td><td lang="ar">${x.raviler.map(r => esc(r[0])).join('، ')}</td></tr>`).join('')}</table>` : ''}${cc.length ? `<ul class="kp-l">${Object.values(tek).map(t => `<li><i>${esc(t.o)}</i> <span>${[...t.ok].slice(0, 6).map(esc).join(', ')}${t.ok.size > 6 ? '…' : ''}</span><small>${esc([...new Set(t.es)].slice(0, 2).join(' · '))}</small></li>`).join('')}</ul><p class="srcs">Okuyuşlar Corpus Coranicum transkripsiyonuyla.</p>` : ''}` : '<p class="srcs">Bu kelimede kayıtlı kıraat farkı yok.</p>');
  }).catch(() => yaz('#kpKir', '<p class="srcs">Kıraat verisi açılamadı.</p>'));
  // Garîb
  load(`/data/k2/g/${s}.json`).then(G => {
    const L = (G.ayetler[id] || []).flatMap(g => g.kelimeler.filter(k => nAr(k.k).includes(nw) || nw.includes(nAr(k.k)) && nAr(k.k).length > 2).map(k => [g, k]));
    yaz('#kpGr', L.length ? `<ul class="kp-l">${L.map(([g, k]) => `<li><span lang="ar" class="ar">${esc(k.a)}</span><small lang="ar">${esc(g.muellif || '')}، ${esc(g.eser)}</small></li>`).join('')}</ul>` : '<p class="srcs">Garîb sözlükleri bu kelimeyi açıklamıyor.</p>');
  }).catch(() => yaz('#kpGr', ''));
  // Kur'an içi ilişkiler
  load(`/data/k1/${s}.json`).then(K1 => {
    const L = (K1.ayetler || {})[id] || {};
    const icer = t => nAr(t).split(/\s+/).some(x => x === nw || (nw.length > 3 && x.includes(nw.replace(/^(و|ف|ال)/, ''))));
    const g = [...(L.benzer_ifade || []).filter(x => icer(x.not)).map(x => [x.not, x.ayetler]), ...(L.ortak_ifade || []).filter(x => icer(x.ifade)).map(x => [x.ifade, x.ayetler])];
    yaz('#kpBag', g.length ? g.map(([t, ay]) => `<div class="kp-if"><span lang="ar">${esc(t)}</span>${liste(ay, 12)}</div>`).join('') : '<p class="srcs">Bu kelimeyi içeren ortak ifade kaydı yok.</p>');
  }).catch(() => yaz('#kpBag', ''));
  // Lügatler
  load('/data/k5/index.json').then(I => {
    const n = kok ? I.kokler[kok] : undefined;
    if (n === undefined) return yaz('#kpLug', '<p class="srcs">Bu kök için ayrıştırılmış lügat maddesi yok.</p>');
    const keys = Object.keys(I.lugatler).sort((x, y) => I.lugatler[x].vefat - I.lugatler[y].vefat);
    yaz('#kpLug', `<p class="srcs">Yükleniyor…</p>`);
    loadGz(`/data/k5/r/${n}.json.gz`).then(d => {
      const K = keys.filter(k => d.lugat[k]);
      yaz('#kpLug', K.length ? K.map((k, j) => `<details class="kp-lx"${j === 0 ? ' open' : ''}><summary>${esc(I.lugatler[k].muellif)} <small>ö. ${I.lugatler[k].vefat}</small></summary><p lang="ar" class="ar">${esc(tmKisa(d.lugat[k].metin, 700))}</p></details>`).join('') : '<p class="srcs">Madde bulunamadı.</p>');
    });
  }).catch(() => yaz('#kpLug', ''));
  // Cümle çözümlemesi
  load(`/data/k0/sx/${s}.json`).then(d => { const r = (d.ayetler[String(a)] || []).filter(x => x[0] === w.n); if (r.length) box.querySelector('#kpSx').innerHTML = `<table class="kp-t">${r.flatMap(x => x[2]).map(t => `<tr><td lang="ar">${esc(t[0])}</td><td lang="ar">${esc(t[1] || '')}</td><td lang="ar">${esc(t[2] || '')}</td></tr>`).join('')}</table>`; }).catch(() => {});
  // Tefsirlerde
  k2Veri(s, a).then(W => {
    const kok3 = nw.replace(/^(و|ف)/, '').replace(/^ال/, '');
    const L = W.filter(x => x.e.tur === 'tefsir' && kok3.length > 1 && nAr(x.metin).includes(kok3));
    yaz('#kpTef', `<p><b>${L.length}</b> tefsir bu kelimeyi açıklıyor.</p>${L.length ? '<button type="button" class="kp-git">Tefsirlerde göster</button>' : ''}`);
    box.querySelector('.kp-git')?.addEventListener('click', () => { const el = $('#b-tefsir'); el.dispatchEvent(new CustomEvent('kelime', { detail: { k: kok3, ar: w.ar } })); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }).catch(() => yaz('#kpTef', ''));
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ================= rivayetler, dinler tarihi, yazmalar, literatür ================= */
const RAVI_VEFAT = { 'حفص': 180, 'شعبة': 193, 'ورش': 197, 'قالون': 220, 'الدوري': 246, 'البزي': 250, 'السوسي': 261, 'قنبل': 291 };
const RAVI_IMAM = { 'حفص': 'Âsım', 'شعبة': 'Âsım', 'ورش': 'Nâfi‘', 'قالون': 'Nâfi‘', 'الدوري': 'Ebû Amr', 'السوسي': 'Ebû Amr', 'البزي': 'İbn Kesîr', 'قنبل': 'İbn Kesîr' };
async function blokRivayet(s, a, A) {
  const R = (await load(`/data/k0/r/${s}.json`))[`${s}:${a}`] || {};
  const oge = (r, v) => ({ k: 'rv-' + r, yil: RAVI_VEFAT[r] || null, ad: RAVI[r] || r, eser: `${RAVI_IMAM[r] ? RAVI_IMAM[r] + ' kıraati · ' : ''}${SAYIM[v.sayim] || v.sayim} sayım · ${v.ayet_no.join(', ')}. ayet`, rozet: v.iskelet_farkli ? 'harf farkı' : '', ozet: '1', kitap: null,
    yukle: async () => ({ dil: 'ar', html: v.metin.map((t, i) => `${v.metin.length > 1 ? `<span class="sy">${v.ayet_no[i] ?? ''}. ayet</span>` : ''}<p class="zo-ayet">${esc(t)}</p>`).join('') + `<p class="srcs" dir="ltr">${v.iskelet_farkli ? 'Bu rivayette harf iskeleti Hafs\'tan ayrılıyor (yazım ve hareke farkları hariç). ' : ''}Sayım: ${esc(SAYIM[v.sayim] || v.sayim)}.</p>` }),
    kunye: chain([{ r: 'Mushaf', t: `${RAVI[r] || r} rivayeti`, k: 'quranpedia' }]) });
  const L = [oge('حفص', { sayim: 'الكوفي', ayet_no: [a], metin: [A.metin], iskelet_farkli: false }), ...Object.entries(R).map(([r, v]) => oge(r, v))];
  L.birim = 'rivayet'; L.onek = 'ö.';
  const sf = A.sayim_farki || [];
  if (sf.length) L.giris = `<p class="zc-giris">Sayım farkı: ${sf.map(x => `${esc(RAVI[x.rivayet] || x.rivayet)} (${esc(SAYIM[x.sayim] || x.sayim)}) bu ayeti ${x.durum === 'bölünüyor' ? `ikiye böler: ${x.ayet_no.join(' ve ')}. ayetler` : `başka ayetle birleştirir: ${x.ayet_no.join(', ')}. ayet (Hafs ${x.hafs_karsiligi.join('–')})`}`).join(' · ')}</p>`;
  return L;
}
/* Türkçe tarih ifadesinden yaklaşık yıl: "yak. 80-90 MS" → 85, "4. yy. MÖ öncesi" → -350 */
const tarihYil = t => {
  t = String(t || ''); const mo = /MÖ/.test(t) && !/MS/.test(t.split('MÖ')[0]);
  let m = /(\d{1,4})\.\s*-?\s*(?:(\d{1,2})\.\s*)?yy/.exec(t);
  if (m) { const c = m[2] ? (+m[1] + +m[2]) / 2 : +m[1]; return Math.round(mo ? -(c * 100 - 50) : c * 100 - 50); }
  m = /(\d{1,4})(?:\s*[-–/]\s*(\d{1,4}))?/.exec(t);
  if (!m) return null; const y = m[2] && +m[2] > +m[1] ? Math.round((+m[1] + +m[2]) / 2) : +m[1];
  return mo ? -y : y;
};
async function blokDinler(s, a) {
  const [K, R] = await Promise.all([load(`/data/k6/${s}.json`), load('/data/kutuphane/dinler.json')]);
  const DM = {}; R.metinler.forEach(e => { DM[e.id] = e; });
  const GA = {}; R.gelenekler.forEach(g => { GA[g.k] = g.ad; });
  const L = (K.ayetler[`${s}:${a}`] || []).map(x => { const e = DM[x.id] || {};
    return { k: 'dt' + x.id, yil: tarihYil(e.tarih || x.tarih), ad: e.ad || x.baslik, eser: [GA[e.g], e.dil || x.dil].filter(Boolean).join(' · '), rozet: e.tarih || '', ozet: '1', kitap: `#/metin/${x.id}`, kitapAd: 'Metni aç',
      yukle: async () => { if (typeof dtFont === 'function') dtFont(); const m = await load(`/data/k6/m/${x.id}.json`); const asil = m.metin || m.transkripsiyon || '';
        const yazi = (typeof DT_YAZI !== 'undefined' && DT_YAZI[e.dil]) || 'lat';
        return { dil: 'x', html: `<div class="y-${yazi}">${typeof dtBlok === 'function' ? dtBlok(asil, yazi, 'nesir', 1) : `<p dir="auto">${esc(asil)}</p>`}</div>${m.ceviri_de || m.ceviri_en ? `<details class="zo-cev"><summary>${m.ceviri_de ? 'Almanca' : 'İngilizce'} çeviri (Corpus Coranicum)</summary><p dir="ltr">${esc(m.ceviri_de || m.ceviri_en)}</p></details>` : ''}${m.not_de ? `<details class="zo-cev"><summary>Corpus Coranicum açıklaması (Almanca)</summary><p dir="ltr" lang="de">${esc(m.not_de)}</p></details>` : ''}` }; },
      kunye: chain([{ r: 'Metin', t: e.asil || x.baslik }, { r: 'Madde', t: `Corpus Coranicum TUK ${x.id}`, u: `https://corpuscoranicum.de/de/intertexts/${x.id}` }, { r: 'Veri', k: 'cc' }]) }; });
  L.takvim = 'm'; L.birim = 'metin';
  return L;
}
async function blokYazma(s, a) {
  const [Y, R] = await Promise.all([load(`/data/k6/y/${s}.json`), load('/data/k6/yazma.json')]);
  const by = {}; (Y.ayetler[`${s}:${a}`] || []).forEach(([m, f, p]) => (by[m] ||= []).push([f, p]));
  const L = Object.entries(by).map(([m, F]) => { const n = R.nushalar[m] || {};
    const t = String(n.tarih || ''); const yr = /^-/.test(t) ? +t.slice(1) - 50 : tarihYil(t);
    const ad = (n.ad || m).replace(/\s*\([^)]*[Ѐ-ӿ؀-ۿ][^)]*\)/g, '');
    return { k: 'yz' + m, yil: yr || null, ad: ad.split(',')[0], eser: ad.split(',').slice(1).join(',').trim() || ad, rozet: [n.yazi, t.replace(/^-/, '… ')].filter(Boolean).join(' · '), ozet: '1', kitap: `https://corpuscoranicum.de/de/manuscript/${m}`, disKitap: true, kitapAd: 'Corpus Coranicum\'da aç',
      yukle: async () => ({ dil: 'tr', html: `<dl class="zo-dl">${[['Nüsha', n.ad], ['Kurum', n.kurum], ['Numara', n.no], ['Tarih (miladi)', t.replace(/^-/, '… öncesi ')], ['Yazı', n.yazi], ['Malzeme', n.malzeme]].filter(x => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${n.ozet ? `<p>${esc(n.ozet)}</p>` : ''}<p class="zo-yap">Bu ayetin geçtiği yapraklar: ${F.map(([f, p]) => p ? `<a href="https://corpuscoranicum.de/de/manuscript/${m}/page/${p}" target="_blank" rel="noopener">${esc(f)} görüntüsü</a>` : esc(f)).join(' ')}</p>`, yer: F.map(x => x[0]).join(', ') }),
      kunye: chain([{ r: 'Nüsha', t: n.ad, u: `https://corpuscoranicum.de/de/manuscript/${m}` }, { r: 'Veri', k: 'cc' }, { r: 'İşleme', t: 'TEI yaprak aralıkları ayetlere açıldı:', b: 'yazma' }]) }; });
  L.takvim = 'm'; L.birim = 'nüsha';
  return L;
}
async function blokLiteratur(s, a) {
  const K = await load(`/data/k8/${s}.json`); const ay = K.ayet[`${s}:${a}`] || [];
  const L = [...ay, ...K.sure.filter(x => !ay.includes(x))].map(i => { const m = K.makale[i]; const au = (m.authors || '—').split(',');
    return { k: 'mk' + i, yil: m.year ? +m.year : null, ad: au[0].trim() + (au.length > 1 ? ' vd.' : ''), eser: m.title.split(' / ')[0], rozet: ay.includes(i) ? 'bu ayet' : 'sure', ozet: '1', kitap: m.url, disKitap: true, kitapAd: 'Makaleye git',
      yukle: async () => ({ dil: 'x', html: `<p><b>${esc(m.title.split(' / ')[0])}</b></p><p class="srcs">${esc(m.authors || '')}${m.journal ? ' · ' + esc(m.journal) : ''}${m.year ? ' · ' + m.year : ''}</p>${m.abstract ? `<p dir="auto">${esc(m.abstract)}</p>` : '<p class="srcs">Özet kaydı yok.</p>'}` }),
      kunye: chain([{ r: 'Makale', t: m.url, u: m.url }, { r: 'Künye ve özet', k: 'crossref' }, { r: 'Ayet bağı', t: 'makine: başlık/özetteki atıf', b: 'k8' }]) }; });
  L.takvim = 'm'; L.birim = 'makale';
  return L;
}
/* araştırma masası: ayete kişisel not */
function masaKur(s, a) {
  const key = `masa:${s}:${a}`, el = $('#a3Masa'); if (!el) return;
  const tum = () => { const o = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('masa:')) o.push(k.slice(5)); } } catch { /* yok */ } return o.sort((x, y) => { const [a1, b1] = x.split(':').map(Number), [a2, b2] = y.split(':').map(Number); return a1 - a2 || b1 - b2; }); };
  el.innerHTML = `<textarea id="masaT" rows="4" placeholder="Bu ayete notunuzu yazın">${esc(store.get(key, ''))}</textarea><div class="masa-alt"><span id="masaS"></span><button type="button" id="masaX">Tüm notları indir</button></div><p class="kp-ay" id="masaL"></p>`;
  const liste = () => { const L = tum(); $('#masaL').innerHTML = L.length ? L.map(x => `<a href="#/${x.replace(':', '/')}"${x === `${s}:${a}` ? ' aria-current="true"' : ''}>${x}</a>`).join('') : ''; };
  liste(); let t;
  $('#masaT').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { const v = e.target.value; try { v.trim() ? localStorage.setItem(key, v) : localStorage.removeItem(key); $('#masaS').textContent = 'Kaydedildi'; } catch { $('#masaS').textContent = 'Bu tarayıcı kaydetmeye izin vermiyor.'; } liste(); }, 400); });
  $('#masaX').onclick = () => { const o = {}; tum().forEach(k => { o[k] = store.get('masa:' + k, ''); }); const u = URL.createObjectURL(new Blob([JSON.stringify({ vahiy: 'masa', tarih: new Date().toISOString(), notlar: o }, null, 1)], { type: 'application/json' })); const l = document.createElement('a'); l.href = u; l.download = 'vahiy-notlar.json'; l.click(); URL.revokeObjectURL(u); };
}
