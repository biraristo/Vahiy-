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
    'alt': 'Read a verse with a library of {kitap} works: {tefsir} tafsirs, {rivayet} early reports and {lugat} lexicons. Every item is linked to its source.',
    'gir': 'Go to verse', 'ipucu': 'Turn the outer ring to choose a surah and the inner ring to choose a verse.', 'ayet': 'Verse',
    'atlas': 'Order of revelation', 'atlas.not': 'From the Companions’ codices to today: how scholars ordered the surahs. Choose an ordering; the surahs move and the colours show that source’s own Meccan–Medinan division.',
    'A.b': 'Khizānat al-kutub', 'A.n': 'Our library: works, reports, manuscripts and lexicons. Every number was counted separately.',
    'B.b': 'The library around a verse', 'C.b': 'Fifteen centuries of conversation', 'C.n': 'As you scroll, each Hijri century fills with the number of books in the system by authors who died in it.',
    'D.b': 'What a surah talks about', 'D.n': 'Choose a surah: each topic is a lane and every mark is a verse. Tap a mark to open the verse.',
    'I.b': 'Map of disagreement', 'I.n': 'Where the exegetes disagreed most. Darker means more disagreement per verse. Choose a surah to see it verse by verse.', 'N.b': 'Occasions of revelation', 'N.n': 'Surahs in order of revelation (Egyptian standard); each column is the number of reports on why its verses were revealed. The line marks the Hijra.', 'E.b': 'The oldest manuscripts', 'E.n': 'The oldest surviving Qur’an codices with their estimated dating (CE). Tap a bar to open the manuscript.', 'K.b': 'World of sources', 'K.n': 'Books linked to the verses, by discipline.', 'Z.b': 'Every piece of information has an isnad', 'Z.n': 'Every record on the site comes with its source chain: work and author, edition and editor, volume and page, data source and processing method.',
    'son': 'vahiy++ is a personal research project. Every record carries its source chain.' },
  ar: { 'nav.atlas': 'أطلس القرآن', 'nav.kutuphane': 'المكتبة', 'h1': 'من النصّ إلى المعنى، ومن المعنى إلى التاريخ.',
    'alt': 'اقرأ الآية مع مكتبة من {kitap} كتابًا: {tefsir} تفسيرًا و{rivayet} رواية عن السلف و{lugat} معجمًا؛ كلّ معلومة موصولة بمصدرها.',
    'gir': 'اذهب إلى الآية', 'ipucu': 'أدِر الحلقة الخارجية لاختيار السورة، والداخلية لاختيار الآية.', 'ayet': 'الآية',
    'atlas': 'مخطط النزول', 'atlas.not': 'من مصاحف الصحابة إلى اليوم: كيف رتّب العلماء السور. اختر ترتيبًا فتنتقل السور، وتدلّ الألوان على تقسيم ذلك المصدر للمكي والمدني.',
    'A.b': 'خزانة الكتب', 'A.n': 'مكتبتنا: الكتب والروايات والمخطوطات والمعاجم، وكل رقم معدود على حدة.', 'B.b': 'المكتبة حول آية', 'C.b': 'حوار خمسة عشر قرنًا',
    'C.n': 'كلما نزلت امتلأ كل قرن هجري بعدد كتب المؤلفين المتوفين فيه.', 'D.b': 'عمّ تتحدث السورة', 'D.n': 'اختر سورة: لكل موضوع مسار، وكل علامة آية؛ اضغط العلامة لفتح الآية.',
    'I.b': 'خريطة الخلاف', 'I.n': 'مواضع أكثر اختلاف المفسرين؛ اللون الأغمق خلاف أكثر لكل آية. اختر سورة لترى آياتها.', 'N.b': 'أسباب النزول', 'N.n': 'السور بحسب ترتيب النزول (المصحف المصري)، وكل عمود عدد روايات أسباب النزول في آياتها؛ والخط يدل على الهجرة.', 'E.b': 'أقدم المخطوطات', 'E.n': 'أقدم نسخ القرآن الباقية مع تقدير زمن كتابتها (ميلادي). اضغط على الشريط لفتح المخطوطة.', 'K.b': 'عالم المصادر', 'K.n': 'الكتب المرتبطة بالآيات بحسب العلوم.', 'Z.b': 'لكل معلومة إسناد', 'Z.n': 'كل سجل في الموقع مقرون بسلسلة مصدره: الكتاب ومؤلفه، والطبعة والتحقيق، والجزء والصفحة، ومصدر البيانات وطريقة المعالجة.',
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
  window.__vitrinSay = { tefsir: fmt(sy.tefsir), rivayet: fmt(Math.round(sy.rivayet / 1000) * 1000).replace(/\.000$/, ' bin'), lugat: sy.lugat, kitap: fmt(sy.kitap) };
  if (dil !== 'tr') window.__vitrinSay.rivayet = fmt(sy.rivayet);
  view.innerHTML = `<div class="ana">
  <section class="hero"><div>
    <h1 data-t="h1">Metinden manaya, manadan tarihe.</h1>
    <p class="alt" data-t="alt" data-tr="Bir ayeti; {tefsir} tefsir, {rivayet} selef rivayeti ve {lugat} lügat barındıran {kitap} eserlik bir kütüphaneyle birlikte okuyun. Her bilgi kaynağına bağlı."></p>
    <div class="usturlap">
      <div class="cark">
      <svg id="ust" viewBox="-292 -318 584 614" role="group" aria-label="Sure ve ayet seçici; sağ ve sol ok tuşları sureyi, yukarı ve aşağı ok tuşları ayeti değiştirir" tabindex="0">
        <defs><radialGradient id="ustg"><stop offset="0" stop-color="var(--sheet)"/><stop offset="1" stop-color="var(--sheet)" stop-opacity="0"/></radialGradient></defs>
        <circle r="262" fill="url(#ustg)"/>
        <circle r="268" class="hl"/><circle r="232" class="hl ince"/><circle r="200" class="hl"/><circle r="166" class="hl ince"/><circle r="140" class="hl"/>
        <g id="mstar"></g><g id="tik"></g><g id="halka1"></g><g id="halka2"></g>
        <path class="gosterge" d="M0 -293 L7 -284 L0 -275 L-7 -284 Z"/><path class="gosterge" d="M0 -222 L6 -215 L0 -208 L-6 -215 Z"/>
        <g id="cevir" aria-hidden="true"><g class="cv-don"><path class="cv-yay" d="M171.6 -217.4 A277 277 0 0 1 240 -138.5"/><path class="cv-uc" d="M229 -147 L240 -138.5 L244 -152"/>
          <path class="cv-yay" d="M-171.6 -217.4 A277 277 0 0 0 -240 -138.5"/><path class="cv-uc" d="M-229 -147 L-240 -138.5 L-244 -152"/></g>
          <text class="cv-yazi" x="0" y="-302" text-anchor="middle">çevir</text></g>
      </svg>
      <div class="ust-orta">
        <div class="ust-sure" id="usAr" lang="ar"></div>
        <div class="ust-bilgi" id="usBilgi"></div>
        <div class="ust-ayet"><button class="ok" id="ayGeri" aria-label="Önceki ayet">‹</button><span><span data-t="ayet">Ayet</span> <b id="usAy">1</b></span><button class="ok" id="ayIleri" aria-label="Sonraki ayet">›</button></div>
      </div>
      </div>
      <div class="ust-alt">
        <div class="ust-onizleme" id="usOn" lang="ar"></div>
        <button class="gir" id="gir"><span data-t="gir">Ayete git</span></button>
        <p class="ust-ipucu" data-t="ipucu">Dış halkayı çevirerek sureyi, iç halkayı çevirerek ayeti seçin.</p>
      </div>
    </div>
  </div></section>

<div class="ayrac" aria-hidden="true"><svg viewBox="0 0 240 24"><path d="M0 12H96M144 12H240" /><path d="M120 2l3.5 6.5L130 12l-6.5 3.5L120 22l-3.5-6.5L110 12l6.5-3.5z"/><rect x="113" y="5" width="14" height="14" transform="rotate(45 120 12)"/><circle cx="104" cy="12" r="1.6"/><circle cx="136" cy="12" r="1.6"/></svg></div>
  <section class="bolum hazine"><p class="hz-ar" lang="ar">خزانة الكتب</p><h2 data-t="A.b">Hizânetü'l-kütüb</h2><p class="not" data-t="A.n">Kütüphanemiz: eserler, rivayetler, el yazmaları ve lügatler. Her rakam ayrı ayrı sayıldı.</p>
    <div class="sayaclar" id="sayaclar"></div><div class="kaynaklar hz-raf" id="kaynaklar"></div><div id="seritler" aria-hidden="true"></div></section>

<div class="ayrac" aria-hidden="true"><svg viewBox="0 0 240 24"><path d="M0 12H96M144 12H240" /><path d="M120 2l3.5 6.5L130 12l-6.5 3.5L120 22l-3.5-6.5L110 12l6.5-3.5z"/><rect x="113" y="5" width="14" height="14" transform="rotate(45 120 12)"/><circle cx="104" cy="12" r="1.6"/><circle cx="136" cy="12" r="1.6"/></svg></div>
  <section class="bolum isnad"><p class="isnad-baslik" data-t="Z.n">Her bilgi kaynağına bir isnadla bağlıdır: eser, neşir, cilt ve sayfa, veri kümesi ve işleme betiği, her pasajın yanında açıkça gösterilir.</p><div class="zincir"><div>
    <ol class="halka"><li><b>Pasaj</b><span>Cilt 5, sayfa 386</span></li><li><b>Eser</b><span>Taberî (ö. 310), Câmiu'l-beyân</span></li><li><b>Neşir</b><span>thk. Ahmed Şâkir, Müessesetü'r-Risâle, 1420</span></li><li><b>Veri</b><span>Quranpedia dökümü</span></li><li><b>İşleme</b><span>Ayet ayet ayrıştırma betiği, açık kaynak</span></li></ol></div>
    <div class="pasaj"><p class="ar" lang="ar">القول في تأويل قوله تعالى: ﴿اللَّهُ لا إِلَهَ إِلا هُوَ الْحَيُّ الْقَيُّومُ﴾</p><p class="kim">Taberî, Câmiu'l-beyân, 5/386</p></div></div></section>


<div class="ayrac" aria-hidden="true"><svg viewBox="0 0 240 24"><path d="M0 12H96M144 12H240" /><path d="M120 2l3.5 6.5L130 12l-6.5 3.5L120 22l-3.5-6.5L110 12l6.5-3.5z"/><rect x="113" y="5" width="14" height="14" transform="rotate(45 120 12)"/><circle cx="104" cy="12" r="1.6"/><circle cx="136" cy="12" r="1.6"/></svg></div>
  <section class="bolum" aria-labelledby="atlas-b"><h2 id="atlas-b" data-t="atlas">Nüzul şeması</h2>
    <p class="not" data-t="atlas.not">Sahabe mushaflarından bugüne, âlimlerin sureleri hangi sırayla dizdiği. Bir tertip seçin; sureler yerini değiştirir, renkler o tertibin kendi Mekkî–Medenî ayrımını gösterir.</p>
    <div class="ana-atlas"><div class="kap-s"><div class="siralar" id="siralar" role="group" aria-label="Sıralama"></div></div><div class="dosem" id="dosem"></div>
      <div class="ipucu"><span id="lejant"></span><span class="secili" id="secili"></span></div>
      <div class="sira-kaynak" id="siraKaynak"></div></div></section>

<div class="ayrac" aria-hidden="true"><svg viewBox="0 0 240 24"><path d="M0 12H96M144 12H240" /><path d="M120 2l3.5 6.5L130 12l-6.5 3.5L120 22l-3.5-6.5L110 12l6.5-3.5z"/><rect x="113" y="5" width="14" height="14" transform="rotate(45 120 12)"/><circle cx="104" cy="12" r="1.6"/><circle cx="136" cy="12" r="1.6"/></svg></div>
  <section class="bolum" id="eyb"><h2 data-t="E.b">En eski yazmalar</h2>
    <p class="not" data-t="E.n">Bugüne ulaşan en eski Kur'an nüshaları, tahminî yazılış tarihleriyle. Zaman çizelgesini sağa sola kaydırın; bir nüshaya dokununca sayfası açılır.</p>
    <div id="eski"></div></section>


  <p class="ana-son" data-t="son">vahiy++ kişisel bir araştırma çalışmasıdır. Her kaydın kaynağı zincirinde yazılıdır.</p>
</div>`;
  dilUygula();
  const hooks = [];
  zemin.kareler.length = 0; zemin.kareler.push(y => hooks.forEach(f => f(y)));
  anaTemizle = () => { zemin.kareler.length = 0; view.classList.remove('ana-main'); };
  let ilk = {};
  const ilkYukle = load('/data/k0/ilk.json').then(j => (ilk = j)).catch(() => ({}));

  /* ---- usturlap ---- */
  const U = { s: 1, a: 1, ps: 0, pa: 0 }, ADIM1 = 16.5, ADIM2 = 9, R1 = 250, R2 = 183, h1 = $('#halka1'), h2 = $('#halka2'), svg = $('#ust');
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
  const cevirGizle = () => $('#cevir')?.classList.add('gitti');
  ['pointerdown', 'wheel', 'keydown'].forEach(ev => svg.addEventListener(ev, cevirGizle, { once: true }));
  ustCiz(); bilgi();
  ilkYukle.then(bilgi);
  setTimeout(() => { const son = store.get('son', ''); const hs = son ? +son.split(':')[0] : [2, 18, 36, 55, 67, 96][Math.floor(Math.random() * 6)]; U.s = hs; U.a = 1; anim('ps', hs - 1, 1600); bilgi(); }, 400);

  /* ---- Nüzul şeması: tertipler, eskiden yeniye ---- */
  const dos = $('#dosem'), mx = Math.max(...D.map(s => s.ayet)), SL = SR.siralamalar;
  let aktif = null;
  D.forEach(s => {
    const a = document.createElement('a'), y = .18 + .82 * Math.sqrt(s.ayet / mx);
    a.style.setProperty('--y', y.toFixed(2)); a.dataset.y = y; a.dataset.n = s.n; a.href = `#/sure/${s.n}`;
    a.innerHTML = `<span class="sn"><b class="sira">${s.n}</b><span>${s.ayet}</span></span><span class="ad">${esc(s.tr)}</span>`;
    a.onmouseenter = a.onfocus = () => {
      dos.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); a.classList.add('sel');
      const v = aktif && aktif.dizi.indexOf(s.n), donem = !aktif || aktif.medine_bas == null ? '' : (v < 0 ? ', bu tertipte yok' : (v >= aktif.medine_bas ? ', bu tertipte Medenî' : ', bu tertipte Mekkî'));
      $('#secili').innerHTML = `${s.n}. ${esc(s.tr)}, ${s.ayet} ayet${v >= 0 && aktif ? `, ${v + 1}. sırada` : ''}${donem} <span class="ar" lang="ar">${esc(s.ar)}</span>`;
    };
    dos.appendChild(a);
  });
  $('#siralar').innerHTML = SL.map((x, i) => `<button type="button" data-i="${i}" aria-pressed="false">${esc(x.ad)} <small>${esc(x.yil)}</small></button>`).join('');
  const kaynakYaz = x => {
    const ch = [{ r: 'Kaynak', t: x.kaynak }, x.yer ? { r: 'Yer', t: x.yer, u: x.ref && x.ref.startsWith('oi:') ? oiUrl(x.ref.slice(3)) : (x.ref || null) } : null, x.notlar ? { r: 'Not', t: x.notlar } : null, { r: 'İşleme', t: 'Sıralama çıkarma betiği', b: 'siralama' }];
    $('#siraKaynak').innerHTML = `<span>${esc(x.kaynak)}. ${esc(x.donem)}${x.eksik.length ? ` Bu kaynakta ${x.eksik.length} sure yer almıyor; sona soluk dizildi.` : ''}</span>${chain(ch)}`;
    $('#lejant').innerHTML = x.medine_bas == null ? '<span><i class="n"></i>Dönem ayrımı yok</span>' : '<span><i></i>Mekkî</span><span><i class="m"></i>Medenî</span>';
  };
  const tertipSec = (k, ilkSefer) => {
    const x = SL[k]; aktif = x;
    $('#siralar').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
    const yer = new Map(x.dizi.map((n, i) => [n, i]));
    kaynakYaz(x);
    const L = [...dos.children], ilkK = new Map(L.map(c => { const r = c.getBoundingClientRect(); return [c, [r.left, r.top]]; }));
    L.sort((p, q) => (yer.get(+p.dataset.n) ?? 999 + +p.dataset.n) - (yer.get(+q.dataset.n) ?? 999 + +q.dataset.n)).forEach(c => {
      dos.appendChild(c); const v = yer.get(+c.dataset.n), y = +c.dataset.y;
      c.querySelector('.sira').textContent = v === undefined ? '–' : v + 1;
      c.className = (v === undefined ? 'yok ' : '') + (x.medine_bas == null ? 'n ' : (v !== undefined && v >= x.medine_bas ? 'm ' : '')) + (y > .72 ? 'koyu' : '');
      c.title = `${c.querySelector('.ad').textContent}${v === undefined ? ' — bu tertipte yok' : ` — ${v + 1}. sırada`}`;
    });
    if (!azHareket && !ilkSefer) L.forEach(c => { const r = c.getBoundingClientRect(), o = ilkK.get(c); c.style.transition = 'none'; c.style.transform = `translate(${o[0] - r.left}px,${o[1] - r.top}px)`; requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = ''; c.style.transform = ''; })); });
    const sb = $('#siralar button[aria-pressed="true"]'); if (sb && !ilkSefer) sb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: azHareket ? 'auto' : 'smooth' });
  };
  $('#siralar').onclick = e => { const b = e.target.closest('button'); if (b) tertipSec(+b.dataset.i); };
  tertipSec(0, true);
  dos.querySelector('a[data-n="96"]').onmouseenter();
  requestAnimationFrame(() => { const sc = $('#siralar'); sc.scrollLeft = 0; kaydirIpucu(sc); });

  /* ---- A: sayaçlar ve şeritler ---- */
  const SY = [...(sy.kitap ? [[sy.kitap, 'eser, tam metniyle kütüphanede', 'buyuk']] : []), [sy.rivayet, 'selef rivayeti, isnadıyla'], [sy.makale, 'akademik makale'], [sy.yazma, 'el yazması Kur\'an nüshası'], [sy.ravi, 'râvinin hayatı, ricâl kitaplarından'], [sy.lugat, 'klasik Arapça lügat']];
  $('#sayaclar').innerHTML = SY.map(s => `<div class="sayac${s[2] ? ' ' + s[2] : ''}"><b data-v="${s[0]}">${azHareket ? fmt(s[0]) : 0}</b><span>${s[1]}</span></div>`).join('');
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


  /* ---- En eski yazmalar: yatay, kaydırılan zaman çizelgesi (nüshalar tarih sırasıyla, çizginin iki yanında) ---- */
  load('/data/k6/eski.json').then(E => {
    const L = E.nushalar, ADIM = innerWidth < 600 ? 104 : 124, KART = innerWidth < 600 ? 180 : 210, hicri = m => Math.round((m - 622) * 33 / 32);
    const kisa = ad => { const p = ad.split(','); return [p[0], (p[1] || '').trim()]; };
    const OLAY = [[650, "Hz. Osman'ın mushafları çoğaltılır", 'h. 25–30'], [700, '700', 'h. 80'], [750, '750', 'h. 132'], [800, '800', 'h. 184']];
    let x = 30, html = '', o = 0;
    L.forEach((m, i) => {
      const t = m.bas || m.son - 60;
      while (o < OLAY.length && t >= OLAY[o][0]) { x += KART - ADIM + 20; html += `<div class="ek-olay" style="left:${x}px"><b>${esc(OLAY[o][1])}</b><small>${esc(OLAY[o][2])}</small></div>`; x += 70; o++; }
      const [sehir, kurum] = kisa(m.ad), ust = i % 2 === 0;
      html += `<i class="ek-nokta" style="left:${x}px"></i><a class="ek-kart ${ust ? 'ust' : 'alt'}" style="left:${x - 14}px;width:${KART}px" href="https://corpuscoranicum.de/de/manuscripts/${esc(m.id)}" target="_blank" rel="noopener">
        <span class="ek-tar">${m.bas ? m.bas + '–' + m.son : 'en geç ' + m.son}${m.c14 ? ' <em>C14</em>' : ''}</span><b>${esc(sehir)}</b><span class="ek-kurum">${esc(kurum)}</span><span class="ek-yazi">${esc(m.yazi || '')}</span></a>`;
      x += ADIM;
    });
    $('#eski').innerHTML = `<div class="ek-ust"><button type="button" class="ok" id="ekGeri" aria-label="Geriye kaydır">‹</button><span class="ek-ip">${fmt(L.length)} nüsha · eskiden yeniye · kaydırın</span><button type="button" class="ok" id="ekIleri" aria-label="İleriye kaydır">›</button></div>
      <div class="kap-s"><div class="ek-sahne" id="ekSahne" tabindex="0" aria-label="En eski yazmalar zaman çizelgesi; ok tuşlarıyla kaydırın"><div class="ek-iz" style="width:${x + KART}px"><div class="ek-cizgi"></div>${html}</div></div></div>
      <p class="dkaynak">${esc(E.kaynak)} · ${fmt(E.toplam_tarihli)} tarihli nüshadan en eski ${L.length}'ı. ${esc(E.not)} ${chain([{ r: 'Kaynak', t: E.kaynak, u: 'https://corpuscoranicum.de/de/manuscripts', k: 'cc' }, { r: 'İşleme', t: 'En eski yazmalar listesi', b: 'eskiyazma' }])}</p>`;
    const sh = $('#ekSahne'), kay = d => sh.scrollBy({ left: d * sh.clientWidth * .8, behavior: azHareket ? 'auto' : 'smooth' });
    const durum = () => { $('#ekGeri').disabled = sh.scrollLeft < 5; $('#ekIleri').disabled = sh.scrollLeft + sh.clientWidth > sh.scrollWidth - 5; };
    $('#ekGeri').onclick = () => kay(-1); $('#ekIleri').onclick = () => kay(1); sh.addEventListener('scroll', durum, { passive: true }); durum(); kaydirIpucu(sh);
    sh.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); kay(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); kay(-1); } });
  }).catch(() => { $('#eyb').hidden = true; });

  /* ---- kaynak dünyası ---- */
  const KG = { tefsir: ['#1F7A80', 'y'], ulum: ['#1F6070', 'g'], hadis: ['#1E3A5F', 'h'], hadisusul: ['#28456B', 'k'], kelam: ['#2F5D50', 'g'], fikih: ['#5B4A2A', 'k'], usul: ['#6A5530', 'h'],
    tasavvuf: ['#6B3A3A', 'u'], tarih: ['#4A5A3A', 'h'], tabakat: ['#3F5040', 'k'], lugat: ['#3E4E6B', 'k'], edebiyat: ['#5E3F55', 'y'], felsefe: ['#4B3F5E', 'y'], farsca: ['#2F5560', 'g'], genel: ['#4A4A42', 'h'], dinler: ['#2E4A55', 'h'] };
  const RL = await load('/data/kutuphane/raflar.json').catch(() => []);
  const KD = [...RL.map(r => [r[1], `${fmt(r[3])} kitap`, ...(KG[r[0]] || ['#444', 'h']), r[0]]), ['Dinler tarihi', '713 metin', ...KG.dinler, 'dinler']];
  const motif = (tp, c, i) => {
    const s = 'stroke="rgba(244,242,234,.1)" fill="none" stroke-width="1.2"', id = 'kp' + i;
    const P = { h: `<rect x="10" y="10" width="20" height="20" ${s}/><rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" ${s}/>`, k: `<path d="M4 4h12v12H8v8h16V8h8v24H4z" ${s}/>`,
      g: `<path d="M0 26L15 0h30l15 26-15 26H15z M15 0l15 26L15 52 M45 0L30 26l15 26 M0 26h60" ${s}/>`, y: `<path d="M25 5l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" ${s}/>` };
    if (tp === 'u') return `<rect width="100%" height="100%" fill="${c}"/><g transform="translate(170 40)" ${s}>${Array.from({ length: 12 }, (_, j) => `<ellipse rx="70" ry="20" transform="rotate(${j * 15})"/>`).join('')}</g>`;
    const w = { h: 40, k: 36, g: 60, y: 50 }[tp], h = tp === 'g' ? 52 : w;
    return `<defs><pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${P[tp]}</pattern></defs><rect width="100%" height="100%" fill="${c}"/><rect width="100%" height="100%" fill="url(#${id})"/>`;
  };
  $('#kaynaklar').innerHTML = KD.map((k, i) => `<a class="kay" href="#/kutuphane/${k[4]}"><svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 220 150" aria-hidden="true">${motif(k[3], k[2], i)}</svg><b>${k[0]}</b><span>${k[1]}</span></a>`).join('');
}

/* yatay kaydırılan alanlar için hareketli ipucu; kullanıcı kaydırınca kaybolur */
function kaydirIpucu(el) {
  if (!el || el.scrollWidth <= el.clientWidth + 8) return;
  const kap = el.parentElement; kap.classList.add('ipucu-kap');
  const ip = document.createElement('div'); ip.className = 'kay-ipucu'; ip.setAttribute('aria-hidden', 'true');
  ip.innerHTML = '<span>kaydır</span><i></i><i></i><i></i>';
  kap.appendChild(ip);
  const gizle = () => { ip.classList.add('gitti'); el.removeEventListener('scroll', gizle); setTimeout(() => ip.remove(), 600); };
  let gosterildi = false;
  new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting || gosterildi || azHareket) return; gosterildi = true; o.disconnect();
    el.removeEventListener('scroll', gizle);
    setTimeout(() => { el.scrollTo({ left: 90, behavior: 'smooth' }); setTimeout(() => { el.scrollTo({ left: 0, behavior: 'smooth' }); setTimeout(() => el.addEventListener('scroll', gizle, { passive: true }), 700); }, 700); }, 500);
  }, { threshold: .6 }).observe(el);
}

/* sayfa değişince açılışın kaydırma işlerini durdur, okuma sayfalarında zemini sakinleştir */
addEventListener('hashchange', () => { const h = location.hash.replace(/^#/, '') || '/'; if (h !== '/') { anaTemizle?.(); anaTemizle = null; document.body.classList.add('sakin'); } }, true);
dilUygula();
if ((location.hash.replace(/^#/, '') || '/') !== '/') document.body.classList.add('sakin');
