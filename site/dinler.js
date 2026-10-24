'use strict';
/* vahiy++ — Dinler tarihi rafı (#/kutuphane/dinler) ve metin okuma ekranı (#/metin/{id}).
   Metinler Corpus Coranicum TUK kayıtlarıdır (/data/k6/m/{id}.json); sınıflama /data/kutuphane/dinler.json. */
const DT_YAZI = { 'İbranice': 'heb', 'Aramice/İbranice': 'heb', 'Aramice': 'heb', 'Süryanice': 'syr', 'Arapça': 'ara', 'Grekçe': 'grc', 'Latince': 'lat', 'Ge‘ez': 'eth', 'Eski Güney Arapçası': 'sar', 'Kuzey Arapçası (Safâ)': 'lat', 'Palmira Aramicesi': 'lat', 'Eski Kilise Slavcası': 'cu', 'Orta Farsça (Pehlevî)': 'lat', 'Avestaca': 'lat', 'Soğdca': 'lat', 'Sümerce': 'lat' };
const DT_RTL = s => /[\u0590-\u08FF\uFB1D-\uFEFF]/.test(s);
let DT_FONT = false;
const dtFont = () => {
  if (DT_FONT) return; DT_FONT = true;
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@400;600&family=Noto+Sans+Syriac:wght@400;600&family=Noto+Serif+Ethiopic&family=Gentium+Book+Plus:ital@0;1&family=Noto+Sans+Old+South+Arabian&display=swap';
  document.head.appendChild(l);
};

async function dinlerRaf() {
  setNav('kutuphane');
  const R = await load('/data/kutuphane/dinler.json');
  const M = R.metinler, eserSay = new Set(M.map(e => e.g + e.a + e.eser)).size;
  view.innerHTML = `<div class="raf-sayfa dt">
    <h1 class="raf-h1">Dinler tarihi <span class="ar" lang="ar">تاريخ الأديان</span></h1>
    <p class="raf-ozet">${fmt(M.length)} metin, ${fmt(eserSay)} eserden. Kur'an'ın indiği çağın Yahudi, Hristiyan, Câhiliye Arap ve İran dünyasından seçilmiş pasajlar; her biri kendi dilinde ve yazısında, kaynağın verdiği çevirilerle okunur.</p>
    <div class="raf-arac"><input id="dtAra" type="search" placeholder="Eser, pasaj, yazar ya da dil ara" aria-label="Eser, pasaj, yazar ya da dil ara"></div>
    <nav class="raf-altlar" id="dtGel" aria-label="Gelenekler"></nav>
    <div id="dtListe"></div>
    <p class="raf-not">${esc(R.not)} ${chain([{ r: 'Metinler', t: 'Corpus Coranicum, TUK', k: 'cc' }, { r: 'Sınıflama ve Türkçe künye', t: 'vahiy++', b: 'raf' }])}</p>
  </div>`;
  let gSec = store.get('dtGel', '');
  const say = k => M.filter(e => e.g === k).length;
  $('#dtGel').innerHTML = `<button type="button" data-g="">Tümü <small>(${fmt(M.length)})</small></button>` + R.gelenekler.map(g => `<button type="button" data-g="${g.k}">${esc(g.ad)} <small>(${fmt(say(g.k))})</small></button>`).join('');
  const basili = () => $('#dtGel').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === gSec)));
  const satir = e => `<a class="dt-sat" href="#/metin/${e.id}"><span class="dt-ad">${esc(e.ad)}</span><span class="dt-ek">${esc([e.dil, e.tarih].filter(Boolean).join(' · '))}</span></a>`;
  const ciz = () => {
    const q = $('#dtAra').value.trim().toLocaleLowerCase('tr');
    const L = M.filter(e => (!gSec || e.g === gSec) && (!q || `${e.ad} ${e.asil} ${e.yazar} ${e.dil}`.toLocaleLowerCase('tr').includes(q)));
    $('#dtListe').innerHTML = R.gelenekler.filter(g => !gSec || g.k === gSec).map(g => {
      const G = L.filter(e => e.g === g.k); if (!G.length) return '';
      return `<section class="donem dt-gel" id="dt-${g.k}"><div class="d-bas"><h2>${esc(g.ad)}</h2><span>${fmt(G.length)} metin</span></div>${g.alanlar.map(a => {
        const A = G.filter(e => e.a === a.k); if (!A.length) return '';
        const eserler = []; const ix = {};
        A.forEach(e => { if (!(e.eser in ix)) { ix[e.eser] = eserler.length; eserler.push({ ad: e.eser, L: [] }); } eserler[ix[e.eser]].L.push(e); });
        return `<div class="dt-alan"><h3>${esc(a.ad)} <small>${fmt(A.length)}</small></h3><div class="ek-liste">${eserler.map(w => w.L.length === 1 ? satir(w.L[0])
          : `<div class="ek-grup${q ? ' acik' : ''}"><button type="button" class="dt-sat ac" aria-expanded="${q ? 'true' : 'false'}"><span class="dt-ad">${esc(w.ad)}</span><span class="dt-ek">${w.L.length} pasaj</span></button><div class="ek-alt"${q ? '' : ' hidden'}>${w.L.map(satir).join('')}</div></div>`).join('')}</div></div>`;
      }).join('')}</section>`;
    }).join('') || '<p class="raf-ozet">Aramanıza uyan metin yok. Arama kutusunu temizleyin.</p>';
  };
  $('#dtGel').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; gSec = b.dataset.g; store.set('dtGel', gSec); basili(); ciz(); };
  $('#dtListe').onclick = ev => {
    const b = ev.target.closest('.dt-sat.ac'); if (!b) return;
    const g = b.parentElement, acik = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!acik)); g.classList.toggle('acik', !acik); g.querySelector('.ek-alt').hidden = acik;
  };
  let t; $('#dtAra').oninput = () => { clearTimeout(t); t = setTimeout(ciz, 180); };
  basili(); ciz();
}

/* ---- metnin türüne göre biçimleme ---- */
const DT_NUM = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9 };
const dtRakam = s => s.replace(/[٠-٩]/g, c => DT_NUM[c]);
/* Ayetlere bölme: "1 metin 2 metin" ya da İbranice sof pasuk ( : ). Başlangıç numarası başlıktaki aralıktan gelir. */
function dtAyetler(t, bas) {
  t = (t || '').replace(/\u00a0/g, ' ').trim(); if (!t) return null;
  const numarali = [...t.matchAll(/(?:^|[\s\n])(\d{1,3})\.?\s+(?=[^\d\s])/g)];
  if (numarali.length >= 2) {
    const L = []; let onceki = 0, ok = true;
    numarali.forEach((m, i) => { const n = +m[1]; if (n < onceki || n > onceki + 40) ok = false; onceki = n; const s = m.index + m[0].length, e = i + 1 < numarali.length ? numarali[i + 1].index : t.length; L.push([n, t.slice(s, e).trim()]); });
    const on = t.slice(0, numarali[0].index).trim(); if (on) L.unshift([null, on]);
    if (ok) return L;
  }
  if (/[\u0590-\u05FF]/.test(t) && /\s:\s|׃/.test(t)) {
    const P = t.split(/\s*[:׃]\s*/).map(x => x.trim()).filter(Boolean);
    if (P.length >= 2) return P.map((x, i) => [bas + i, x]);
  }
  return null;
}
const dtBaslangic = baslik => { const m = /(\d+)[:,]\s?(\d+)/.exec(baslik); return m ? +m[2] : 1; };
const dtSiir = t => { const L = (t || '').split('\n').map(x => x.replace(/\u00a0/g, ' ').trim()).filter(Boolean); const B = L.map(x => x.split(/\s{3,}/)); return B.filter(x => x.length === 2).length >= Math.max(2, L.length * .6) ? B : null; };

function dtBlok(t, yazi, tur, bas) {
  if (!t) return '';
  const rtl = DT_RTL(t), d = rtl ? 'rtl' : 'ltr';
  if (tur === 'siir') {
    const B = dtSiir(t);
    if (B) return `<div class="dt-siir" dir="${d}">${B.map(x => { const m = /^([٠-٩\d]+)\s*/.exec(x[0]); const no = m ? dtRakam(m[1]) : ''; return `<div class="beyt">${no ? `<span class="no">${no}</span>` : '<span></span>'}<span>${esc(m ? x[0].slice(m[0].length) : x[0])}</span><span>${esc(x[1] || '')}</span></div>`; }).join('')}</div>`;
  }
  const A = tur === 'yazit' ? null : dtAyetler(t, bas);
  if (A) return `<div class="dt-ayetler" dir="${d}">${A.map(([n, x]) => `<p>${n === null ? '' : `<sup class="ano">${n}</sup>`}${esc(x)}</p>`).join('')}</div>`;
  if (tur === 'yazit') return `<div class="dt-duz satir">${t.split('\n').map(l => l.replace(/\u00a0/g, ' ').trim()).filter(Boolean).map(l => `<p dir="auto"${DT_RTL(l) ? ` class="${/[\u0600-\u06FF]/.test(l) ? 'y-ara' : yazi === 'syr' ? 'y-syr' : 'y-heb'}"` : ''}>${esc(l)}</p>`).join('')}</div>`;
  const satirli = t.split('\n').length > 3;
  return `<div class="dt-duz${satirli ? ' satirli' : ''}" dir="${d}">${t.split(/\n{2,}/).map(p => `<p dir="auto">${esc(p.trim())}</p>`).join('')}</div>`;
}

/* İki metni ayet numarasına göre yan yana diz; uymazsa null */
function dtHizali(a, b, bas) {
  const A = dtAyetler(a, bas), B = dtAyetler(b, bas); if (!A || !B) return null;
  const ma = new Map(A.filter(x => x[0] !== null)), mb = new Map(B.filter(x => x[0] !== null));
  const ort = [...ma.keys()].filter(k => mb.has(k)).length;
  if (ort < Math.max(2, .7 * Math.max(ma.size, mb.size))) return null;
  const K = [...new Set([...ma.keys(), ...mb.keys()])].sort((x, y) => x - y);
  return K.map(k => [k, ma.get(k) || '', mb.get(k) || '']);
}

async function metinOku(id) {
  setNav('kutuphane'); dtFont();
  const [R, m] = await Promise.all([load('/data/kutuphane/dinler.json'), load(`/data/k6/m/${id}.json`).catch(() => null)]);
  const e = R.metinler.find(x => String(x.id) === String(id));
  if (!e || !m) { view.innerHTML = '<h1>Böyle bir metin yok</h1><p><a href="#/kutuphane/dinler">Dinler tarihi rafına dön</a></p>'; return; }
  const G = R.gelenekler.find(g => g.k === e.g), A = G.alanlar.find(a => a.k === e.a);
  const kardes = R.metinler.filter(x => x.g === e.g && x.a === e.a && x.eser === e.eser), ki = kardes.indexOf(e);
  const yazi = DT_YAZI[e.dil] || 'lat', tur = e.a === 'siir' ? 'siir' : e.a === 'yazit' || /yazıt|sikke|tetradrahmi|belgesi/i.test(e.ad) ? 'yazit' : 'nesir';
  const bas = dtBaslangic(e.asil);
  const asil = m.metin || m.transkripsiyon, asilAd = m.metin ? `Asıl metin · ${e.dil}` : `Transkripsiyon · ${e.dil}`;
  /* yanındaki metin seçenekleri */
  const S = [m.metin && m.transkripsiyon && ['tr', 'Transkripsiyon', m.transkripsiyon, 'lat'], m.ceviri_de && ['de', 'Almanca çeviri', m.ceviri_de, 'lat'], m.ceviri_en && ['en', 'İngilizce çeviri', m.ceviri_en, 'lat'],
    m.sefaria && ['sf', 'İngilizce · Sefaria (JPS)', m.sefaria.metin, 'lat', m.sefaria.kaynak], m.lxx && ['lxx', 'Grekçe · Septuaginta', m.lxx.metin, 'grc', m.lxx.kaynak], m.sblgnt && ['sbl', 'Grekçe · SBLGNT', m.sblgnt.metin, 'grc', m.sblgnt.kaynak],
    m.pesitta && ['pe', 'Süryanice · Peşitta', m.pesitta.metin, 'syr', m.pesitta.kaynak], m.syrnt && ['syn', 'Süryanice · Peşitta (YA)', m.syrnt.metin, 'syr', m.syrnt.kaynak]].filter(Boolean);
  let yan = store.get('dtYan', 'de'); if (!S.find(s => s[0] === yan)) yan = S[0]?.[0] || '';
  view.innerHTML = `<div class="okuma dt-oku">
    <div class="kitapbas"><div class="kb-ic"><a class="geri" href="#/kutuphane/dinler">‹ Dinler tarihi</a>
      <div class="kb-ad"><b>${esc(e.ad)}</b><span>${esc(G.ad)} · ${esc(A.ad)}</span></div></div></div>
    <header class="dt-bas"><h1>${esc(e.ad)}</h1>
      <dl class="dt-kun">${e.yazar ? `<div><dt>Yazar</dt><dd>${esc(e.yazar)}</dd></div>` : ''}<div><dt>Dil</dt><dd>${esc(e.dil)}</dd></div>${e.tarih ? `<div><dt>Tarih</dt><dd>${esc(e.tarih)}</dd></div>` : ''}${e.yer ? `<div><dt>Yer</dt><dd>${esc(e.yer)}</dd></div>` : ''}</dl></header>
    ${S.length ? `<nav class="raf-altlar dt-yan" aria-label="Yanındaki metin"><button type="button" data-y="" aria-pressed="${!yan}">Yalnız asıl metin</button>${S.map(s => `<button type="button" data-y="${s[0]}" aria-pressed="${s[0] === yan}">${esc(s[1])}</button>`).join('')}</nav>` : ''}
    <div id="dtMetin"></div>
    ${m.ayetler?.length ? `<section class="dt-kuran"><h2>Kur'an'daki karşılıkları</h2><p class="links">${m.ayetler.map(x => `<a href="#/${x.replace(':', '/')}">${esc(D_ADI(+x.split(':')[0]))} ${x}</a>`).join(' ')}</p>
      ${m.not_de ? `<details class="dt-not"><summary>Corpus Coranicum açıklaması (Almanca)</summary><p lang="de">${esc(m.not_de)}</p></details>` : ''}</section>` : ''}
    <div class="gecis">${ki > 0 ? `<a href="#/metin/${kardes[ki - 1].id}">‹ ${esc(kardes[ki - 1].ad)}</a>` : '<span></span>'}${ki < kardes.length - 1 ? `<a class="ana" href="#/metin/${kardes[ki + 1].id}">${esc(kardes[ki + 1].ad)} ›</a>` : '<span></span>'}</div>
    <details class="kunye"><summary>Künye ve kaynak</summary><dl>
      <dt>Metin</dt><dd>${esc(e.ad)} <span lang="de">(${esc(e.asil)})</span></dd>
      ${m.kaynak ? `<dt>Neşir</dt><dd>${esc(m.kaynak)}</dd>` : ''}
      ${m.tespit ? `<dt>Paralelliği tespit eden</dt><dd>${esc(m.tespit)}</dd>` : ''}
      <dt>Madde</dt><dd>Corpus Coranicum TUK ${esc(m.id)}${m.madde_yazari ? `, ${esc(m.madde_yazari)}` : ''} · <a href="${esc(m.cc)}" target="_blank" rel="noopener">kaynağında aç</a></dd>
      ${S.filter(s => s[4]).map(s => `<dt>${esc(s[1])}</dt><dd>${esc(s[4])}</dd>`).join('')}
      <dt>Sınıflama</dt><dd>${esc(G.ad)} › ${esc(A.ad)} (vahiy++)</dd></dl>
      <p><button type="button" class="ok-dug" id="dtAtif">Atfı kopyala</button></p></details>
  </div>`;
  const ciz = () => {
    const s = S.find(x => x[0] === yan);
    const ana = `<article class="sayfa dt-sayfa y-${tur === 'yazit' ? 'lat' : yazi}"><div class="ust"><span>${esc(asilAd)}</span></div>${dtBlok(asil, yazi, tur, bas)}</article>`;
    if (!s) { $('#dtMetin').innerHTML = ana; return; }
    const H = tur === 'nesir' && dtHizali(asil, s[2], bas);
    if (H) {
      const ra = DT_RTL(asil) ? 'rtl' : 'ltr', rb = DT_RTL(s[2]) ? 'rtl' : 'ltr';
      $('#dtMetin').innerHTML = `<article class="sayfa dt-hiza"><div class="ust"><span>${esc(asilAd)}</span><span>${esc(s[1])}</span></div>${H.map(([n, a, b]) => `<div class="hz"><sup class="ano">${n}</sup><p class="y-${yazi}" dir="${ra}">${esc(a)}</p><p class="y-${s[3]}" dir="${rb}">${esc(b)}</p></div>`).join('')}</article>`;
    } else $('#dtMetin').innerHTML = `<div class="dt-cift">${ana}<article class="sayfa dt-sayfa y-${s[3]}"><div class="ust"><span>${esc(s[1])}</span></div>${dtBlok(s[2], s[3], tur, bas)}</article></div>`;
  };
  $('.dt-yan')?.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; yan = b.dataset.y; if (yan) store.set('dtYan', yan); $('.dt-yan').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); ciz(); });
  $('#dtAtif').onclick = async () => {
    const t = `${e.yazar ? e.yazar + ', ' : ''}${e.ad}${m.kaynak ? `, ${m.kaynak}` : ''}. Corpus Coranicum TUK ${m.id}${m.madde_yazari ? ` (${m.madde_yazari})` : ''}, ${m.cc}. vahiy++: ${location.origin}/#/metin/${e.id}, erişim ${new Date().toISOString().slice(0, 10)}.`;
    try { await navigator.clipboard.writeText(t); } catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    $('#dtAtif').textContent = 'Kopyalandı';
  };
  ciz(); scrollTo(0, 0);
}
