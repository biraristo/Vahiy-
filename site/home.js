'use strict';
/* vahiy++ — açılış sayfası (vitrin), dil ve tema seçimi, hareketli zemin.
   app.js'den sonra yüklenir; $, load, loadGz, esc, fmt, store, meta, chain, oiUrl app.js'den gelir. */
const NS = 'http://www.w3.org/2000/svg';
const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- tema ---------- */
(function tema() {
  const r = document.documentElement;
  const kayit = store.get('tema', '');
  r.dataset.theme = kayit || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  $('#tema')?.addEventListener('click', () => { r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('tema', r.dataset.theme); });
})();

/* ---------- dil ---------- */
const ARAYUZ_DIL = {
  tr: {},
  en: { 'nav.atlas': "Qur'an atlas", 'nav.kutuphane': 'Library', 'h1': 'From text to meaning, from meaning to history.',
    'alt': 'Read a verse alongside {tefsir} tafsirs, {rivayet} early reports, {lugat} lexicons and its traces in {eser} books. Every item is linked to its source.',
    'gir': 'Enter the verse', 'ipucu': 'Turn the outer ring to choose a surah and the inner ring to choose a verse.', 'ayet': 'Verse',
    'atlas': "Qur'an atlas", 'atlas.not': '114 surahs. Choose an ordering and watch the surahs move; the corner number is the surah’s place in that ordering.',
    'A.b': 'You are inside a library', 'A.n': 'Works, quotations, reports and manuscripts linked to the verses.',
    'B.b': 'The library around a verse', 'C.b': 'Fifteen centuries of conversation', 'C.n': 'As you scroll, each Hijri century fills with the number of books in the system by authors who died in it.',
    'D.b': 'What a surah talks about', 'D.n': 'Choose a surah: each topic is a lane and every mark is a verse. Tap a mark to open the verse.',
    'K.b': 'World of sources', 'K.n': 'Books linked to the verses, by discipline.', 'Z.b': 'Every piece of information has an isnad', 'Z.n': 'Every passage on the site comes with a source chain showing where it came from.',
    'son': 'vahiy++ is a personal research project. Every record carries its source chain.' },
  ar: { 'nav.atlas': 'أطلس القرآن', 'nav.kutuphane': 'المكتبة', 'h1': 'من النصّ إلى المعنى، ومن المعنى إلى التاريخ.',
    'alt': 'اقرأ الآية مع {tefsir} تفسيرًا و{rivayet} رواية عن السلف و{lugat} معجمًا، وآثارها في {eser} كتابًا؛ كلّ معلومة موصولة بمصدرها.',
    'gir': 'ادخل الآية', 'ipucu': 'أدِر الحلقة الخارجية لاختيار السورة، والداخلية لاختيار الآية.', 'ayet': 'الآية',
    'atlas': 'أطلس القرآن', 'atlas.not': '١١٤ سورة. اختر ترتيبًا فتنتقل السور إلى مواضعها، والرقم في الزاوية موضعها في ذلك الترتيب.',
    'A.b': 'أنت داخل مكتبة', 'A.n': 'الكتب والاقتباسات والروايات والمخطوطات المرتبطة بالآيات.', 'B.b': 'المكتبة حول آية', 'C.b': 'حوار خمسة عشر قرنًا',
    'C.n': 'كلما نزلت امتلأ كل قرن هجري بعدد كتب المؤلفين المتوفين فيه.', 'D.b': 'عمّ تتحدث السورة', 'D.n': 'اختر سورة: لكل موضوع مسار، وكل علامة آية؛ اضغط العلامة لفتح الآية.',
    'K.b': 'عالم المصادر', 'K.n': 'الكتب المرتبطة بالآيات بحسب العلوم.', 'Z.b': 'لكل معلومة إسناد', 'Z.n': 'كل نص في الموقع يأتي بسلسلة مصدر تبيّن من أين جاء.',
    'son': 'vahiy++ عمل بحثي شخصي، ولكل سجل سلسلة مصدره.' },
};
let dil = store.get('dil', 'tr');
const t = (k, v = {}) => { const s = (ARAYUZ_DIL[dil] && ARAYUZ_DIL[dil][k]) || ARAYUZ_DIL.tr[k] || k; return s.replace(/\{(\w+)\}/g, (_, x) => v[x] ?? ''); };
function dilUygula() {
  const r = document.documentElement; r.lang = dil; r.dir = dil === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('.dil button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === dil)));
  document.querySelectorAll('[data-t]').forEach(e => { if (!ARAYUZ_DIL.tr[e.dataset.t]) ARAYUZ_DIL.tr[e.dataset.t] = e.dataset.tr || e.textContent; e.textContent = t(e.dataset.t, window.__vitrinSay || {}); });
}
document.querySelectorAll('.dil button').forEach(b => b.addEventListener('click', () => { dil = b.dataset.l; store.set('dil', dil); dilUygula(); }));

/* ---------- hareketli zemin: kaydırmaya bağlı, çok yavaş ---------- */
const zemin = (() => {
  const gul = $('#gul'), desen = $('#desen');
  if (!gul) return { kareler: [] };
  const yildiz = (r, n, k, c, w, o) => {
    const p = []; for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n - Math.PI / 2; p.push([r * Math.cos(a), r * Math.sin(a)]); }
    let d = ''; for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + k) % n]; d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }
    const g = document.createElementNS(NS, 'g'); g.innerHTML = `<path d="${d}" stroke="${c}" stroke-width="${w}" opacity="${o}"/><circle r="${r}" stroke="${c}" stroke-width=".7" opacity="${o * .6}"/>`; gul.appendChild(g); return g;
  };
  const G = [[430, 16, 5, 'var(--firuze)', .9, .4], [300, 12, 5, 'var(--zer)', .9, .45], [170, 8, 3, 'var(--firuze)', .9, .4]].map(a => yildiz(...a));
  let son = -1;
  const kareler = [];
  function kare() {
    const y = scrollY;
    if (y !== son) {
      son = y;
      G.forEach((g, i) => g.setAttribute('transform', `translate(800 ${(480 - y * .08).toFixed(1)}) rotate(${((i % 2 ? -1 : 1) * y * (.012 + i * .004)).toFixed(2)})`));
      desen.setAttribute('transform', `translate(0 ${(-y * .15) % 120})`);
    }
    kareler.forEach(f => f(y));
    requestAnimationFrame(kare);
  }
  requestAnimationFrame(kare);
  return { kareler };
})();

/* ---------- açılış sayfası ---------- */
const GRUP = { tefsir: ['Tefsir', '#1F7A80'], hadis: ['Hadis', '#2F55A4'], fikih: ['Fıkıh', '#C9952B'], kelam: ['Kelâm', '#3D9A5B'], tasavvuf: ['Tasavvuf', '#B23A3A'],
  tarih: ['Tarih', '#8A5A2B'], dil: ['Dil', '#7A55B5'], ulum: ['Ulûm', '#D06A9A'], cagdas: ['Çağdaş', '#6F7C8A'] };
const ORNEK_ASIR = { 1: 'İbn Abbas (ö. 68) rivayetleri', 2: 'Mukâtil b. Süleymân (ö. 150)', 3: 'Buhârî (ö. 256), Müslim (ö. 261)', 4: "Taberî (ö. 310), Câmiu'l-beyân", 5: 'Mâverdî (ö. 450), Kuşeyrî (ö. 465)',
  6: "Zemahşerî (ö. 538), İbnü'l-Cevzî (ö. 597)", 7: 'Fahreddin er-Râzî (ö. 606), Kurtubî (ö. 671)', 8: 'Ebû Hayyân (ö. 745), İbn Kesîr (ö. 774)', 9: 'Bikâî (ö. 885), Süyûtî (ö. 911)', 10: 'Ebüssuûd (ö. 982)',
  11: 'İsmâil Hakkı Bursevî (ö. 1127)', 12: 'Şevkânî (ö. 1250)', 13: 'Âlûsî (ö. 1270)', 14: 'Elmalılı (ö. 1361), İbn Âşûr (ö. 1393)', 15: 'Çağdaş çalışmalar' };
let anaTemizle = null;

async function home() {
  setNav('');
  document.body.classList.remove('sakin');
  view.classList.add('ana-main');
  const [S, V, SR] = await Promise.all([meta(), load('/data/vitrin.json'), load('/data/k0/siralamalar.json')]);
  const D = S.sureler, sy = V.sayilar;
  window.__vitrinSay = { tefsir: fmt(sy.tefsir), rivayet: fmt(Math.round(sy.rivayet / 1000) * 1000).replace(/\.000$/, ' bin'), lugat: sy.lugat, eser: fmt(sy.eser) };
  if (dil !== 'tr') window.__vitrinSay.rivayet = fmt(sy.rivayet);
  const A = V.giris[Math.floor(Math.random() * V.giris.length)];
  const [gs, ga] = A.r.split(':');
  view.innerHTML = `<div class="ana">
  <section class="hero"><div>
    <div class="ayetk"><p class="q" lang="ar">${esc(A.ar)}</p><p class="mt">“${esc(A.tr)}”</p><a class="yer" href="#/${gs}/${parseInt(ga)}">${esc(A.sure)} ${esc(A.r)}</a></div>
    <h1 data-t="h1">Metinden manaya, manadan tarihe.</h1>
    <p class="alt" data-t="alt" data-tr="Bir ayeti {tefsir} tefsir, {rivayet} selef rivayeti, {lugat} lügat ve {eser} kitaptaki izleriyle birlikte okuyun. Her bilgi kaynağına bağlı."></p>
    <div class="usturlap">
      <svg id="ust" viewBox="-290 -296 580 304" role="group" aria-label="Sure ve ayet seçici; sağ ve sol ok tuşları sureyi, yukarı ve aşağı ok tuşları ayeti değiştirir" tabindex="0">
        <defs><radialGradient id="ustg"><stop offset="0" stop-color="var(--sheet)"/><stop offset="1" stop-color="var(--sheet)" stop-opacity="0"/></radialGradient></defs>
        <circle r="262" fill="url(#ustg)"/>
        <circle r="268" class="hl"/><circle r="232" class="hl ince"/><circle r="200" class="hl"/><circle r="166" class="hl ince"/><circle r="140" class="hl"/>
        <g id="tik"></g><g id="halka1"></g><g id="halka2"></g>
        <path class="gosterge" d="M0 -293 L7 -284 L0 -275 L-7 -284 Z"/><path class="gosterge" d="M0 -222 L6 -215 L0 -208 L-6 -215 Z"/>
        <line x1="0" y1="-140" x2="0" y2="-118" stroke="var(--zer)" stroke-width="1.2"/>
        <g id="mstar"></g>
      </svg>
      <div class="ust-orta">
        <div class="ust-sure" id="usAr" lang="ar"></div>
        <div class="ust-bilgi" id="usBilgi"></div>
        <div class="ust-ayet"><button class="ok" id="ayGeri" aria-label="Önceki ayet">‹</button><span><span data-t="ayet">Ayet</span> <b id="usAy">1</b></span><button class="ok" id="ayIleri" aria-label="Sonraki ayet">›</button></div>
        <div class="ust-onizleme" id="usOn" lang="ar"></div>
        <button class="gir" id="gir"><span data-t="gir">Ayete gir</span></button>
      </div>
      <p class="ust-ipucu" data-t="ipucu">Dış halkayı çevirerek sureyi, iç halkayı çevirerek ayeti seçin.</p>
    </div>
  </div></section>

  <section class="bolum" aria-labelledby="atlas-b"><h2 id="atlas-b" data-t="atlas">Kur'an atlası</h2>
    <p class="not" data-t="atlas.not">114 sure. Bir sıralama seçin; sureler yeni yerlerine kayar, köşedeki sayı o sıralamadaki yerini gösterir.</p>
    <div class="ana-atlas"><div class="siralar" id="siralar" role="group" aria-label="Sıralama"></div><div class="dosem" id="dosem"></div>
      <div class="ipucu"><span><i></i>Mekkî</span><span><i class="m"></i>Medenî</span><span class="secili" id="secili"></span></div>
      <div class="sira-kaynak" id="siraKaynak"></div></div></section>

  <section class="bolum"><h2 data-t="A.b">Bir kütüphanenin içindesiniz</h2><p class="not" data-t="A.n">Ayetlere bağlanan eserler, alıntılar, rivayetler ve el yazmaları.</p>
    <div class="sayaclar" id="sayaclar"></div><div id="seritler" aria-hidden="true"></div></section>

  <section class="agbolum" id="agb"><div class="agsahne">
    <div class="agust"><div><h2 data-t="B.b">Bir ayetin etrafındaki kütüphane</h2>
      <div class="agsec"><select id="agSure" aria-label="Sure"></select><input id="agAyet" type="number" min="1" value="114" aria-label="Ayet"><span id="agRef" style="color:var(--muted)"></span></div></div>
      <div class="agsay"><span><b id="agn">0</b>eser</span><span><b id="agq">0</b>alıntı</span></div></div>
    <svg id="ag" viewBox="-500 -330 1000 660" role="img" aria-label="Seçili ayete atıf yapan eserler, ilim dallarına göre"></svg>
    <div class="agalt" id="agalt"></div></div></section>

  <section class="zbolum" id="zb"><div class="zsahne"><h2 data-t="C.b">On beş asırlık bir sohbet</h2>
    <p class="not" style="margin:.3rem 0 0" data-t="C.n">Kaydırdıkça hicrî asırlar dolar: her asırda vefat eden müelliflerin sistemdeki eser sayısı.</p>
    <div class="zaman" id="zaman"></div><div class="zeks" id="zeks"></div><div class="zisim" id="zisim" aria-live="polite"></div></div></section>

  <section class="bolum" id="db"><h2 data-t="D.b">Bir sure neyi anlatıyor</h2>
    <p class="not" data-t="D.n">Bir sure seçin: her konu bir şerit, her işaret bir ayettir. İşarete dokununca ayet açılır.</p>
    <div class="dsec"><select id="dSure" aria-label="Sure"></select></div>
    <div id="dIc"></div></section>

  <section class="bolum"><h2 data-t="K.b">Kaynak dünyası</h2><p class="not" data-t="K.n">Ayetlere bağlanan kitaplar, ilim dallarına göre.</p><div class="kaynaklar" id="kaynaklar"></div></section>

  <section class="bolum"><div class="zincir"><div><h2 data-t="Z.b">Her bilginin bir isnadı var</h2><p class="not" data-t="Z.n">Sitedeki her pasaj, nereden geldiğini gösteren bir kaynak zinciriyle gelir.</p>
    <ol class="halka"><li><b>Pasaj</b><span>Cilt 5, sayfa 386</span></li><li><b>Eser</b><span>Taberî (ö. 310), Câmiu'l-beyân</span></li><li><b>Neşir</b><span>thk. Ahmed Şâkir, Müessesetü'r-Risâle, 1420</span></li><li><b>Veri</b><span>Quranpedia dökümü</span></li><li><b>İşleme</b><span>Ayet ayet ayrıştırma betiği, açık kaynak</span></li></ol></div>
    <div class="pasaj"><p class="ar" lang="ar">القول في تأويل قوله تعالى: ﴿اللَّهُ لا إِلَهَ إِلا هُوَ الْحَيُّ الْقَيُّومُ﴾</p><p class="kim">Taberî, Câmiu'l-beyân, 5/386</p></div></div></section>
  <p class="ana-son" data-t="son">vahiy++ kişisel bir araştırma çalışmasıdır. Her kaydın kaynağı zincirinde yazılıdır.</p>
</div>`;
  dilUygula();
  const hooks = [];
  zemin.kareler.length = 0; zemin.kareler.push(y => hooks.forEach(f => f(y)));
  anaTemizle = () => { zemin.kareler.length = 0; view.classList.remove('ana-main'); };
  let ilk = {};
  const ilkYukle = load('/data/k0/ilk.json').then(j => (ilk = j)).catch(() => ({}));

  /* ---- usturlap ---- */
  const U = { s: 1, a: 1, ps: 0, pa: 0 }, ADIM1 = 13.5, ADIM2 = 9, R1 = 250, R2 = 183, h1 = $('#halka1'), h2 = $('#halka2'), svg = $('#ust');
  (() => {
    let tk = ''; for (let i = 0; i < 72; i++) { const a = i * 5 * Math.PI / 180, r1 = i % 2 ? 136 : 132; tk += `<line x1="${(Math.cos(a) * r1).toFixed(1)}" y1="${(Math.sin(a) * r1).toFixed(1)}" x2="${(Math.cos(a) * 140).toFixed(1)}" y2="${(Math.sin(a) * 140).toFixed(1)}"/>`; }
    $('#tik').innerHTML = tk;
    let p = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, b = (i + 5) * Math.PI / 8; p += `M${(Math.cos(a) * 118).toFixed(1)} ${(Math.sin(a) * 118).toFixed(1)}L${(Math.cos(b) * 118).toFixed(1)} ${(Math.sin(b) * 118).toFixed(1)}`; }
    $('#mstar').innerHTML = `<path d="${p}"/>`;
  })();
  const halka = (g, pos, n, adim, R, lab, secili) => {
    let o = ''; const c = Math.round(pos);
    for (let i = Math.max(0, c - 10); i <= Math.min(n - 1, c + 10); i++) {
      const d = (i - pos) * adim; if (Math.abs(d) > 84) continue;
      const a = (d - 90) * Math.PI / 180, op = Math.max(0, Math.cos(d * Math.PI / 180 * .95)) ** 1.4;
      o += `<text data-i="${i}" class="${i === secili ? 'on' : ''}" transform="translate(${(Math.cos(a) * R).toFixed(1)} ${(Math.sin(a) * R).toFixed(1)}) rotate(${d.toFixed(1)})" opacity="${op.toFixed(2)}">${esc(lab(i))}</text>`;
    }
    g.innerHTML = o;
  };
  const ustCiz = () => { halka(h1, U.ps, 114, ADIM1, R1, i => D[i].tr, U.s - 1); halka(h2, U.pa, D[U.s - 1].ayet, ADIM2, R2, i => i + 1, U.a - 1); $('#mstar').setAttribute('transform', `rotate(${(U.ps * 22.5 + U.pa * 4).toFixed(1)})`); };
  const bilgi = () => {
    const s = D[U.s - 1];
    $('#usBilgi').textContent = `${s.n}. ${s.tr} · ${s.ayet} ayet · ${s.tur}`; $('#usAy').textContent = U.a; $('#usOn').textContent = (ilk[U.s] || [])[U.a - 1] || '';
    const e = $('#usAr'); if (e.textContent !== s.ar) { e.classList.add('deg'); setTimeout(() => { e.textContent = s.ar; e.classList.remove('deg'); }, 180); }
  };
  const anim = (k, hedef, sure = 420) => { const bas = U[k], t0 = performance.now(); sure = azHareket ? 0 : sure; (function f(t) { const p = sure ? Math.min(1, (t - t0) / sure) : 1, e = 1 - Math.pow(1 - p, 3); U[k] = bas + (hedef - bas) * e; ustCiz(); if (p < 1) requestAnimationFrame(f); })(t0); };
  const sureSec = i => { i = Math.max(0, Math.min(113, i)); if (U.s !== i + 1) { U.a = 1; anim('pa', 0); } U.s = i + 1; anim('ps', i); bilgi(); };
  const ayetSec = i => { i = Math.max(0, Math.min(D[U.s - 1].ayet - 1, i)); U.a = i + 1; anim('pa', i); bilgi(); };
  $('#ayGeri').onclick = () => ayetSec(U.a - 2); $('#ayIleri').onclick = () => ayetSec(U.a);
  $('#gir').onclick = () => { location.hash = `#/${U.s}/${U.a}`; };
  const nokta = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  let drag = null;
  svg.addEventListener('pointerdown', e => { const p = nokta(e), r = Math.hypot(p.x, p.y); if (r < 150) return; const hk = r > 216 ? 's' : 'a'; drag = { hk, a0: Math.atan2(p.y, p.x), p0: hk === 's' ? U.ps : U.pa, moved: false, t: e.target }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => {
    if (!drag) return; const p = nokta(e); let d = (Math.atan2(p.y, p.x) - drag.a0) * 180 / Math.PI; if (d > 180) d -= 360; if (d < -180) d += 360; if (Math.abs(d) > 1.5) drag.moved = true;
    if (drag.hk === 's') { U.ps = Math.max(0, Math.min(113, drag.p0 - d / ADIM1)); const i = Math.round(U.ps); if (i + 1 !== U.s) { U.s = i + 1; U.a = 1; U.pa = 0; bilgi(); } }
    else { U.pa = Math.max(0, Math.min(D[U.s - 1].ayet - 1, drag.p0 - d / ADIM2)); const i = Math.round(U.pa); if (i + 1 !== U.a) { U.a = i + 1; bilgi(); } }
    ustCiz();
  });
  svg.addEventListener('pointerup', () => { if (!drag) return; const d = drag; drag = null; if (!d.moved && d.t.dataset?.i) { const i = +d.t.dataset.i; d.t.parentNode === h1 ? sureSec(i) : ayetSec(i); return; } d.hk === 's' ? sureSec(Math.round(U.ps)) : ayetSec(Math.round(U.pa)); });
  svg.addEventListener('wheel', e => { const p = nokta(e), r = Math.hypot(p.x, p.y); if (r < 150) return; e.preventDefault(); const y = Math.sign(e.deltaY); r > 216 ? sureSec(U.s - 1 + y) : ayetSec(U.a - 1 + y); }, { passive: false });
  svg.addEventListener('keydown', e => { const k = { ArrowLeft: () => sureSec(U.s - 2), ArrowRight: () => sureSec(U.s), ArrowUp: () => ayetSec(U.a), ArrowDown: () => ayetSec(U.a - 2), Enter: () => $('#gir').click() }[e.key]; if (k) { e.preventDefault(); k(); } });
  ustCiz(); bilgi();
  ilkYukle.then(bilgi);
  setTimeout(() => { const son = store.get('son', ''); const hs = son ? +son.split(':')[0] : [2, 18, 36, 55, 67, 96][Math.floor(Math.random() * 6)]; U.s = hs; U.a = 1; anim('ps', hs - 1, 1600); bilgi(); }, 400);

  /* ---- Kur'an atlası ---- */
  const dos = $('#dosem'), mx = Math.max(...D.map(s => s.ayet));
  D.forEach(s => {
    const a = document.createElement('a'), y = .18 + .82 * Math.sqrt(s.ayet / mx);
    a.style.setProperty('--y', y.toFixed(2)); a.className = (s.tur === 'Medenî' ? 'm ' : '') + (y > .72 ? 'koyu' : ''); a.dataset.n = s.n; a.href = `#/sure/${s.n}`;
    a.innerHTML = `<span class="sn"><b class="sira">${s.n}</b><span>${s.ayet}</span></span><span class="ad">${esc(s.tr)}</span>`;
    a.title = `${s.n}. ${s.tr} — ${s.ayet} ayet, ${s.tur}`;
    a.onmouseenter = a.onfocus = () => { dos.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); a.classList.add('sel'); $('#secili').innerHTML = `${s.n}. ${esc(s.tr)}, ${s.ayet} ayet, ${s.tur} <span class="ar" lang="ar">${esc(s.ar)}</span>`; };
    dos.appendChild(a);
  });
  dos.children[1].onmouseenter();
  const SL = SR.siralamalar;
  $('#siralar').innerHTML = SL.map((x, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${esc(x.ad)}</button>`).join('');
  const kaynakYaz = x => {
    const ch = [{ r: 'Kaynak', t: x.kaynak }, x.yer ? { r: 'Yer', t: x.yer, u: x.ref && x.ref.startsWith('oi:') ? oiUrl(x.ref.slice(3)) : (x.ref || null) } : null, x.notlar ? { r: 'Not', t: x.notlar } : null, { r: 'İşleme', t: 'Sıralama çıkarma betiği', b: 'siralama' }];
    $('#siraKaynak').innerHTML = `<span>${esc(x.kaynak)}${x.eksik.length ? ` · Bu kaynakta ${x.eksik.length} sure yer almıyor; soluk gösterildi.` : ''}</span>${chain(ch)}`;
  };
  kaynakYaz(SL[0]);
  $('#siralar').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    $('#siralar').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const x = SL[b.dataset.i], yer = new Map(x.dizi.map((n, i) => [n, i]));
    kaynakYaz(x);
    const L = [...dos.children], ilkK = new Map(L.map(c => { const r = c.getBoundingClientRect(); return [c, [r.left, r.top]]; }));
    L.sort((p, q) => (yer.get(+p.dataset.n) ?? 999 + +p.dataset.n) - (yer.get(+q.dataset.n) ?? 999 + +q.dataset.n)).forEach((c, i) => {
      dos.appendChild(c); const v = yer.get(+c.dataset.n); c.querySelector('.sira').textContent = v === undefined ? '–' : v + 1; c.classList.toggle('yok', v === undefined);
    });
    if (!azHareket) L.forEach(c => { const r = c.getBoundingClientRect(), o = ilkK.get(c); c.style.transition = 'none'; c.style.transform = `translate(${o[0] - r.left}px,${o[1] - r.top}px)`; requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = ''; c.style.transform = ''; })); });
  };

  /* ---- A: sayaçlar ve şeritler ---- */
  const SY = [[sy.eser, 'eser ayetlere bağlı'], [sy.alinti, 'ayet alıntısı'], [sy.tefsir, 'tefsir'], [sy.rivayet, 'selef rivayeti'], [sy.ravi, 'râvi biyografisi'], [sy.yazma, 'el yazması']];
  $('#sayaclar').innerHTML = SY.map(s => `<div class="sayac"><b data-v="${s[0]}">${azHareket ? fmt(s[0]) : 0}</b><span>${s[1]}</span></div>`).join('');
  let sayildi = azHareket;
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !sayildi) { sayildi = true; const st = performance.now(); (function f(tm) { const p = Math.min(1, (tm - st) / 1800), e = 1 - Math.pow(1 - p, 3); document.querySelectorAll('.sayac b').forEach(b => b.textContent = fmt(Math.round(b.dataset.v * e))); if (p < 1) requestAnimationFrame(f); })(st); } }, { threshold: .4 });
  io.observe($('#sayaclar'));
  $('#seritler').innerHTML = [0, 1, 2].map(i => { const s = V.adlar.slice(i * 80, i * 80 + 80).map(x => `<span>${esc(x)}</span>`).join(''); return `<div class="serit"><div>${s}${s}</div></div>`; }).join('');
  const SRT = [...document.querySelectorAll('.serit>div')], sx = [0, -1500, -700]; let hiz = 0, sonY = scrollY;
  hooks.push(y => {
    if (azHareket) return;
    hiz = hiz * .9 + (y - sonY) * .1; sonY = y;
    SRT.forEach((s, i) => { const w = s.scrollWidth / 2; sx[i] += (i % 2 ? 1 : -1) * (.35 + Math.min(1.2, Math.abs(hiz) * .15)); if (sx[i] < -w) sx[i] += w; if (sx[i] > 0) sx[i] -= w; s.style.transform = `translateX(${sx[i]}px)`; });
  });

  /* ---- B: yıldız ağı ---- */
  const ag = $('#ag'), dar = innerWidth < 600; if (dar) ag.setAttribute('viewBox', '-240 -400 480 800');
  const sel = $('#agSure'); sel.innerHTML = D.map(s => `<option value="${s.n}">${s.n}. ${esc(s.tr)}</option>`).join(''); sel.value = 20;
  let ADLAR = null, GN = [], LN = [], AGT = { n: 0, q: 0 }, agSon = -1;
  async function agYukle() {
    const s = +sel.value, mxa = D[s - 1].ayet, a = Math.max(1, Math.min(mxa, +$('#agAyet').value || 1)); $('#agAyet').max = mxa; $('#agAyet').value = a;
    ADLAR ||= await load('/data/x/adlar.json').catch(() => ({}));
    const b = await loadGz(`/data/x/${s}/${a}.json.gz`).catch(() => ({ k3: {} }));
    const L = [], say = {}; let q = 0;
    for (const [g, arr] of Object.entries(b.k3 || {})) for (const e of arr) { L.push([String(e[0]), g, e[1]]); say[g] = (say[g] || 0) + 1; q += e[1]; }
    L.sort((x, y) => y[2] - x[2]); AGT = { n: L.length, q };
    $('#agRef').textContent = `${D[s - 1].tr} ${s}:${a}`;
    const gs = Object.keys(say).sort((x, y) => say[y] - say[x]), w = gs.map(g => Math.sqrt(say[g])), W = w.reduce((x, y) => x + y, 0) || 1;
    let bas = -Math.PI / 2; const dil_ = {}; gs.forEach((g, i) => { const gen = 2 * Math.PI * w[i] / W; dil_[g] = [bas, gen, 0]; bas += gen; });
    const LIM = dar ? 260 : 360, top_ = L.length || 1, kota = {}; gs.forEach(g => kota[g] = Math.max(3, Math.round(LIM * say[g] / top_)));
    const goster = [], al = {}; for (const e of L) if ((al[e[1]] || 0) < kota[e[1]]) { goster.push(e); al[e[1]] = (al[e[1]] || 0) + 1; }
    const RM = dar ? 225 : 300;
    const NOD = goster.map(([id, g, c]) => { const d = dil_[g], k = d[2]++, m = al[g], R = 82 + (RM - 82) * Math.sqrt((k + .5) / m), an = d[0] + d[1] * (.06 + .88 * ((k * .61803 + .3) % 1)); return { id, g, c, x: Math.cos(an) * R * (dar ? .98 : 1.55), y: Math.sin(an) * R * (dar ? 1.6 : .98), col: (GRUP[g] || ['', '#888'])[1] }; });
    let H1 = '', H2 = '';
    NOD.forEach((n, i) => {
      const r = 3 + Math.min(8, Math.sqrt(n.c) * 1.1), ad = ADLAR[n.id] || '', lab = i < (dar ? 5 : 9);
      H1 += `<line x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="${n.col}" stroke-width=".7" opacity="0"/>`;
      H2 += `<g opacity="0" data-x="${n.x.toFixed(1)}" data-y="${n.y.toFixed(1)}"><path d="M0 ${-r} L${r * .32} ${-r * .32} L${r} 0 L${r * .32} ${r * .32} L0 ${r} L${-r * .32} ${r * .32} L${-r} 0 L${-r * .32} ${-r * .32}Z" fill="${n.col}"/>${lab ? `<text y="${r + 14}" text-anchor="middle" font-family="Amiri" font-size="13" fill="var(--ink)" paint-order="stroke" stroke="var(--paper)" stroke-width="3">${esc(ad.slice(0, 22))}</text>` : ''}<title>${esc(ad)} — ${n.c} alıntı</title></g>`;
    });
    ag.innerHTML = `<g id="agcizgi">${H1}</g><g id="agnokta">${H2}</g><circle r="66" fill="var(--sheet)" stroke="var(--zer)" stroke-width="2"/><circle r="58" fill="none" stroke="var(--zer)" stroke-width=".8"/><text text-anchor="middle" y="-6" font-family="Scheherazade New" font-size="30" fill="var(--firuze)">${esc(D[s - 1].ar)}</text><text text-anchor="middle" y="24" font-family="Alegreya Sans" font-size="17" fill="var(--muted)">${s}:${a}</text>`;
    LN = [...$('#agcizgi').children]; GN = [...$('#agnokta').children];
    $('#agalt').innerHTML = gs.map(g => `<span><i style="background:${(GRUP[g] || ['', '#888'])[1]}"></i>${(GRUP[g] || [g])[0]} <b>${say[g]}</b></span>`).join('');
    agSon = -1;
  }
  sel.onchange = () => { $('#agAyet').value = 1; agYukle(); }; $('#agAyet').onchange = agYukle;
  agYukle();
  const ilerle = el => { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(1, -r.top / (r.height - innerHeight))); };
  hooks.push(() => {
    const pr = azHareket ? 1 : Math.min(1, ilerle($('#agb')) * 1.2), k = Math.round(pr * GN.length);
    if (k !== agSon) { GN.forEach((g, i) => { const on = i < k; g.setAttribute('opacity', on ? 1 : 0); g.setAttribute('transform', `translate(${on ? g.dataset.x : g.dataset.x * .3} ${on ? g.dataset.y : g.dataset.y * .3}) scale(${on ? 1 : .2})`); LN[i].setAttribute('opacity', on ? .16 : 0); }); agSon = k; }
    $('#agn').textContent = fmt(Math.round(pr * AGT.n)); $('#agq').textContent = fmt(Math.round(pr * AGT.q));
  });

  /* ---- C: zaman şeridi ---- */
  const AS = V.asir, amx = Math.max(...AS.map(a => a[1]));
  $('#zaman').innerHTML = AS.map(a => `<div><em>${fmt(a[1])}</em><i style="height:${(a[1] / amx * 100).toFixed(1)}%"></i></div>`).join('');
  $('#zeks').innerHTML = AS.map(a => `<span>${a[0]}.</span>`).join('');
  const ZB = [...$('#zaman').children]; let zSon = -1;
  hooks.push(() => {
    const kc = azHareket ? ZB.length : Math.ceil(ilerle($('#zb')) * 1.1 * ZB.length); if (kc === zSon) return; zSon = kc;
    ZB.forEach((z, i) => { const on = i < kc; z.firstChild.style.opacity = on ? 1 : 0; z.lastChild.style.transform = `scaleY(${on ? 1 : 0})`; });
    const a = AS[Math.min(kc, AS.length) - 1]; $('#zisim').innerHTML = kc ? `<b>${a[0]}. asır:</b> ${esc(ORNEK_ASIR[a[0]] || '')}` : '';
  });

  /* ---- D: surenin konuları ---- */
  const ds = $('#dSure'); ds.innerHTML = D.map(s => `<option value="${s.n}">${s.n}. ${esc(s.tr)} — ${esc(s.ar)}</option>`).join(''); ds.value = 18;
  async function dCiz() {
    const n = +ds.value, su = await load(`/data/sure/${n}.json`), N = su.ayet;
    const ust = new Map(); (su.konular || []).forEach(k => { const u = k.ust || k.ad; if (!u) return; if (!ust.has(u)) ust.set(u, new Set()); k.ayetler.forEach(r => ust.get(u).add(+r.split(':')[1])); });
    const seritler = [...ust.entries()].map(([ad, set]) => [ad, [...set].sort((a, b) => a - b)]).sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    const W = 1000, bw = Math.max(2.2, W / N * .8);
    const serit = ([ad, ays]) => `<div class="kserit"><div class="kad"><small>${ays.length} ayet</small><span lang="ar">${esc(ad)}</span></div>
      <svg viewBox="0 0 ${W} 22" preserveAspectRatio="none" role="img" aria-label="${esc(ad)}: ${ays.length} ayet"><rect class="zemin-c" x="0" y="10" width="${W}" height="2"/>
      ${ays.map(a => `<a href="#/${n}/${a}"><title>${n}:${a}</title><rect x="${((a - 1) / N * W).toFixed(1)}" y="2" width="${bw.toFixed(1)}" height="18" rx="1"/></a>`).join('')}</svg></div>`;
    const adim = N > 40 ? Math.ceil(N / 8 / 10) * 10 : (N > 10 ? 5 : 1);
    const eks = []; for (let a = 1; a <= N; a += adim) eks.push(a); if (eks[eks.length - 1] !== N) eks.push(N);
    $('#dIc').innerHTML = `<div class="dbas"><span class="ar" lang="ar">${esc(su.ar)}</span><b>${esc(su.tr)}</b><span>${N} ayet · ${esc(su.tur)} · ${seritler.length ? `en çok işlenen ${seritler.length} konu` : 'konu kaydı yok'}</span></div>
      ${(su.temalar_tr || []).length ? `<ul class="temalar">${su.temalar_tr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${seritler.length ? `<div class="konuk"><div class="perde"><div class="serit-k">${seritler.map(serit).join('')}</div>
        <div class="keks">${eks.map(a => `<span>${a}</span>`).join('')}</div></div></div>` : ''}
      <p class="dkaynak">Konu şeritleri: Quranpedia konu dizini (üst başlıklar). Temalar: ${esc(su.temalar_kaynak || '')}</p>`;
    const k = $('#dIc .konuk'); if (k) { if (azHareket) k.classList.add('acik'); else new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { k.classList.add('acik'); o.disconnect(); } }, { threshold: .25 }).observe(k); }
  }
  ds.onchange = dCiz; dCiz();

  /* ---- kaynak dünyası ---- */
  const KD = [['Tefsir', '514 kitap', '#1F7A80', 'y'], ['Hadis', '1.561 kitap', '#1E3A5F', 'h'], ['Fıkıh ve usûl', '921 kitap', '#5B4A2A', 'k'], ['Kelâm', '446 kitap', '#2F5D50', 'g'], ['Tasavvuf', '307 kitap', '#6B3A3A', 'u'],
    ['Lügatler', '12 lügat', '#3E4E6B', 'k'], ['Tarih ve ricâl', '777 kitap', '#4A5A3A', 'h'], ['Kıraat', '210 kitap', '#1F6070', 'y'], ['Paralel metinler', '713 metin', '#4B3F5E', 'g'], ['Makaleler', fmt(sy.makale) + ' makale', '#2E4A55', 'u']];
  const motif = (tp, c, i) => {
    const s = 'stroke="rgba(244,242,234,.32)" fill="none" stroke-width="1.2"', id = 'kp' + i;
    const P = { h: `<rect x="10" y="10" width="20" height="20" ${s}/><rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" ${s}/>`, k: `<path d="M4 4h12v12H8v8h16V8h8v24H4z" ${s}/>`,
      g: `<path d="M0 26L15 0h30l15 26-15 26H15z M15 0l15 26L15 52 M45 0L30 26l15 26 M0 26h60" ${s}/>`, y: `<path d="M25 5l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" ${s}/>` };
    if (tp === 'u') return `<rect width="100%" height="100%" fill="${c}"/><g transform="translate(170 40)" ${s}>${Array.from({ length: 12 }, (_, j) => `<ellipse rx="70" ry="20" transform="rotate(${j * 15})"/>`).join('')}</g>`;
    const w = { h: 40, k: 36, g: 60, y: 50 }[tp], h = tp === 'g' ? 52 : w;
    return `<defs><pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${P[tp]}</pattern></defs><rect width="100%" height="100%" fill="${c}"/><rect width="100%" height="100%" fill="url(#${id})"/>`;
  };
  $('#kaynaklar').innerHTML = KD.map((k, i) => `<a class="kay" href="#/kutuphane"><svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 220 150" aria-hidden="true">${motif(k[3], k[2], i)}</svg><b>${k[0]}</b><span>${k[1]}</span></a>`).join('');
}

/* sayfa değişince açılışın kaydırma işlerini durdur, okuma sayfalarında zemini sakinleştir */
addEventListener('hashchange', () => { const h = location.hash.replace(/^#/, '') || '/'; if (h !== '/') { anaTemizle?.(); anaTemizle = null; document.body.classList.add('sakin'); } }, true);
dilUygula();
if ((location.hash.replace(/^#/, '') || '/') !== '/') document.body.classList.add('sakin');
