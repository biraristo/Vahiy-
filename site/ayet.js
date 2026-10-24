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

  /* ---- ayet fihristi: surenin genel konu çubuğu (her ayet bir çubuk) + seçili ayetin konuları (KuranFihristi.net) ---- */
  Promise.all([load(`/data/fh/${s}.json`), load('/data/fh/etiket.json'), load('/data/fh/genel.json'), meta()]).then(([F, ET, GN, SM]) => {
    const E = ET.etiketler, GA = GN.adlar, GL = GN.sureler[String(s)] || [], TRS = n => SM.sureler[n - 1]?.tr || n;
    const RENK = { kissa: '#C9A13B', iman: '#2F8C8F', ahiret: '#B85C4E', hukum: '#7E5AA6', ahlak: '#5E8C4A', diger: '#9AA3AE' };
    const et = n => F.ayetler[String(n)] || [];
    const el = $('#aySerit');
    $('#a3SureNot').innerHTML = `${esc(su.tr)} · ${su.ayet} ayet`;
    const say = {}; GL.forEach(g => { const k = g || 'yok'; say[k] = (say[k] || 0) + 1; });
    const SIRA = ['kissa', 'iman', 'ahiret', 'hukum', 'ahlak', 'diger'].filter(k => say[k]);
    el.innerHTML = `<div class="gk"><div class="gk-imle" aria-hidden="true"><b>${a}</b></div>
        <div class="gk-cubuk" role="slider" tabindex="0" aria-label="Surede ayet seçin" aria-valuemin="1" aria-valuemax="${su.ayet}" aria-valuenow="${a}">${GL.map((g, i) => `<i data-a="${i + 1}" data-g="${g || 'yok'}" class="${i + 1 === a ? 'bu' : ''}" style="--c:${g ? RENK[g] : 'transparent'}"></i>`).join('')}</div>
        <div class="gk-uc"><span>1</span><span class="gk-ip">Çubukta gezdirin, bırakınca ayet açılır</span><span>${su.ayet}</span></div>
        <div class="gk-lej">${SIRA.map(k => `<button type="button" data-g="${k}" aria-pressed="false"><i style="background:${RENK[k]}"></i>${esc(GA[k])} <small>${say[k]}</small></button>`).join('')}${say.yok ? `<span class="gk-yok">${say.yok} ayet etiketsiz</span>` : ''}</div></div>
      <div class="gk-konu"></div>
      <p class="ss-not kaynak-not">Etiketler: <a href="https://www.kuranfihristi.net/" target="_blank" rel="noopener">KuranFihristi.net</a> konu fihristi. Renkler (genel başlıklar) Claude'un bu etiketlerden yaptığı sınıflamadır. ${chain([{ r: 'Etiketler', t: ET.kaynak, u: ET.url }, { r: 'Genel başlıklar', t: GN.kaynak, k: 'claude' }, { r: 'İşleme', b: 'fihrist' }])}</p>`;
    const cub = el.querySelector('.gk-cubuk'), imle = el.querySelector('.gk-imle'), ip = el.querySelector('.gk-ip'), ipVars = ip.textContent;
    const yerlestir = n => { const c = cub.children[n - 1]; if (!c) return; imle.style.left = `${c.offsetLeft + c.offsetWidth / 2}px`; imle.firstChild.textContent = n; };
    const nOf = x => { const r = cub.getBoundingClientRect(); return Math.max(1, Math.min(su.ayet, Math.floor((x - r.left) / r.width * su.ayet) + 1)); };
    let surukle = false, hedef = a;
    const goster = n => { hedef = n; yerlestir(n); cub.querySelectorAll('i.on').forEach(x => x.classList.remove('on')); cub.children[n - 1].classList.add('on'); const g = GL[n - 1]; ip.innerHTML = `<b>${s}:${n}</b> · ${g ? esc(GA[g]) : 'etiketsiz'}${et(n).length ? ' · ' + esc(et(n).slice(0, 3).map(i => E[i][0]).join(', ')) : ''}`; };
    cub.addEventListener('pointerdown', e => { surukle = true; cub.setPointerCapture(e.pointerId); goster(nOf(e.clientX)); });
    cub.addEventListener('pointermove', e => { if (surukle || e.pointerType === 'mouse') goster(nOf(e.clientX)); });
    cub.addEventListener('pointerup', e => { if (!surukle) return; surukle = false; const n = nOf(e.clientX); if (n !== a) location.hash = `#/${s}/${n}`; });
    cub.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !surukle) { yerlestir(a); ip.textContent = ipVars; cub.querySelectorAll('i.on').forEach(x => x.classList.remove('on')); } });
    cub.addEventListener('keydown', e => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); goster(Math.max(1, Math.min(su.ayet, hedef + d))); } if (e.key === 'Enter' && hedef !== a) location.hash = `#/${s}/${hedef}`; });
    el.querySelector('.gk-lej').addEventListener('click', e => { const b = e.target.closest('button[data-g]'); if (!b) return; const on = b.getAttribute('aria-pressed') !== 'true';
      el.querySelectorAll('.gk-lej button').forEach(x => x.setAttribute('aria-pressed', String(on && x === b))); cub.classList.toggle('suz', on); cub.querySelectorAll('i').forEach(x => x.classList.toggle('sec', on && x.dataset.g === b.dataset.g)); });
    requestAnimationFrame(() => yerlestir(a)); addEventListener('resize', () => yerlestir(a));
    /* seçili ayetin konuları: her konu kartında bu suredeki ve Kur'an'daki diğer yerleri */
    const aralik = L => L.reduce((R, n) => { const r = R[R.length - 1]; if (r && n === r[1] + 1) r[1] = n; else R.push([n, n]); return R; }, []);
    const T = et(a).slice().sort((p, q) => E[p][1].length - E[q][1].length);
    const kart = i => { const [ad, L] = E[i]; const bu = L.filter(r => r.startsWith(s + ':')).map(r => +r.split(':')[1]); const dig = {}; L.forEach(r => { const [x, y] = r.split(':').map(Number); if (x !== s) (dig[x] ||= []).push(y); });
      const ds = Object.keys(dig).map(Number); const g = GN.etiket_genel[i];
      return `<div class="gk-k" style="--c:${RENK[g] || RENK.diger}"><div class="gk-ku"><b>${esc(ad)}</b><span>${L.length} ayet</span></div>
        <p class="gk-bu">Bu surede: ${aralik(bu).map(([x, y]) => x === y ? (x === a ? `<b>${x}</b>` : `<a href="#/${s}/${x}">${x}</a>`) : `<a href="#/${s}/${x}">${x}</a>–<a href="#/${s}/${y}">${y}</a>`).join(', ')}</p>
        ${ds.length ? `<p class="gk-dig">${ds.slice(0, 8).map(x => `<span><a href="#/${x}/${dig[x][0]}">${esc(TRS(x))}</a> ${dig[x].slice(0, 6).map(y => `<a href="#/${x}/${y}">${y}</a>`).join(', ')}${dig[x].length > 6 ? '…' : ''}</span>`).join(' · ')}${ds.length > 8 ? ` <button type="button" class="gk-tum" data-i="${i}">+${ds.length - 8} sure</button>` : ''}</p>` : '<p class="gk-dig">Başka surede geçmiyor.</p>'}</div>`; };
    const kk = el.querySelector('.gk-konu');
    kk.innerHTML = T.length ? `<h3>${a}. ayetin konuları</h3>${T.map(kart).join('')}` : '<p class="gk-bos">Bu ayet fihristte etiketlenmemiş.</p>';
    /* kütüphane fihristi: bu ayetin alıntılandığı bölüm başlıkları (fh2; build_fihrist_kutup.py) */
    if (typeof ATIF_ACIK !== 'undefined' && ATIF_ACIK) Promise.all([load(`/data/fh2/a/${s}.json`).catch(() => ({})), load('/data/fh2/konu.json'), load('/data/fh2/tr.json').catch(() => ({}))]).then(([A, KN, TRK]) => {
      const L = A[String(a)] || []; if (!L.length) return;
      kk.insertAdjacentHTML('beforeend', `<div class="fk"><h3>Kütüphanede bu ayetin geçtiği konular</h3><p class="ss-not">Kitapların bölüm başlıkları: ayet o başlıklı bölümde en az iki ayrı eserde alıntılanmış. Sayı, eser sayısıdır.</p>
        <div class="fk-l">${L.map(([n, c]) => `<button type="button" class="fk-k" data-n="${n}"><bdi lang="ar">${esc(KN.k[n][0])}</bdi>${TRK[KN.k[n][0]] ? `<span>${esc(TRK[KN.k[n][0]])}</span>` : ''}<small>${c}</small></button>`).join('')}</div><div class="fk-ay"></div></div>`);
      const box = kk.querySelector('.fk-ay');
      kk.querySelector('.fk-l').addEventListener('click', async e => { const b = e.target.closest('.fk-k'); if (!b) return; const n = +b.dataset.n;
        kk.querySelectorAll('.fk-k').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        const P = (await load(`/data/fh2/k/${Math.floor(n / 500)}.json`))[n] || [];
        box.innerHTML = `<p><b lang="ar">${esc(KN.k[n][0])}</b>${TRK[KN.k[n][0]] ? ` (${esc(TRK[KN.k[n][0]])})` : ''} başlıklı bölümler ${KN.k[n][1]} eserde; en çok alıntılanan ayetler:</p><p class="fk-ayl">${P.slice(0, 60).map(([k, c]) => `<a href="#/${k.replace(':', '/')}"${k === `${s}:${a}` ? ' class="bu"' : ''}>${k}<small>${c}</small></a>`).join('')}</p>`; });
    });
    kk.addEventListener('click', e => { const b = e.target.closest('.gk-tum'); if (!b) return; const i = +b.dataset.i, dig = {}; E[i][1].forEach(r => { const [x, y] = r.split(':').map(Number); if (x !== s) (dig[x] ||= []).push(y); });
      b.outerHTML = Object.keys(dig).slice(8).map(x => ` · <span><a href="#/${x}/${dig[x][0]}">${esc(TRS(+x))}</a> ${dig[x].map(y => `<a href="#/${x}/${y}">${y}</a>`).join(', ')}</span>`).join(''); });
  }).catch(() => {});

  /* ---- kelimeler: ayet metnindeki kelimeye dokununca bilgi paneli ---- */
  const kelSec = i => {
    view.querySelectorAll('#ayMetin .kw').forEach(x => x.classList.toggle('sec', +x.dataset.i === i));
    kelimePanel(s, a, A, i);
  };
  $('#ayMetin').addEventListener('click', e => { const k = e.target.closest('.kw'); if (k) { kelSec(+k.dataset.i); $('#kwIpucu')?.remove(); try { localStorage.setItem('kwIpucu', '1'); } catch { /* yok */ } } });
  $('#ayMetin').addEventListener('keydown', e => { const k = e.target.closest('.kw'); if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kelSec(+k.dataset.i); } });

  /* ---- bloklar: görünür oldukça yüklenir ---- */
  const BLOK = { tefsir: blokTefsir, hadis: blokHadis, dil: blokDil, fikih: blokFikih, kelam: blokKelam, esbab: blokEsbab, cagdas: blokCagdas, selef: blokSelef, dinler: blokDinler, yazma: blokYazma, literatur: blokLiteratur };
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
  const tr = {}; R.eserler.forEach(e => (e.k2 || []).forEach(r => { tr[r] = e; }));
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
/* k3: kütüphanemizdeki kitaplarda ayetin geçtiği yerler (atıf taraması, R2: atif/) */
const ATF = {};
const atif = (s, a) => (ATF[`${s}:${a}`] ||= Promise.all([atifOfs().then(O => O.ayet[`${s}:${a}`] ? rangeGz('atif/ayet.bin', O.ayet[`${s}:${a}`]) : { g: {} }).catch(() => ({ g: {} })), load('/data/y/k.json')]));
const atifParca = (s, a) => atifOfs().then(O => O.parca[`${s}:${a}`] ? rangeGz('atif/parca.bin', O.parca[`${s}:${a}`]) : {}).catch(() => ({}));
const k3Yer = h => [+h[0] ? `c. ${+h[0]}` : '', h[1] && h[1] !== '0' ? `s. ${h[1]}` : ''].filter(Boolean).join(', ');
const k3Oge = ([id, n, hits], K, s, a) => {
  const k = K[id] || ['', '', '', null, ''];
  return {
    k: 'k3' + id, yil: k[3] || null, ad: k[2] || '—', arAd: !/[a-zçğıöşüâîû]/i.test(k[2] || ''), eser: k[0] || k[1], say: n,
    kitap: `#/eser/${id}/${hits[0] ? hits[0][2] : 0}`, disKitap: false, ozet: '1',
    yukle: async () => {
      const P = (await atifParca(s, a))[id] || [];
      return { dil: 'ar', yer: k3Yer(hits[0] || []), html: hits.map((h, i) => `<div class="k3y"><span class="sy">${esc(k3Yer(h) || 'yer')}${h[3] ? ' · ayetin tamamı' : ''}</span>${P[i] ? `<p>${ayetIsaret(esc(P[i]))}</p>` : ''}<a class="k3git" href="#/eser/${id}/${h[2]}">Kitapta bu yeri aç</a></div>`).join('')
        + (n > hits.length ? `<p class="srcs">Bu eserde ${n - hits.length} yer daha var.</p>` : '') };
    },
    kunye: chain([{ r: 'Kitap', t: `${k[2] || ''}${k[3] ? ` (ö. ${k[3]})` : ''}, ${k[0] || k[1]}`, u: `#/eser/${id}` }, { r: 'Veri', t: 'vahiy++ kütüphanesi' }, { r: 'Bağ', t: 'makine: ayet metni eşleşmesi (en az 6 kelime ya da ayetin tamamı)', b: 'kutup_tara' }])
  };
};
const ATIF_ACIK = true; /* kütüphane atıfları açık (24.10.2026 22:23: kullanıcı yalnızca kaynak gösterimini istemedi) */
const k3Gruplar = async (s, a, gruplar, suz) => {
  if (!ATIF_ACIK) return [];
  const [b, K] = await atif(s, a);
  return gruplar.flatMap(g => (b.g[g] || []).filter(r => !suz || suz(r, K)).map(r => k3Oge(r, K, s, a)));
};

async function blokTefsir(s, a) {
  const [W, K9] = await Promise.all([k2Veri(s, a), load('/data/k9/index.json').then(I => I.sureler.includes(s) ? load(`/data/k9/${s}.json`) : { ayetler: {} }).catch(() => ({ ayetler: {} }))]);
  const L = W.filter(x => x.e.tur === 'tefsir').map(x => k2Oge(x, s, a));
  const ayni = new Set(W.map(x => x.tr.tam || x.tr.id).filter(Boolean));
  L.push(...(await k3Gruplar(s, a, ['tefsir'], r => !ayni.has(r[0]))));
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
  const { riv } = await esbParts(s, a);
  const B = await k3Gruplar(s, a, ['ulum', 'tefsir', 'hadis'], (r, K) => /نزول|ناسخ|منسوخ|نواسخ/.test((K[r[0]] || [])[1] || ''));
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
/* Kitaptan bir madde/kesit: <details data-kesit data-id data-b data-t> açılınca bölüm indirilir, başlıktan itibaren gösterilir */
document.addEventListener('toggle', async ev => {
  const dt = ev.target;
  if (!(dt instanceof HTMLDetailsElement) || !dt.hasAttribute('data-kesit') || !dt.open || dt.dataset.y) return;
  dt.dataset.y = 1; const m = dt.querySelector('.kesit');
  try {
    const D = (await dizinAl(dt.dataset.id)).b;
    let t = (await bolumAl(dt.dataset.id, D[+dt.dataset.b])).replace(/\x01[^\x01]*\x01/g, ' ').replace(/\x04/g, ' ');
    const bas = (dt.dataset.ara || '').replace(/[\u064B-\u0652\u0670]/g, '').replace(/^[\s\d٠-٩\[\]()\-–.]+/, '').split(/\s+/).slice(0, 3).join(' ');
    if (bas) { const yalin = t.replace(/[\u064B-\u0652\u0670]/g, ''); const j = yalin.indexOf(bas); if (j > 0) { let say = 0, k = 0; for (; k < t.length && say < j; k++) if (!/[\u064B-\u0652\u0670]/.test(t[k])) say++; t = t.slice(Math.max(0, k - 30)); } }
    m.innerHTML = `<p lang="ar" class="ar">${esc(tmKisa(t, +dt.dataset.n || 1500))}</p>`;
  } catch { m.innerHTML = '<p class="srcs">Metin indirilemedi.</p>'; }
}, true);
/* Râvinin kütüphanedeki biyografileri (data/k4/rc/{id}.json; build_rical.py) */
async function ricalHtml(k, RC) {
  if (!RC.ravi[k]) return '';
  const L = await load(`/data/k4/rc/${k}.json`).catch(() => []);
  const sat = x => { const e = RC.kitap[x.k] || ['', '', '', null]; return `<li>${x.m.map((m, j) => `<details data-kesit data-id="${x.k}" data-b="${m[0]}" data-t="${esc(m[1])}"><summary>${j ? '' : `<b>${esc(e[0] || e[1])}</b> <small>${esc(e[2] || '')}${e[3] ? ` · ö. ${e[3]}` : ''}${x.b.length ? ` · ${x.b.length + 1} baskı` : ''}</small>`}<bdi class="rc-bas" lang="ar">${esc(m[1])}</bdi></summary><div class="kesit"><p class="srcs">Yükleniyor…</p></div><a class="k3git" href="#/eser/${x.k}/${m[0]}">Kitapta aç</a></details>`).join('')}</li>`; };
  const bio = L.filter(x => x.tur === 'biyografi'), mus = L.filter(x => x.tur === 'musned');
  return `<div class="rc"><h5>Kütüphanedeki biyografileri <small>${bio.length} eser</small></h5><ol class="rc-l">${bio.map(sat).join('')}</ol>${mus.length ? `<details class="rc-m"><summary>Müsned ve mu'cemlerde rivayet babı (${mus.length})</summary><ol class="rc-l">${mus.map(sat).join('')}</ol></details>` : ''}<p class="srcs kaynak-not">Ad eşleşmesiyle bağlandı (ism, baba, gerekirse dede); aynı adı taşıyan üçten fazla madde olan kitaplarda bağ kurulmadı.</p></div>`;
}
/* isim tıklanınca kişi sayfası (kart bir <button> olduğundan bağlantı yerine yakalama) */
const kisiGit = ev => { const t = ev.target.closest?.('[data-kisi]'); if (!t || (ev.type === 'keydown' && ev.key !== 'Enter')) return; const k = t.dataset.kisi; if (!/^\d+$/.test(k)) return; ev.preventDefault(); ev.stopPropagation(); location.hash = `#/kisi/${k}`; };
document.addEventListener('click', kisiGit, true); document.addEventListener('keydown', kisiGit, true);
/* Kişi sayfası: #/kisi/{ravi_id} — kimlik, Takrîb hükmü, rivayet sayıları ve kütüphanedeki biyografileri */
async function kisiSayfa(k) {
  const [R, T, RC] = await Promise.all([load('/data/k4/raviler.json'), load('/data/k4/selef_tr.json').catch(() => ({ raviler: {} })), load('/data/k4/rical.json').catch(() => ({ kitap: {}, ravi: {} }))]);
  const rv = R.raviler[k], tr = T.raviler[k];
  if (!rv && !tr) { view.innerHTML = '<h1>Kişi bulunamadı</h1><p class="lede">Bu kimlik numarasıyla kayıtlı bir râvi yok.</p>'; return; }
  const ad = tr ? tr[0] : rv.ad, tk = rv?.takrib || {};
  const KUSAK = { s: 'Sahâbî', t: 'Tâbiî', e: "Tebeu't-tâbiîn" };
  const kusak = tr ? KUSAK[tr[2]] : tk.tabaka === 1 ? 'Sahâbî' : tk.tabaka ? `${tk.tabaka}. tabaka` : '';
  const vef = tr ? tr[1] : tk.vefat;
  document.title = `${ad} · vahiy++`;
  const bio = await ricalHtml(k, RC);
  view.innerHTML = `<article class="kisi"><p class="srcs"><a href="javascript:history.back()">← Geri</a></p>
    <h1${tr ? '' : ' lang="ar"'}>${esc(ad)}</h1>${tr && rv ? `<p class="kisi-ar" lang="ar">${esc(rv.ad)}</p>` : ''}
    <p class="kisi-cip">${kusak ? `<span>${esc(kusak)}</span>` : ''}${vef ? `<span>ö. ${esc(String(vef))}</span>` : ''}${rv ? `<span>${fmt(rv.rivayet)} rivayet · ${fmt(rv.ayet)} ayette</span>` : ''}</p>
    ${tk.metin ? `<section class="kisi-b"><h2>Takrîbü't-Tehzîb</h2><p lang="ar" class="ar">${esc(tk.metin)}</p>${tk.derece ? `<p class="srcs">Hüküm: ${esc(GRADE_TR[tk.derece] || tk.derece)}</p>` : ''}</section>` : ''}
    <section class="kisi-b">${bio || '<h2>Kütüphanedeki biyografileri</h2><p class="srcs">Bu kişi için kütüphanedeki biyografi kitaplarında güvenilir bir ad eşleşmesi kurulamadı.</p>'}</section></article>`;
}
async function blokSelef(s, a) {
  const [[b], R, T, RC] = await Promise.all([ayX(s, a), load('/data/k4/raviler.json'), load('/data/k4/selef_tr.json').catch(() => ({ raviler: {} })), load('/data/k4/rical.json').catch(() => ({ kitap: {}, ravi: {} }))]);
  const RV = R.raviler, TR = T.raviler;
  const TAB = { s: 'sahâbî', t: 'tâbiî', e: 'tebeu’t-tâbiîn' };
  /* sözün sahibi: rivayetteki râvilerden en eski olanı (Türkçe kaydı olanlar önce) */
  const sahip = x => { const ids = x.raviler.map(String); const bil = ids.filter(i => TR[i]).sort((p, q) => TR[p][1] - TR[q][1]); return bil[0] || ids[0] || ('?' + (x.metin.match(/^(?:قال|عن)\s+([^:،,\-]{3,40})/)?.[1] || '')); };
  const gr = new Map();
  b.k4.forEach(x => { const k = sahip(x); if (!gr.has(k)) gr.set(k, []); gr.get(k).push(x); });
  const sozKisa = t => tmKisa(String(t).replace(/^(?:عن|قال)[^:]{0,80}:\s*/, '').replace(/^[^«"]*[«"]/, ''), 90);
  const L = [...gr.entries()].map(([k, X]) => {
    const tr = TR[k], rv = RV[k];
    const ad = tr ? tr[0] : rv ? rv.ad : k.replace(/^\?/, '') || 'Bilinmeyen';
    const turler = [...new Set(X.map(x => RTYPE(x.tur)))];
    const tk = rv?.takrib || {}, tab = tk.tabaka;
    const kusak = tr ? tr[2] : tab === 1 ? 's' : tab && tab <= 6 ? 't' : tab && tab <= 9 ? 'e' : tab ? 'x' : (tk.metin && /صحابي|له صحبة/.test(tk.metin) ? 's' : '');
    const KUSAK = { s: ['Sahâbî', '#9A7A2C'], t: ['Tâbiî', '#1F7A80'], e: ['Tebeu\'t-tâbiîn', '#1E3A5F'], x: ['Sonraki nesil', '#6B3A5A'], '': ['Kuşağı belirsiz', '#5E6878'] }[kusak];
    const der = kusak === 's' ? '' : tk.derece || '';
    const derC = /كذب|متروك|ضعيف|منكر|وضاع|يهم|ليس بشيء/.test(der) ? 'd' : /ثق|حافظ|إمام|امام|صدوق/.test(der) || kusak === 's' ? 's' : '';
    const vef = tr ? tr[1] : tk.vefat;
    const harf = (rv?.ad || ad).replace(/^(?:عبد|أبو|ابو)\s*/, '').trim()[0] || '؟';
    const kart = `<span class="pr-ust"><svg class="pr-mad" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 2l8.5 11.5L55 10l-3.5 14.5L62 32l-10.5 7.5L55 54l-14.5-3.5L32 62l-8.5-11.5L9 54l3.5-14.5L2 32l10.5-7.5L9 10l14.5 3.5z"/><text x="32" y="42" text-anchor="middle">${esc(harf)}</text></svg></span>
      <span class="pr-ic"><b class="pr-ad" data-kisi="${esc(k)}" role="link" tabindex="0" title="Kişi sayfasını aç"${tr ? '' : ' lang="ar"'}>${esc(ad)}</b>${tr && rv ? `<span class="pr-ar" lang="ar">${esc(rv.ad)}</span>` : ''}
      <span class="pr-cip"><i>${KUSAK[0]}${tab && kusak !== 's' ? ` · ${tab}. tabaka` : ''}</i>${vef ? `<i>ö. ${vef}</i>` : ''}${der ? `<i class="${derC}" lang="${kusak === 's' ? 'tr' : 'ar'}" title="İbn Hacer, Takrîbü't-Tehzîb">${esc(der)}</i>` : ''}</span>
      <span class="pr-say"><span><b>${X.length}</b><small>bu ayette</small></span>${rv ? `<span><b>${fmt(rv.rivayet)}</b><small>${fmt(rv.ayet)} ayette</small></span>` : ''}</span>
      <span class="pr-soz" lang="ar">${esc(sozKisa(X[0].metin))}</span>
      <span class="pr-dug"><span class="a">${X.length} rivayet</span><span class="o">Kişi sayfası: isme dokunun</span></span></span>`;
    return { k: 'sl' + k, kart, renk: KUSAK[1], f: { kusak: KUSAK[0], hukum: derC === 'd' ? 'Cerhedilmiş' : derC === 's' ? 'Güvenilir' : 'Hükümsüz' }, yil: tr ? tr[1] : (rv?.takrib?.vefat || null), ad, arAd: !tr, eser: `${X.length} rivayet${tr ? ' · ' + TAB[tr[2]] : ''}${turler.length && !(turler.length === 1 && turler[0] === 'Tefsir') ? ' · ' + turler.join(', ') : ''}`, parca: sozKisa(X[0].metin), ozet: '1', kitap: null,
      yukle: async () => ({ dil: 'ar', html: X.map(x => `<div class="rv1"><span class="sy">${esc(RTYPE(x.tur))}${x.hukum ? ' · tahrîcte: ' + esc(x.hukum) : ''}</span><p>${ayetIsaret(para(x.metin))}</p>${x.tahric ? `<details class="zo-cev"><summary>Tahrîc</summary><p class="thr">${para(x.tahric)}</p></details>` : ''}</div>`).join('') + (rv && rv.takrib ? `<p class="srcs" dir="ltr">Takrîbü't-Tehzîb: ${esc(GRADE_TR[rv.takrib.derece] || rv.takrib.derece || '—')}${rv.takrib.tabaka ? `, ${rv.takrib.tabaka}. tabaka` : ''}</p>` : '') + (/^\d+$/.test(k) ? `<p><a class="k3git" href="#/kisi/${k}">${esc(ad)}: kişi sayfası</a></p>` : '') }),
      kunye: chain([{ r: 'Rivayetler', t: `Mevsûa kayıt no ${X.map(x => x.id).join(', ')}` }, { r: 'Eser', k: 'mevsua' }, { r: 'Veri', k: 'quranpedia' }, tr && { r: 'Türkçe ad ve vefat', t: T.kaynak, k: 'claude' }]) };
  });
  L.birim = 'kişi'; L.onek = 'ö.'; L.suzgec = [['kusak', 'Kuşak'], ['hukum', 'Takrîb hükmü']];
  L.giris = b.k4.length ? `<p class="zc-giris">Sahâbe ve tâbiûnun bu ayet hakkındaki sözleri: ${b.k4.length} rivayet, ${L.length} kişiden. Bir kişiye dokunun, sözleri tahrîc ve hükümleriyle açılsın.</p>` : '';
  return L;
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
  const SUZ0 = items.suzgec, MES = items.meseleler || [], MIL = items.takvim === 'm', BIRIM = items.birim || 'eser', GIRIS = items.giris || '';
  const ASIR = MIL ? (y => y == null ? 'Tarihsiz' : y < 0 ? `MÖ ${Math.ceil(-y / 100)}. yüzyıl` : `MS ${Math.floor((Math.max(y, 1) - 1) / 100) + 1}. yüzyıl`) : ASIR_H;
  const yilYaz = MIL ? (y => y == null ? '' : y < 0 ? `MÖ ${-y}` : `MS ${y}`) : (y => yilYazH(y, items.onek));
  items = items.map(x => ({ ...x, yil: MIL ? x.yil : hicri(x.yil) })).sort((p, q) => (p.yil === 'c' ? 1448 : p.yil ?? 99999) - (q.yil === 'c' ? 1448 : q.yil ?? 99999));
  if (!items.length) { govde.innerHTML = '<p class="zc-bos">Bu ayet için bu grupta kayıt yok.</p>'; el.classList.add('bos'); return; }
  const yillar = items.map(x => x.yil).filter(y => typeof y === 'number');
  if (sayEl) sayEl.textContent = `${items.length} ${BIRIM}${yillar.length ? ` · ${MIL ? `${yilYaz(Math.min(...yillar))}–${yilYaz(Math.max(...yillar))}` : `h. ${Math.min(...yillar)}–${Math.max(...yillar)}`}` : ''}`;
  let mes = -1, aktif = (items.find(x => x.ozet) || items[0]).k, pin = [], kel = null;
  /* süzgeç: her bölüm kendi ölçütlerini verir (items.suzgec = [[anahtar, başlık]]), yoksa dönem */
  const DONEM = y => y == null ? 'Tarihsiz' : y === 'c' || y > 1342 ? 'Modern' : y <= 310 ? 'Erken' : y <= 656 ? 'Klasik' : y <= 922 ? 'Orta' : 'Osmanlı';
  const SUZ = (SUZ0 || [['asir', MIL ? 'Yüzyıl' : 'Asır']]).concat(!SUZ0 && items.some(x => x.tr) ? [['dil', 'Dil']] : []);
  const deger = (x, k) => k === 'donem' ? DONEM(x.yil) : k === 'asir' ? ASIR(x.yil) : k === 'dil' ? (x.tr ? 'Türkçe' : 'Arapça') : (x.f || {})[k] || 'Diğer';
  const fs = {}; const gor = x => SUZ.every(([k]) => !fs[k] || deger(x, k) === fs[k]);
  const SIRA = ['Erken', 'Klasik', 'Orta', 'Osmanlı', 'Modern', 'Tarihsiz'];
  const kelVar = x => !kel || nAr(x.ara || '').includes(kel.k);
  govde.innerHTML = `${GIRIS}<div class="zc-suz"></div>${MES.length ? '<div class="zc-mes"></div>' : ''}<div class="zc-serit" tabindex="0" aria-label="Eserler, tarihe göre"></div><div class="zc-arac"></div><div class="zc-oku" aria-live="polite"></div>`;
  const serit = govde.querySelector('.zc-serit');
  const meseleOf = k => mes >= 0 ? MES[mes].eserler.find(m => m.w === k) : null;
  const cizSerit = () => {
    const vis = items.filter(gor); if (!vis.some(x => x.k === aktif) && vis.length) aktif = vis[0].k;
    cizSuz(vis);
    const gr = []; vis.forEach(x => { const as = ASIR(x.yil); const g = gr[gr.length - 1]; if (g && g.as === as) g.L.push(x); else gr.push({ as, L: [x] }); });
    const sl = serit.scrollLeft;
    serit.innerHTML = gr.map(g => `<div class="zc-asir"><div class="zc-as">${g.as}<small>${g.L.length}</small></div><div class="zc-kol">${g.L.map(x => { const m = meseleOf(x.k); const sonuk = (mes >= 0 && !m) || !kelVar(x); if (x.kart) return `<button type="button" class="zc-k profil${x.k === aktif ? ' sec' : ''}${sonuk ? ' sonuk' : ''}${pin.includes(x.k) ? ' pin' : ''}" data-k="${esc(x.k)}" style="--c:${x.renk}">${x.kart}</button>`; return `<button type="button" class="zc-k${x.k === aktif ? ' sec' : ''}${sonuk ? ' sonuk' : ''}${pin.includes(x.k) ? ' pin' : ''}" data-k="${esc(x.k)}"${m ? ` style="--c:${TM_ETIKET_RENK[m.e]}"` : ''}><span class="y">${yilYaz(x.yil) || '&nbsp;'}</span><b${x.arAd ? ' lang="ar"' : ''}>${esc(x.ad)}</b><small${isArYazi(x.eser) ? ' lang="ar"' : ''}>${esc(x.eser)}</small>${x.parca ? `<span class="pc" lang="ar">${esc(x.parca)}</span>` : ''}${m ? `<i style="--c:${TM_ETIKET_RENK[m.e]}">${esc(MES[mes].etiketler?.[m.e] || '')}</i>` : x.tr ? '<i class="tr">Türkçe</i>' : x.rozet ? `<i>${esc(x.rozet)}</i>` : ''}</button>`; }).join('')}</div></div>`).join('');
    serit.scrollLeft = sl;
    const mo = mes >= 0 && MES[mes].ozet ? MES[mes].ozet : null;
    let ozk = govde.querySelector('.zc-mozet'); if (!ozk) { ozk = document.createElement('div'); ozk.className = 'zc-mozet'; serit.before(ozk); }
    ozk.innerHTML = mo ? `<small>Türkçe özet · makine, kaynaklardan kontrol edin</small>${mo.map(m => `<p><b>${esc(m.mesele)}</b> ${esc(m.ozet)} <span class="srcs">${m.kaynaklar.map(esc).join(' · ')}</span></p>`).join('')}` : '';
    if (MES.length) govde.querySelector('.zc-mes').innerHTML = `<span>Meseleler</span>${MES.map((M, i) => `<button type="button" data-m="${i}" aria-pressed="${mes === i}">${esc(M.ad)} <small>${M.eserler.length}</small></button>`).join('')}${mes >= 0 ? '<button type="button" data-m="-1">Tüm eserler</button>' : ''}`;
    const kn = kel ? items.filter(kelVar).length : 0;
    govde.querySelector('.zc-arac').innerHTML = (kel ? `<span class="zc-kel">Süzgeç: <b lang="ar">${esc(kel.ar)}</b> geçen ${kn} eser</span><button type="button" class="zc-kelx">Süzgeci kaldır</button>` : '') + (pin.length ? `<button type="button" class="zc-kars">Yan yana oku (${pin.length})</button><button type="button" class="zc-temiz">Karşılaştırmayı temizle</button>` : '');
  };
  const cizSuz = vis => {
    const kutu = govde.querySelector('.zc-suz');
    kutu.innerHTML = SUZ.map(([k, ad]) => {
      const say = {}; items.filter(x => SUZ.every(([k2]) => k2 === k || !fs[k2] || deger(x, k2) === fs[k2])).forEach(x => { const d = deger(x, k); say[d] = (say[d] || 0) + 1; });
      const D = Object.keys(say).sort((p, q) => (p === 'Tarihsiz') - (q === 'Tarihsiz') || (SIRA.indexOf(p) + 1 || 99) - (SIRA.indexOf(q) + 1 || 99) || (parseInt(p.replace(/\D/g, '')) || 0) - (parseInt(q.replace(/\D/g, '')) || 0) || p.localeCompare(q, 'tr'));
      if (D.length < 2 && !fs[k]) return '';
      return `<div class="zc-sz" role="group" aria-label="${esc(ad)}"><span>${esc(ad)}</span><button type="button" data-sk="${k}" data-sv="" aria-pressed="${!fs[k]}">Tümü</button>${D.map(d => `<button type="button" data-sk="${k}" data-sv="${esc(d)}" aria-pressed="${fs[k] === d}">${esc(d)} <small>${say[d]}</small></button>`).join('')}</div>`;
    }).join('') + `<label class="zc-git"><span>Doğrudan git</span><select aria-label="Doğrudan git">${vis.map(x => `<option value="${esc(x.k)}"${x.k === aktif ? ' selected' : ''}>${esc([yilYaz(x.yil), x.ad, x.eser && x.eser !== x.ad ? x.eser : ''].filter(Boolean).join(' · ').slice(0, 90))}</option>`).join('')}</select></label>`;
  };
  govde.addEventListener('click', e => { const b = e.target.closest('[data-sk]'); if (!b) return; fs[b.dataset.sk] = b.dataset.sv || undefined; cizSerit(); oku(); serit.scrollLeft = 0; });
  govde.addEventListener('change', e => { const sl = e.target.closest('.zc-git select'); if (!sl) return; aktif = sl.value; cizSerit(); oku(); const c = serit.querySelector('.zc-k.sec'); if (c) c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
  const bas = x => `<div><b${x.arAd ? ' lang="ar"' : ''}>${esc(x.ad)}</b><small>${x.yil ? yilYaz(x.yil) + ' · ' : ''}<span${isArYazi(x.eser) ? ' lang="ar"' : ''}>${esc(x.eser)}</span></small></div>`;
  const oku = async () => {
    const x = items.find(y => y.k === aktif); if (!x) return;
    const box = govde.querySelector('.zc-oku'), m = meseleOf(x.k);
    box.innerHTML = `<div class="zo-bas">${bas(x)}</div><p class="durum">Yükleniyor…</p>`;
    const r = await x.yukle(m?.vurgu || (kel && kelVar(x) ? kel.k : undefined));
    if (aktif !== x.k) return;
    if (x.sade) { box.innerHTML = `<div class="zo-bas"><div><b>${esc(x.ad)}</b></div></div><div class="zo-metin">${r.html}</div>`; return; }
    box.innerHTML = `<div class="zo-bas">${bas(x)}
      <div class="zo-dug">${x.kitap ? `<a href="${esc(x.kitap)}"${x.disKitap ? ' target="_blank" rel="noopener"' : ''}>${esc(x.kitapAd || 'Kitaba git')}${r.yer ? ' · ' + esc(r.yer) : ''}</a>` : ''}<button type="button" data-ac="pin" aria-pressed="${pin.includes(x.k)}">${pin.includes(x.k) ? 'Karşılaştırmada' : 'Karşılaştır'}</button><button type="button" data-ac="atif">Atıf ver</button></div></div>
      ${m && m.ozet ? `<div class="zo-oz"><small>Türkçe özet · makine, metinden kontrol edin</small>${esc(m.ozet)}</div>` : ''}
      <div class="zo-metin${r.dil === 'ar' ? ' ar' : ''}"${r.dil === 'x' ? '' : ` dir="${r.dil === 'ar' ? 'rtl' : 'ltr'}" lang="${r.dil}"`}>${r.html}</div>
      <p class="srcs zo-k">${x.kunye || ''}</p>`;
    if (r.dil === 'ar') turkceDugme(box.querySelector('.zo-metin'), () => box.querySelector('.zo-metin').innerText);
    { const mt = box.querySelector('.zo-metin');  // uzun metin önce kısa açılır; tamamı için dokunulur
      if (!x.k.startsWith('yz') && mt.scrollHeight > 340) { mt.classList.add('kisa'); mt.insertAdjacentHTML('afterend', '<button type="button" class="zo-devam">Tamamını oku</button>');
        box.querySelector('.zo-devam').onclick = ev => { mt.classList.remove('kisa'); ev.target.remove(); }; } }
    if (box.querySelector('[data-ac="atif"]')) box.querySelector('[data-ac="atif"]').onclick = async ev => {
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
/* hareke karşılaştırması için Medine ve Mağrib mushaf imlâ işaretlerini ortak biçime indir */
const kanon = t => String(t || '').replace(/\u06E1/g, '\u0652').replace(/\u08F0/g, '\u064B').replace(/\u08F1/g, '\u064C').replace(/\u08F2/g, '\u064D').replace(/[\u06D6-\u06ED\u0670\u0640]/g, '').replace(/[ٱ]/g, 'ا');
/* harf karşılaştırması: hareke ve hemze yazımı (mushaf imlâsına göre değişir) düşer, hançer elif harf sayılır */
const harfler = t => String(t || '').replace(/ئ/g, 'ي').replace(/ؤ/g, 'و').replace(/[أإآ]/g, 'ا').replace(/[\u0654\u0655ء]/g, '').replace(/ى/g, 'ي').replace(/\u0670/g, 'ا').replace(/[\u064B-\u0652\u0640\u06D6-\u06ED\u08F0-\u08F2]/g, '').replace(/ٱ/g, 'ا');
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
      <section id="kpRiv" class="genis"><h4>Rivayetlerde</h4><p class="durum">Yükleniyor…</p></section>
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
    yaz('#kpKir', (qp.length || cc.length) ? `${qp.length ? `<table class="kp-t">${qp.map(x => `<tr><td lang="ar">${esc(x.okuyus)}</td><td lang="ar">${x.raviler.map(r => esc(r[0])).join('، ')}</td></tr>`).join('')}</table>` : ''}${cc.length ? `<ul class="kp-l">${Object.values(tek).map(t => `<li><i>${esc(t.o)}</i> <span>${[...t.ok].slice(0, 6).map(esc).join(', ')}${t.ok.size > 6 ? '…' : ''}</span><small>${esc([...new Set(t.es)].slice(0, 2).join(' · '))}</small></li>`).join('')}</ul><p class="srcs kaynak-not">Okuyuşlar Corpus Coranicum transkripsiyonuyla.</p>` : ''}` : '<p class="srcs">Bu kelimede kayıtlı kıraat farkı yok.</p>');
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
  // Rivayet mushaflarında bu kelime
  load(`/data/k0/r/${s}.json`).then(RR => {
    const R0 = RR[id] || {};
    const kelT = t => t.split(/\s+/).filter(x => /[\u0621-\u064A\u0671]/.test(x));
    const isk = t => nAr(t).replace(/[اويءى]/g, '');
    const H = kelT(A.metin), hi = H.map(isk);
    const sat = Object.entries(R0).map(([r, v]) => {
      const T = kelT(v.metin.join(' ')), ti = T.map(isk);
      let en = 0, bo = 0;
      for (let o = 0; o + H.length <= T.length + 2; o++) { let sk = 0; for (let j = 0; j < H.length; j++) if (ti[o + j] === hi[j]) sk++; if (sk > bo) { bo = sk; en = o; } }
      const k = T[en + i] || '';
      const hk = H[i] || w.ar;
      const fark = !k ? 'yok' : harfler(k) === harfler(hk) ? (kanon(k) === kanon(hk) ? '' : 'yazım') : 'harf';
      return [r, v, k, fark];
    }).sort((x, y) => (RAVI_VEFAT[x[0]] || 999) - (RAVI_VEFAT[y[0]] || 999));
    const sf = A.sayim_farki || [];
    const ETK = { harf: '<span class="kp-fark h">harf farkı</span>', yazim: '', yazım: '<span class="kp-fark">hareke ya da imlâ farkı</span>', yok: '<span class="kp-fark">bulunamadı</span>', '': '<span class="kp-ayni">aynı</span>' };
    yaz('#kpRiv', `<table class="kp-rv"><tr><th>Hafs (Âsım)</th><td lang="ar">${esc(H[i] || w.ar)}</td><td></td></tr>${sat.map(([r, v, k, f]) => `<tr${f === 'harf' ? ' class="fark"' : ''}><th>${esc(RAVI[r] || r)}${RAVI_IMAM[r] ? ` <small>(${esc(RAVI_IMAM[r])})</small>` : ''}</th><td lang="ar">${esc(k || '—')}</td><td>${ETK[f]}</td></tr>`).join('')}</table>
      ${sf.length ? `<p class="kp-sayim"><b>Sayım:</b> ${sf.map(x => `${esc(RAVI[x.rivayet] || x.rivayet)} (${esc(SAYIM[x.sayim] || x.sayim)}) bu ayeti ${x.durum === 'bölünüyor' ? `ikiye böler (${x.ayet_no.join(' ve ')}. ayetler)` : `başka ayetle birleştirir (${x.ayet_no.join(', ')}. ayet = Hafs ${x.hafs_karsiligi.join('–')})`}`).join(' · ')}</p>` : '<p class="kp-sayim">Bu ayetin sınırı ve numarası bütün rivayetlerde aynı.</p>'}
      <details class="kp-daha"><summary>Ayetin rivayetlere göre tam metni</summary>${sat.map(([r, v]) => `<div class="kp-tam"><b>${esc(RAVI[r] || r)}</b> <small>${esc(SAYIM[v.sayim] || v.sayim)} sayım · ${v.ayet_no.join(', ')}. ayet</small><p lang="ar" class="ar">${esc(v.metin.join(' ۝ '))}</p></div>`).join('')}</details>`);
  }).catch(() => yaz('#kpRiv', '<p class="srcs">Rivayet mushafları açılamadı.</p>'));
  // Lügatler: kütüphanemizdeki madde başlıklı sözlükler (kök → madde bölümü) + ayrıştırılmış eski lügat metinleri (kütüphanede maddesi çıkarılamayanlar)
  Promise.all([load('/data/k0/lugat.json'), load('/data/k5/index.json').catch(() => null)]).then(async ([LG, I]) => {
    const L = kok ? LG.kok[kok] || [] : [];
    const var_ = new Set(L.map(r => r[0])), KARS = { maqayis: 'sh21710', mufradat: 'sh23636', sihah: 'sh23235', lisan: 'sh1687', ayn2: 'sh1682', asas: 'sh21568', mukhtar: 'sh23193', misbah: 'sh12145' };
    let eski = [];
    const n = kok && I ? I.kokler[kok] : undefined;
    if (n !== undefined) {
      const d = await loadGz(`/data/k5/r/${n}.json.gz`).catch(() => null);
      if (d) eski = Object.keys(I.lugatler).filter(k => d.lugat[k] && !var_.has(KARS[k])).map(k => ({ ...I.lugatler[k], metin: d.lugat[k].metin }));
    }
    if (!L.length && !eski.length) return yaz('#kpLug', kok ? '<p class="srcs">Bu kök için lügat maddesi bulunamadı.</p>' : '<p class="srcs">Bu kelimenin kökü yok (edat ya da zamir).</p>');
    const yeni = L.map(([id, b, t]) => { const e = LG.kitap[id]; return { v: e[2] || 9999, h: `<details class="kp-lx" data-id="${id}" data-b="${b}" data-t="${esc(t)}"><summary>${esc(e[0] || e[1])} <small>${e[2] ? 'ö. ' + e[2] : ''} · <bdi lang="ar">${esc(t)}</bdi></small></summary><div class="kp-lxm"><p class="srcs">Açılınca madde yüklenir.</p></div><a class="k3git" href="#/eser/${id}/${b}">Kitapta bu maddeyi aç</a></details>` }; });
    const ek = eski.map(x => ({ v: x.vefat || 9999, h: `<details class="kp-lx"><summary>${esc(x.ad)} <small>${esc(x.muellif)} · ö. ${x.vefat} · ayrıştırılmış metin</small></summary><p lang="ar" class="ar">${esc(tmKisa(x.metin, 900))}</p></details>` }));
    yaz('#kpLug', `<p class="srcs">${L.length} sözlükte madde başlığı olarak${eski.length ? `, ${eski.length} sözlükte ayrıştırılmış metin olarak` : ''}.</p>` + [...yeni, ...ek].sort((p, q) => p.v - q.v).map(x => x.h).join(''));
    box.querySelectorAll('#kpLug details[data-id]').forEach(dt => dt.addEventListener('toggle', async () => {
      if (!dt.open || dt.dataset.y) return; dt.dataset.y = 1;
      const m = dt.querySelector('.kp-lxm');
      try { const D = (await dizinAl(dt.dataset.id)).b; let t = (await bolumAl(dt.dataset.id, D[+dt.dataset.b])).replace(/\x01[^\x01]*\x01/g, ' ').replace(/\x04/g, ' '); const bas = dt.dataset.t; const j = bas ? t.search(new RegExp(`(^|\\n)\\s*${bas.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`)) : -1; if (j > 0) t = t.slice(j); m.innerHTML = `<p lang="ar" class="ar">${esc(tmKisa(t, 1400))}</p>`; }
      catch { m.innerHTML = '<p class="srcs">Madde indirilemedi.</p>'; }
    }));
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
    const ilk = F[0][0], cc = f => `https://corpuscoranicum.de/de/manuscripts/${m}/page/${f}`;
    const yz = String(n.yazi || ''); return { k: 'yz' + m, sade: true, f: { yazi: /hi[ǧg]āz/i.test(yz) ? 'Hicâzî' : /k[ūu]f/i.test(yz) ? 'Kûfî' : yz ? 'Diğer' : 'Belirsiz' }, yil: yr || null, ad: ad.split(',')[0], eser: ad.split(',').slice(1).join(',').trim() || ad, rozet: [n.yazi, t.replace(/^-/, '… '), `yaprak ${F.map(x => x[0]).join(', ')}`].filter(Boolean).join(' · '), ozet: '1', kitap: cc(ilk), disKitap: true, kitapAd: 'Corpus Coranicum\'da aç',
      yukle: async () => {
        const sayfalar = await Promise.all(F.slice(0, 4).map(([f]) => fetch(`https://api.corpuscoranicum.de/api/data/language/de/manuscripts/${m}/pages/${f}`).then(r => r.ok ? r.json() : null).catch(() => null)));
        const yer = p => (p.passages || []).map(x => `${x.start.sura}:${x.start.verse}${x.end.sura !== x.start.sura || x.end.verse !== x.start.verse ? '–' + (x.end.sura !== x.start.sura ? x.end.sura + ':' : '') + x.end.verse : ''}`).join(', ');
        const gor = sayfalar.map((d, i) => { const p = d && d.data, f = F[i][0];
          if (!p || !(p.images || []).length) return `<figure class="yz-gor yok"><div>Bu yaprağın görüntüsü Corpus Coranicum'da yok.</div><figcaption>Yaprak ${esc(f)}</figcaption></figure>`;
          const im = p.images[0];
          return `<figure class="yz-gor"><a href="${cc(f)}" target="_blank" rel="noopener"><img src="${esc(im.image_url.replace(/&dw=\d+/, '&dw=900'))}" alt="${esc(ad)}, yaprak ${esc(f)}" loading="lazy"></a><figcaption>Yaprak ${esc(f)}${yer(p) ? ` · ${esc(yer(p))}` : ''}${im.image_source ? `<small>Görüntü: ${esc(im.image_source)}</small>` : ''}</figcaption></figure>`; }).join('');
        const kunye = [['Kurum', n.kurum], ['Numara', n.no], ['Tarih (miladi)', t.replace(/^-/, '… öncesi ')], ['Yazı', n.yazi], ['Malzeme', n.malzeme]].filter(x => x[1]);
        return { dil: 'tr', html: `<div class="yz-gorler">${gor}</div>${F.length > 4 ? `<p class="zo-yap">Diğer yapraklar: ${F.slice(4).map(([f]) => `<a href="${cc(f)}" target="_blank" rel="noopener">${esc(f)}</a>`).join(' ')}</p>` : ''}
`, yer: F.map(x => x[0]).join(', ') };
      },
      kunye: chain([{ r: 'Nüsha', t: n.ad, u: `https://corpuscoranicum.de/de/manuscripts/${m}` }, { r: 'Görüntü', t: 'Corpus Coranicum dijital kütüphanesi (BBAW)', u: cc(ilk) }, { r: 'Veri', k: 'cc' }, { r: 'İşleme', t: 'TEI yaprak aralıkları ayetlere açıldı:', b: 'yazma' }]) }; });
  L.takvim = 'm'; L.birim = 'nüsha'; L.suzgec = [['asir', 'Yüzyıl'], ['yazi', 'Yazı']];
  return L;
}
async function blokLiteratur(s, a) {
  const K = await load(`/data/k8/${s}.json`); const ay = K.ayet[`${s}:${a}`] || [];
  const L = [...ay, ...K.sure.filter(x => !ay.includes(x))].map(i => { const m = K.makale[i]; const au = (m.authors || '—').split(',');
    return { k: 'mk' + i, f: { bag: ay.includes(i) ? 'Bu ayet' : 'Sure geneli', on: !m.year ? 'Tarihsiz' : +m.year >= 2020 ? '2020 ve sonrası' : +m.year >= 2010 ? '2010–2019' : '2010 öncesi' }, yil: m.year ? +m.year : null, ad: au[0].trim() + (au.length > 1 ? ' vd.' : ''), eser: m.title.split(' / ')[0], rozet: ay.includes(i) ? 'bu ayet' : 'sure', ozet: '1', kitap: m.url, disKitap: true, kitapAd: 'Makaleye git',
      yukle: async () => ({ dil: 'x', html: `<p><b>${esc(m.title.split(' / ')[0])}</b></p><p class="srcs">${esc(m.authors || '')}${m.journal ? ' · ' + esc(m.journal) : ''}${m.year ? ' · ' + m.year : ''}</p>${m.abstract ? `<p dir="auto">${esc(m.abstract)}</p>` : '<p class="srcs">Özet kaydı yok.</p>'}` }),
      kunye: chain([{ r: 'Makale', t: m.url, u: m.url }, { r: 'Künye ve özet', k: 'crossref' }, { r: 'Ayet bağı', t: 'makine: başlık/özetteki atıf', b: 'k8' }]) }; });
  L.takvim = 'm'; L.birim = 'makale'; L.suzgec = [['bag', 'Bağ'], ['on', 'Yıl']];
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
