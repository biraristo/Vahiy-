'use strict';
/* vahiy++ — tür rafları (#/kutuphane/tefsir) ve kitap okuma ekranı (#/kitap/{id}/{sure}/{ayet}), seçili metinden isnadlı atıf.
   app.js ve home.js'den sonra yüklenir. */
const RAF_RENK = { erken: ['#1F5C5F', '#174649'], klasik: ['#1E3A5F', '#152B47'], orta: ['#5B3A2A', '#45291D'], osmanli: ['#6B2E2E', '#4F2121'], modern: ['#2F4A3A', '#22382B'] };
const TURLER = [['tefsir', 'Tefsir', 'التفسير'], ['hadis', 'Hadis', 'الحديث'], ['fikih', 'Fıkıh ve usûl', 'الفقه وأصوله'], ['kelam', 'Kelâm', 'العقيدة والكلام'], ['tasavvuf', 'Tasavvuf', 'التصوف والزهد'],
  ['tarih', 'Tarih ve ricâl', 'التاريخ والرجال'], ['lugat', 'Lügatler', 'اللغة'], ['ulum', "Ulûmü'l-Kur'ân", 'علوم القرآن'], ['felsefe', 'Felsefe ve mantık', 'الفلسفة والمنطق']];
const RAF_ONEK = { h: 'hadis', f: 'fikih', k: 'kelam', s: 'tasavvuf', r: 'tarih', l: 'lugat', q: 'ulum', u: 'ulum', p: 'felsefe' };
const kapakSvg = (e, i) => {
  const k = e.donem, s = 'stroke="rgba(232,207,140,.22)" fill="none" stroke-width="1"', id = `kp${e.id}`;
  const P = [`<rect x="8" y="8" width="16" height="16" ${s}/><rect x="8" y="8" width="16" height="16" transform="rotate(45 16 16)" ${s}/>`, `<path d="M16 3l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" ${s}/>`, `<path d="M0 16L8 2h16l8 14-8 14H8z M8 2l8 14-8 14 M24 2l-8 14 8 14" ${s}/>`];
  return `<svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="${id}" width="32" height="32" patternUnits="userSpaceOnUse">${P[i % 3]}</pattern><linearGradient id="g${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${RAF_RENK[k][0]}"/><stop offset="1" stop-color="${RAF_RENK[k][1]}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g${id})"/><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
};
const sonAyet = () => (store.get('son', '1:1')).split(':').map(Number);
const vefatYaz = v => v ? `ö. ${v}` : 'çağdaş';

/* ---------------- Raf ---------------- */
async function turRaf(tur) {
  setNav('kutuphane');
  const R = await load(`/data/kutuphane/${tur}.json`);
  const [ss, sa] = sonAyet();
  const T = R.ad ? [tur, R.ad, R.ad_ar] : (TURLER.find(x => x[0] === tur) || [tur, tur, '']);
  const tefsir = tur === 'tefsir';
  const okunur = tefsir ? R.eserler.filter(e => e.k2 && e.k2.length).length : 0;
  view.innerHTML = `<div class="raf-sayfa">
    <h1 class="raf-h1">${esc(T[1])} <span class="ar" lang="ar">${esc(T[2])}</span></h1>
    <p class="raf-ozet">${tefsir ? `${fmt(R.eserler.length)} eser; ${fmt(okunur)} tanesi ayet ayet okunabilir, diğerleri tam metin olarak açılır. Eserler müelliflerin vefat tarihine göre beş döneme ayrıldı. Bir kitaba dokunun, ${esc(D_ADI(ss))} ${ss}:${sa} ile açılsın.` : `${fmt(R.eserler.length)} eser, tam metinleriyle. Eserler müelliflerin vefat tarihine göre beş döneme ayrıldı. Bir kitaba dokunun, içindekilerle açılsın.`}</p>
    <div class="raf-arac"><input id="rafAra" type="search" placeholder="Eser ya da müellif ara" aria-label="Eser ya da müellif ara">
      <select id="rafSira" aria-label="Sıralama"><option value="v">Vefat yılına göre</option><option value="a">Eser adına göre</option><option value="m">Müellife göre</option></select></div>
    <nav class="raf-altlar" id="rafAlt" aria-label="Alanlar" hidden></nav>
    <nav class="raf-donemler" id="rafDn" aria-label="Dönemler"></nav>
    <div id="raflar"></div>
    <p class="raf-not">${esc(R.not)} ${chain([{ r: 'Liste', t: `${T[1]} rafı`, b: 'raf' }, { r: 'Türkçe adlar', t: 'Claude transkripsiyonu', b: 'raf' }])}</p>
  </div>`;
  const ciz = () => {
    const q = $('#rafAra').value.trim().toLocaleLowerCase('tr'), sira = $('#rafSira').value, suz = '';
    const qa = q && norm(q);
    let L = R.eserler.filter(e => (!altSec || e.alt === altSec) && (!q || `${e.ad || ''} ${e.muellif || ''}`.toLocaleLowerCase('tr').includes(q) || norm(`${e.ad_ar} ${e.muellif_ar || ''}`).includes(qa)));
    const ad = e => (e.ad || e.ad_ar).replace(/^(el|er|es|et|en|ez|eş|ed)-/, ''), mu = e => e.muellif || e.muellif_ar || '';
    const cmp = { v: (x, y) => (x.vefat || 9999) - (y.vefat || 9999) || ad(x).localeCompare(ad(y), 'tr'), a: (x, y) => ad(x).localeCompare(ad(y), 'tr'), m: (x, y) => mu(x).localeCompare(mu(y), 'tr') }[sira];
    L = L.slice().sort(cmp);
    $('#rafDn').innerHTML = R.donemler.map(([k, ad]) => { const n = L.filter(e => e.donem === k).length; return n ? `<a href="#raf-${k}" data-d="${k}">${esc(ad)} <small>(${n})</small></a>` : ''; }).join('');
    $('#raflar').innerHTML = R.donemler.map(([k, ad, alt]) => {
      const B = L.filter(e => e.donem === k); if (!B.length) return '';
      return `<section class="donem" id="raf-${k}"><div class="d-bas"><h2>${esc(ad)}</h2><span>${esc(alt)} · ${B.length} eser</span></div><div class="raf">${B.slice(0, gos[k] || 120).map((e, i) => `<a class="kitap" href="${tefsir && e.k2 ? `#/kitap/${e.id}/${ss}/${sa}` : `#/eser/${e.id}`}">
        <div class="kapak">${kapakSvg(e, i)}<div class="cer"></div><div class="bas" lang="ar">${esc(e.ad_ar.length > 60 ? e.ad_ar.slice(0, 58) + '…' : e.ad_ar)}</div><div class="yil">${vefatYaz(e.vefat)}</div>${!tefsir || !e.k2 || e.k2.length ? '' : '<span class="rozet">alıntılar</span>'}${e.eksik ? '<span class="rozet eksik">eksik</span>' : ''}</div>
        ${e.ad ? `<span class="ad">${esc(e.ad)}</span>` : `<span class="ad" lang="ar" dir="rtl">${esc(e.ad_ar)}</span>`}${e.muellif ? `<span class="yazar">${esc(e.muellif)}</span>` : `<span class="yazar" lang="ar" dir="rtl">${esc(e.muellif_ar || '')}</span>`}</a>`).join('')}</div>${B.length > (gos[k] || 120) ? `<p class="devam"><button type="button" data-daha="${k}">${fmt(B.length - (gos[k] || 120))} eser daha göster</button></p>` : ''}</section>`;
    }).join('') || '<p class="raf-ozet">Aramanıza uyan eser yok. Arama kutusunu temizleyin.</p>';
  };
  let altSec = ''; const gos = {};
  $('#raflar').addEventListener('click', ev => { const b = ev.target.closest('[data-daha]'); if (!b) return; gos[b.dataset.daha] = (gos[b.dataset.daha] || 120) + 600; ciz(); });
  const AL = [...new Set(R.eserler.map(e => e.alt).filter(Boolean))];
  if (AL.length > 1) {
    const say = k => R.eserler.filter(e => e.alt === k).length;
    AL.sort((x, y) => say(y) - say(x));
    $('#rafAlt').hidden = false;
    $('#rafAlt').innerHTML = `<button type="button" data-a="" aria-pressed="true">Tümü <small>(${fmt(R.eserler.length)})</small></button>` + AL.map(k => `<button type="button" data-a="${k}" aria-pressed="false">${esc(ALT_AD[k] || k)} <small>(${fmt(say(k))})</small></button>`).join('');
    $('#rafAlt').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; altSec = b.dataset.a; $('#rafAlt').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); ciz(); };
  }
  $('#rafDn').addEventListener('click', e => { const a = e.target.closest('a[data-d]'); if (!a) return; e.preventDefault(); document.getElementById('raf-' + a.dataset.d)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  ['input', 'change'].forEach(ev => { $('#rafAra').addEventListener(ev, ciz); }); $('#rafSira').addEventListener('change', ciz);
  ciz();
}
let D_ADI = n => String(n);

/* ---------------- Kitap okuma ---------------- */
async function kitapOku(id, s, a) {
  setNav('kutuphane');
  const [R, S, MI] = await Promise.all([load('/data/kutuphane/tefsir.json'), meta(), load('/data/meal/index.json')]);
  const e = R.eserler.find(x => x.id === id);
  if (!e) { view.innerHTML = '<h1>Böyle bir kitap yok</h1><p><a href="#/kutuphane/tefsir">Tefsir rafına dön</a></p>'; return; }
  if (!e.k2) { location.replace(`#/eser/${id}`); return; }
  e.k3 ||= [];
  const su = S.sureler[s - 1];
  if (!su || a < 1 || a > su.ayet) { location.replace(`#/kitap/${id}/1/1`); return; }
  store.set('son', `${s}:${a}`);
  const don = (R.donemler.find(d => d[0] === e.donem) || [, ''])[1];
  const prev = a > 1 ? [s, a - 1] : (s > 1 ? [s - 1, S.sureler[s - 2].ayet] : null);
  const next = a < su.ayet ? [s, a + 1] : (s < 114 ? [s + 1, 1] : null);
  const git = (x, y) => `#/kitap/${id}/${x}/${y}`;
  view.innerHTML = `<div class="okuma">
    <div class="kitapbas"><div class="kb-ic"><a class="geri" href="#/kutuphane/tefsir">‹ Tefsir rafı</a><div class="mini" style="--k1:${RAF_RENK[e.donem][0]};--k2:${RAF_RENK[e.donem][1]}"></div>
      <div class="kb-ad"><b>${esc(e.ad)}</b><span>${esc(e.muellif)} (${vefatYaz(e.vefat)}) · ${esc(don)}</span></div></div>
      <form class="secici" id="okSec"><select id="okSure" aria-label="Sure">${S.sureler.map(x => `<option value="${x.n}"${x.n === s ? ' selected' : ''}>${x.n}. ${esc(x.tr)} — ${esc(x.ar)}</option>`).join('')}</select>
        <div class="ay"><a href="${prev ? git(...prev) : '#'}" aria-label="Önceki ayet" ${prev ? '' : 'aria-disabled="true"'}>‹</a><input id="okAyet" type="number" min="1" max="${su.ayet}" value="${a}" inputmode="numeric" aria-label="Ayet"><a href="${next ? git(...next) : '#'}" aria-label="Sonraki ayet" ${next ? '' : 'aria-disabled="true"'}>›</a></div></form></div>
    <div class="ok-ayet"><p class="q" lang="ar" id="okQ">…</p><p class="m" id="okM"></p><a class="ref" href="#/${s}/${a}">${esc(su.tr)} ${s}:${a} · ayet sayfası</a>${e.tam ? ` <a class="ref" href="#/eser/${e.tam}">Kitabın tamamını oku (Şâmile)</a>` : ''}</div>
    <div id="okIc"><p class="durum">Yükleniyor…</p></div>
    <div class="gecis">${prev ? `<a href="${git(...prev)}">‹ ${prev[0]}:${prev[1]}</a>` : '<span></span>'}${next ? `<a class="ana" href="${git(...next)}">${next[0]}:${next[1]} ›</a>` : '<span></span>'}</div>
    <details class="kunye"><summary>Künye ve kaynak</summary><dl>
      <dt>Eser</dt><dd>${esc(e.ad)} <span lang="ar">(${esc(e.ad_ar)})</span></dd>
      <dt>Müellif</dt><dd>${esc(e.muellif)}${e.muellif_ar ? ` <span lang="ar">(${esc(e.muellif_ar)})</span>` : ''}${e.vefat ? `, ö. ${e.vefat}` : ''}</dd>
      <dt>Dönem</dt><dd>${esc(don)}</dd>
      ${nesirYaz(e.nesir) ? `<dt>Neşir</dt><dd lang="ar">${esc(nesirYaz(e.nesir))}</dd>` : ''}
      <dt>Veri</dt><dd>${e.k2.length ? `Ayet ayet tefsir metni: ${esc(e.kaynak || '')} (${e.k2.length} nüsha)` : ''}${e.k2.length && e.k3.length ? '; ' : ''}${e.k3.length ? `Külliyattaki ayet alıntıları: ${e.k3.length} dijital nüsha` : ''}</dd>
      <dt>Türkçe ad</dt><dd>Claude transkripsiyonu (TDV İslâm Ansiklopedisi yazımı esas alındı)</dd></dl></details>
    <p class="atif-ip">Metinden bir bölüm seçin: kaynağıyla birlikte atıf hazırlanır.</p>
  </div>`;
  $('#okSure').onchange = ev => { location.hash = git(+ev.target.value, 1); };
  $('#okSec').onsubmit = ev => { ev.preventDefault(); location.hash = git(s, Math.min(su.ayet, Math.max(1, +$('#okAyet').value || 1))); };
  $('#okAyet').onchange = () => $('#okSec').requestSubmit();
  load(`/data/k0/s/${s}.json`).then(K0 => { $('#okQ').textContent = K0.ayetler[a - 1].metin_tanzil || K0.ayetler[a - 1].metin; }).catch(() => {});
  load('/data/meal/tz-tr.diyanet.json').then(M => { $('#okM').textContent = '“' + (M[S._off[s - 1] + a - 1] || '') + '” (Diyanet İşleri meali)'; }).catch(() => {});

  const ic = $('#okIc'); let html = '';
  /* 1) ayet ayet tefsir metni (K2) */
  if (e.k2.length) {
    let T = await loadGz(`/data/k2/t/${s}/${a}.json.gz`).catch(() => ({ p: [] }));
    let rows = []; let wid = null;
    for (const w of e.k2) { rows = T.p.filter(r => r[0] === w); if (rows.length) { wid = w; break; } }
    let ortak = null;
    if (rows.length && rows[0][3] && typeof rows[0][3] === 'object' && rows[0][3].ref) {
      ortak = rows[0][3].ref; const [rs, ra] = ortak.split(':').map(Number);
      const T2 = await loadGz(`/data/k2/t/${rs}/${ra}.json.gz`).catch(() => ({ p: [] })); rows = T2.p.filter(r => r[0] === wid);
    }
    if (rows.length) {
      const c0 = rows[0][1], p0 = rows[0][2], c1 = rows[rows.length - 1][1], p1 = rows[rows.length - 1][2];
      const yer = c0 || p0 ? `${c0 ? `Cilt ${c0}, ` : ''}${p0 ? `s. ${p0}${p1 && p1 !== p0 ? '–' + p1 : ''}` : ''}` : '';
      html += `<div class="durum"><span>${ortak ? `Bu ayet ${esc(ortak)} ile birlikte tefsir edilmiş` : `${esc(e.muellif)} bu ayeti ${rows.length > 1 ? rows.length + ' sayfada' : 'tek bölümde'} tefsir etmiş`}</span><span>${esc(yer)}</span></div>`;
      html += rows.map((r, i) => `<article class="sayfa${i > 2 ? ' gizli' : ''}" data-w="${esc(r[0])}" data-c="${esc(r[1] || '')}" data-p="${esc(r[2] || '')}"><div class="ust"><span lang="ar">${esc(e.ad_ar)}</span><b>${r[1] ? `Cilt ${esc(r[1])} · ` : ''}${r[2] ? `Sayfa ${esc(r[2])}` : 'Bölüm'}</b></div>
        <div class="metin" lang="ar" dir="rtl">${ayetVurgu(String(r[3]))}</div>${r[2] ? `<div class="alt">— ${esc(r[2])} —</div>` : ''}</article>`).join('');
      if (rows.length > 3) html += `<p class="devam"><button type="button" id="okDevam">${rows.length - 3} sayfa daha · Devamını oku</button></p>`;
    }
  }
  /* 2) külliyattaki alıntılar (K3) */
  if (!html && e.k3.length) {
    const [B, KB] = await Promise.all([loadGz(`/data/x/${s}/${a}.json.gz`).catch(() => ({ k3: {} })), load('/data/x/kitaplar.json').then(d => d.kitaplar)]);
    const set = new Set(e.k3.map(String));
    const L = Object.values(B.k3 || {}).flat().filter(x => set.has(String(x[0])));
    if (L.length) {
      const toplam = L.reduce((t, x) => t + x[1], 0);
      html += `<div class="durum"><span>${esc(e.muellif)} bu ayete ${toplam} yerde değiniyor</span><span>ayet alıntısı</span></div>`;
      html += L.flatMap(([nb, , hits]) => hits.map(h => { const k = KB[nb] || {}; const yer = k.kaynak === 'OpenITI' ? (+h[0] ? `Cilt ${+h[0]} · Sayfa ${h[1]}` : (h[1] !== '0' ? `Sayfa ${h[1]}` : 'Bölüm')) : k.kaynak === 'Quranpedia PDF' ? `Cilt ${+h[0]} · PDF s. ${+h[1]}` : 'Quranpedia bölümü';
        return `<article class="sayfa" data-nb="${esc(nb)}" data-c="${esc(+h[0] || '')}" data-p="${esc(h[1] || '')}" data-kaynak="${esc(k.kaynak || '')}" data-ref="${esc(k.ref || '')}"><div class="ust"><span lang="ar">${esc(k.ad || e.ad_ar)}</span><b>${esc(yer)}</b></div><div class="metin" lang="ar" dir="rtl">${ayetVurgu(h[4] || '')}</div><div class="alt">${h[3] === 'b' ? 'kaynakta bu ayete bağlı bölüm' : `makine: ${h[2]} kelimelik metin eşleşmesi`}</div></article>`; })).join('');
    }
  }
  if (!html) {
    html = `<div class="bos-ayet"><p>${esc(e.ad)} bu ayeti ayrıca ele almıyor.</p><p id="okYakin"></p></div>`;
  }
  ic.innerHTML = html;
  $('#okDevam')?.addEventListener('click', ev => { ic.querySelectorAll('.sayfa.gizli').forEach(x => x.classList.remove('gizli')); ev.target.closest('.devam').remove(); });
  if ($('#okYakin') && e.k2.length) load(`/data/k2/i/${s}.json`).then(I => {
    const var_ = n => (I.ayetler[`${s}:${n}`] || []).some(x => e.k2.includes(x[0]));
    let o = null, sn = null; for (let k = a - 1; k >= 1; k--) if (var_(k)) { o = k; break; } for (let k = a + 1; k <= su.ayet; k++) if (var_(k)) { sn = k; break; }
    $('#okYakin').innerHTML = 'En yakın ele aldığı ayet: ' + [o && `<a href="${git(s, o)}">‹ ${s}:${o}</a>`, sn && `<a href="${git(s, sn)}">${s}:${sn} ›</a>`].filter(Boolean).join(' · ') || 'Bu surede bu eserin tefsir ettiği başka ayet bulunamadı.';
  }).catch(() => {});
  atifKur(e, s, a);
}
const nesirYaz = n => !n ? '' : [n.muhakkik && `تحقيق: ${n.muhakkik}`, n.yayinevi, n.baski && `ط. ${n.baski}`, n.yil, n.cilt && n.cilt !== '1' && `${n.cilt} مج`].filter(Boolean).join('، ');
const ayetVurgu = t => esc(t).replace(/﴿([^﴾]{1,600})﴾/g, '<span class="ayt">﴿$1﴾</span>');

/* ---------------- Seçili metinden atıf (isnad zinciriyle) ---------------- */
function atifKur(e, s, a) {
  let btn = $('#atifBtn');
  if (!btn) { btn = document.createElement('button'); btn.id = 'atifBtn'; btn.type = 'button'; btn.className = 'atif-btn'; btn.textContent = 'Atıf ver'; btn.hidden = true; document.body.appendChild(btn); }
  const secim = () => {
    const sel = getSelection(); if (!sel || sel.isCollapsed) return null;
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const art = node && node.closest('.okuma .sayfa'); if (!art) return null;
    const t = sel.toString().trim(); return t.length > 1 ? { t, art, r: sel.getRangeAt(0).getBoundingClientRect() } : null;
  };
  const guncelle = () => { const x = secim(); if (!x) { btn.hidden = true; return; } btn.hidden = false; btn.style.top = `${Math.max(70, x.r.top + scrollY - 46)}px`; btn.style.left = `${Math.min(innerWidth - 110, Math.max(8, x.r.left + x.r.width / 2 - 50))}px`; btn._x = x; };
  document.onselectionchange = () => { clearTimeout(btn._t); btn._t = setTimeout(guncelle, 150); };
  btn.onclick = () => {
    const x = btn._x || secim(); if (!x) return;
    const c = x.art.dataset.c, p = x.art.dataset.p, kaynak = x.art.dataset.kaynak, ref = x.art.dataset.ref;
    const yer = [c && `c. ${c}`, p && (kaynak === 'Quranpedia PDF' ? `PDF s. ${p}` : `s. ${p}`)].filter(Boolean).join(', ');
    const nes = nesirYaz(e.nesir);
    const atifTr = `${e.muellif}, ${e.ad}${yer ? `, ${yer}` : ''}. [${S_ADI(s)} ${s}:${a} hakkında]`;
    const atif = `${e.muellif}, ${e.ad}${nes ? ` (${nes})` : ''}${yer ? `, ${yer}` : ''}. [${S_ADI(s)} ${s}:${a} hakkında]`;
    const veri = x.art.dataset.w ? `${e.kaynak || 'Quranpedia'} ayet ayet tefsir dökümü, kayıt ${x.art.dataset.w}` : `${kaynak || 'OpenITI'}${ref ? ` · ${ref}` : ''}`;
    const tarih = new Date().toISOString().slice(0, 10);
    const zincir = [['Metin', `“${x.t.slice(0, 600)}${x.t.length > 600 ? '…' : ''}”`], ['Yer', yer || 'kaynakta sayfa bilgisi yok'], ['Eser', `${e.ad} (${e.ad_ar})`], ['Müellif', `${e.muellif}${e.vefat ? `, ö. ${e.vefat}` : ''}`], nes && ['Neşir', nes], ['Veri', veri], ['İşleme', 'vahiy++ ayet paketleri (açık kaynak betikler)'], ['Erişim', `${location.origin}/#/kitap/${e.id}/${s}/${a} · ${tarih}`]].filter(Boolean);
    const metinKopya = `${atif}\n\n${x.t}\n\nİsnad:\n${zincir.slice(1).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
    let m = $('#atifPanel'); if (!m) { m = document.createElement('div'); m.id = 'atifPanel'; m.className = 'atif-panel'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Atıf'); document.body.appendChild(m); }
    m.innerHTML = `<div class="ap-ic"><h3>Atıf</h3><p class="ap-atif">${esc(atifTr)}</p>${nes ? `<p class="ap-nesir" lang="ar" dir="rtl">${esc(nes)}</p>` : ''}<blockquote lang="ar" dir="rtl">${esc(x.t.slice(0, 600))}${x.t.length > 600 ? '…' : ''}</blockquote>
      <h4>İsnad</h4><ol class="halka">${zincir.slice(1).map(([k, v]) => `<li><b>${esc(k)}</b><span><bdi>${esc(v)}</bdi></span></li>`).join('')}</ol>
      <div class="ap-dug"><button type="button" class="gir" id="apKopya">Kopyala</button><button type="button" class="ok-dug" id="apKapat">Kapat</button></div></div>`;
    m.hidden = false; btn.hidden = true;
    $('#apKapat').onclick = () => { m.hidden = true; };
    m.onclick = ev => { if (ev.target === m) m.hidden = true; };
    $('#apKopya').onclick = async () => { try { await navigator.clipboard.writeText(metinKopya); $('#apKopya').textContent = 'Kopyalandı'; } catch { const ta = document.createElement('textarea'); ta.value = metinKopya; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); $('#apKopya').textContent = 'Kopyalandı'; } };
  };
}
let S_ADI = n => String(n);
meta().then(S => { D_ADI = n => S.sureler[n - 1]?.tr || ''; S_ADI = D_ADI; }).catch(() => {});
addEventListener('hashchange', () => { const b = $('#atifBtn'); if (b) b.hidden = true; const p = $('#atifPanel'); if (p) p.hidden = true; document.onselectionchange = null; });

/* ---------------- Tam metin okuyucu (hadis, fıkıh, kelâm, tasavvuf, tarih, lügat, kıraat) ----------------
   Dizin: /r2/kitap/{id}.json — b: [[düzey, başlık, ofset, uzunluk]]; metin: /r2/kitap/{id}.bin içinde her bölüm ayrı gzip üyesi (Range ile). */
const DIZIN = new Map();
async function dizinAl(id) {
  if (!DIZIN.has(id)) DIZIN.set(id, fetch(`/r2/kitap/${id}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));
  return DIZIN.get(id);
}
async function bolumAl(id, b) {
  const r = await fetch(`/r2/kitap/${id}.bin`, { headers: { Range: `bytes=${b[2]}-${b[2] + b[3] - 1}` } });
  if (!r.ok && r.status !== 206) throw new Error(r.status);
  const buf = await r.arrayBuffer();
  const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(ds).text();
}
const ALT_AD = { h: 'Hadis', f: 'Fıkıh', u: 'Usûl-i fıkıh', k: 'Kelâm', s: 'Tasavvuf ve zühd', t: 'Tarih', y: 'Siyer', c: 'Coğrafya ve rıhle', r: 'Ricâl ve tabakāt', l: 'Lügat', n: 'Nahiv, sarf, belâgat', q: 'Kıraat ve tecvid',
  U: "Ulûmü'l-Kur'ân", a: "Ahkâmü'l-Kur'ân", g: "Garîb ve i'râb", p: 'Felsefe', m: 'Mantık' };

async function eserOku(id, n) {
  setNav('kutuphane');
  const DZ = await load('/data/kutuphane/dizin.json').catch(() => ({ r: {}, y: {} }));
  if (DZ.y[id]) { location.replace(`#/eser/${DZ.y[id]}${n === undefined || isNaN(n) ? '' : '/' + n}`); return; }
  const raf = DZ.r[id] || RAF_ONEK[id[0]];
  const R = await load(`/data/kutuphane/${raf}.json`);
  const T = R.ad ? [raf, R.ad, R.ad_ar] : (TURLER.find(x => x[0] === raf) || [raf, raf, '']);
  let e = R.eserler.find(x => x.id === id);
  if (!e && raf === 'tefsir') { const t = R.eserler.find(x => x.tam === id); if (t) e = { ...t, id, kaynak: 'Şâmile', ref: id.slice(2), k2: undefined }; }
  if (!e) { view.innerHTML = `<h1>Böyle bir kitap yok</h1><p><a href="#/kutuphane/${raf}">${esc(T[1])} rafına dön</a></p>`; return; }
  const don = (R.donemler.find(d => d[0] === e.donem) || [, ''])[1];
  view.innerHTML = `<div class="okuma eser">
    <div class="kitapbas"><div class="kb-ic"><a class="geri" href="#/kutuphane/${raf}">‹ ${esc(T[1])}</a><div class="mini" style="--k1:${RAF_RENK[e.donem][0]};--k2:${RAF_RENK[e.donem][1]}"></div>
      <div class="kb-ad"><b${e.ad ? '' : ' lang="ar"'}>${esc(e.ad || e.ad_ar)}</b><span><bdi${e.muellif ? '' : ' lang="ar"'}>${esc(e.muellif || e.muellif_ar || '')}</bdi> (${vefatYaz(e.vefat)}) · ${esc(ALT_AD[e.alt] || e.alt || don)}</span></div></div>
      <div id="ekUst"></div></div>
    ${e.eksik ? `<p class="eksik-not">Bu eserin kaynak nüshası eksik: ${esc(e.eksik)}. Boş sayfalar kaynağın kendisinde boştur.</p>` : ''}
    <div id="ekIc"><p class="durum">Yükleniyor…</p></div>
    <details class="kunye"><summary>Künye ve kaynak</summary><dl>
      <dt>Eser</dt><dd>${e.ad ? `${esc(e.ad)} ` : ''}<span lang="ar">${e.ad ? '(' : ''}${esc(e.ad_ar)}${e.ad ? ')' : ''}</span></dd>
      <dt>Müellif</dt><dd>${esc(e.muellif || '')}${e.muellif_ar ? ` <span lang="ar">${e.muellif ? '(' : ''}${esc(e.muellif_ar)}${e.muellif ? ')' : ''}</span>` : ''}${e.vefat ? `, ö. ${e.vefat}` : ''}</dd>
      <dt>Dönem</dt><dd>${esc(don)}</dd><dt>Alan</dt><dd>${esc(ALT_AD[e.alt] || e.alt || T[1])}</dd>
      ${e.nesir ? `<dt>Neşir</dt><dd lang="ar">${esc(e.nesir)}</dd>` : ''}
      <dt>Veri</dt><dd>${e.kaynak === 'Şâmile' ? `el-Mektebetü'ş-Şâmile · kitap ${esc(e.ref)}` : e.kaynak === 'OpenITI' ? `OpenITI dijital nüshası · ${esc(e.ref)}` : `Quranpedia dijital nüshası · kitap ${esc(e.ref)}`}${e.b ? `; ${fmt(e.b)} bölüm` : ''}</dd>
      ${e.ad ? '<dt>Türkçe ad</dt><dd>Claude transkripsiyonu (TDV İslâm Ansiklopedisi yazımı esas alındı)</dd>' : ''}</dl></details>
  </div>`;
  let D;
  try { D = (await dizinAl(id)).b; } catch { $('#ekIc').innerHTML = '<div class="bos-ayet"><p>Bu kitabın metni şu an açılamadı. Sayfayı yenileyip tekrar deneyin.</p></div>'; return; }
  if (n === undefined || isNaN(n)) return icindekiler(e, D, raf);
  return bolumGoster(e, D, raf, Math.max(0, Math.min(D.length - 1, n)));
}

function icindekiler(e, D, raf) {
  const ust = Math.min(...D.map(b => b[0]));
  const kok = []; D.forEach((b, i) => { if (b[0] === ust) kok.push(i); });
  const cocuk = i => { const L = []; for (let j = i + 1; j < D.length && D[j][0] > D[i][0]; j++) L.push(j); return L; };
  const metinli = D.filter(b => b[3]).length;
  $('#ekUst').innerHTML = `<div class="ek-ara"><input id="ekAra" type="search" placeholder="İçindekilerde ara" aria-label="İçindekilerde ara" lang="ar" dir="auto"><span>${fmt(metinli)} bölüm</span></div>`;
  const satir = (i, alt) => {
    const b = D[i], ch = alt ? [] : cocuk(i).filter(j => D[j][0] === Math.min(...cocuk(i).map(k => D[k][0])));
    const altSay = alt ? 0 : cocuk(i).length;
    const no = alt ? '' : `<span class="no">${kok.indexOf(i) + 1}</span>`;
    const say = altSay ? `<span class="say">${fmt(altSay)} alt başlık</span>` : '';
    const bag = b[3] ? `href="#/eser/${e.id}/${i}"` : '';
    return altSay ? `<div class="ek-grup" data-i="${i}"><button type="button" class="ek-sat ac" aria-expanded="false">${no}<span class="bt" lang="ar">${esc(b[1])}</span>${say}</button><div class="ek-alt" hidden></div></div>`
      : `<a class="ek-sat${alt ? ' kucuk' : ''}${b[3] ? '' : ' bos'}" ${bag} style="--d:${alt ? Math.min(4, b[0] - ust) : 0}">${no}<span class="bt" lang="ar">${esc(b[1])}</span></a>`;
  };
  const ic = $('#ekIc');
  const ciz = () => {
    const q = ($('#ekAra')?.value || '').trim();
    if (q) {
      const nq = q.replace(/[ًٌٍَُِّْـ]/g, '');
      const L = []; for (let i = 0; i < D.length && L.length < 300; i++) if (D[i][1].replace(/[ًٌٍَُِّْـ]/g, '').includes(nq)) L.push(i);
      ic.innerHTML = L.length ? `<p class="durum"><span>${L.length >= 300 ? 'İlk 300 sonuç' : `${L.length} sonuç`}</span></p><div class="ek-liste">${L.map(i => satir(i, true)).join('')}</div>` : '<div class="bos-ayet"><p>Bu başlıkta bir bölüm bulunamadı. Aramayı kısaltıp tekrar deneyin.</p></div>';
      return;
    }
    if (kok.length === 1 && cocuk(kok[0]).length) { // tek kök: doğrudan alt düzeyi göster
      ic.innerHTML = `<div class="ek-liste">${satir(kok[0], true)}${cocuk(kok[0]).filter(j => D[j][0] === D[kok[0] + 1][0]).map(j => satir(j)).join('')}</div>`;
    } else ic.innerHTML = `<div class="ek-liste">${kok.map(i => satir(i)).join('')}</div>`;
  };
  ic.onclick = ev => {
    const btn = ev.target.closest('.ek-sat.ac'); if (!btn) return;
    const g = btn.parentElement, a = g.querySelector('.ek-alt'), i = +g.dataset.i, acik = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!acik)); g.classList.toggle('acik', !acik);
    if (!acik && !a.innerHTML) { const C = cocuk(i); a.innerHTML = (D[i][3] ? satir(i, true) : '') + C.slice(0, 2000).map(j => satir(j, true)).join('') + (C.length > 2000 ? `<p class="durum">${C.length - 2000} başlık daha: aramayı kullanın.</p>` : ''); }
    a.hidden = acik;
  };
  let t; $('#ekAra').oninput = () => { clearTimeout(t); t = setTimeout(ciz, 200); };
  ciz();
}

/* metni olmayan üst başlık: alt başlıklarını bağlantı olarak listeler */
function altBasliklar(D, n, git) {
  const L = []; for (let j = n + 1; j < D.length && D[j][0] > D[n][0]; j++) if (D[j][0] === D[n + 1][0]) L.push(j);
  return L.length ? `<p class="ek-alt-not">Bu başlık şu bölümlerden oluşuyor:</p><ol class="ek-alt-liste">${L.map(j => `<li><a href="${git(j)}">${esc(D[j][1])}</a></li>`).join('')}</ol>` : '';
}
async function bolumGoster(e, D, raf, n) {
  const b = D[n];
  const yol = []; let lv = b[0]; for (let j = n - 1; j >= 0 && lv > Math.min(...D.map(x => x[0])); j--) if (D[j][0] < lv) { yol.unshift(D[j][1]); lv = D[j][0]; }
  let p = n - 1; while (p >= 0 && !D[p][3]) p--; let s = n + 1; while (s < D.length && !D[s][3]) s++;
  const git = i => `#/eser/${e.id}/${i}`;
  $('#ekUst').innerHTML = `<nav class="ek-yol" aria-label="Bölüm yolu"><a href="#/eser/${e.id}">İçindekiler</a>${yol.map(y => ` › <bdi lang="ar">${esc(y)}</bdi>`).join('')}</nav>`;
  const ic = $('#ekIc');
  ic.innerHTML = `<h2 class="ek-bas" lang="ar" dir="rtl">${ayetVurgu(b[1])}</h2><p class="durum">Yükleniyor…</p>`;
  let txt = '';
  try { txt = b[3] ? await bolumAl(e.id, b) : ''; } catch { ic.innerHTML += '<div class="bos-ayet"><p>Bölüm indirilemedi. Bağlantınızı kontrol edip sayfayı yenileyin.</p></div>'; return; }
  /* sayfa işaretleri: \x01c:s\x01 bir sayfanın SONUNU gösterir; işaretten önceki metin o sayfadadır */
  const parc = txt.split('\x01');
  const seg = []; let bekle = [];
  for (let i = 0; i < parc.length; i++) {
    if (i % 2) { const [c, sy] = parc[i].split(':').map(Number); bekle.forEach(x => { x.c = c; x.p = sy; }); bekle = []; seg.push({ isaret: [c, sy] }); }
    else { const x = { t: parc[i] }; seg.push(x); bekle.push(x); }
  }
  const son = seg.filter(x => x.isaret).pop(); bekle.forEach(x => { if (son) { x.c = son.isaret[0]; x.p = son.isaret[1] + 1; } });
  const hadis = raf === 'hadis';
  let html = '';
  const paragraf = (t, c, sy) => {
    const dip = t.startsWith('\x04'); if (dip) t = t.slice(1);
    let h = ayetVurgu(t);
    if (hadis) { const m = /^(\d{1,5}) (.*)$/s.exec(t); if (m) { const [i0, ...r] = m[2].split(' * '); h = `<span class="hno">${m[1]}</span>` + (r.length ? `<span class="isn">${ayetVurgu(i0)}</span> <span class="mtn">${ayetVurgu(r.join(' * '))}</span>` : ayetVurgu(m[2])); } }
    return `<p${dip ? ' class="dipnot"' : ''} data-c="${c || ''}" data-p="${sy || ''}">${h}</p>`;
  };
  let buf = '', pc = null;
  for (const x of seg) {
    if (x.isaret) { buf += `\x02${x.isaret[0]}:${x.isaret[1]}\x02`; continue; }
    const L = x.t.split('\n');
    L.forEach((l, k) => { if (k > 0) { html += kapat(buf, pc); buf = ''; pc = null; } if (pc === null && l.trim()) pc = [x.c, x.p]; buf += l; });
  }
  html += kapat(buf, pc);
  function kapat(t, c) {
    if (!t.replace(/\x02[^\x02]*\x02/g, '').trim()) return t.includes('\x02') ? t.replace(/\x02(\d+):(\d+)\x02/g, (m, a, bb) => `<span class="sy-son">${+a ? `c. ${a}, ` : ''}s. ${bb}</span>`) : '';
    const yer = c || [];
    let p = paragraf(t.replace(/\x02[^\x02]*\x02/g, '\x03'), yer[0], yer[1]);
    const isr = [...t.matchAll(/\x02(\d+):(\d+)\x02/g)].map(m => `<span class="sy-son">${+m[1] ? `c. ${m[1]}, ` : ''}s. ${m[2]}</span>`);
    let k = 0; p = p.replace(/\x03/g, () => isr[k++] || '');
    return p;
  }
  const ilkYer = seg.find(x => !x.isaret && x.t.trim());
  const yerYaz = ilkYer && ilkYer.p ? `${ilkYer.c ? `Cilt ${ilkYer.c} · ` : ''}Sayfa ${ilkYer.p}` : 'Bölüm';
  ic.innerHTML = `<h2 class="ek-bas" lang="ar" dir="rtl">${ayetVurgu(b[1])}</h2>
    <article class="sayfa ek-metin" data-n="${n}"><div class="ust"><span lang="ar">${esc(e.ad_ar)}</span><b>${esc(yerYaz)}</b></div>
    <div class="metin${hadis ? ' hd' : ''}" lang="ar" dir="rtl">${/<p[ >]/.test(html) ? html : altBasliklar(D, n, git) || html || '<p>Bu başlığın altında metin yok.</p>'}</div></article>
    <div class="gecis">${p >= 0 ? `<a href="${git(p)}">‹ Önceki bölüm</a>` : '<span></span>'}${s < D.length ? `<a class="ana" href="${git(s)}">Sonraki bölüm ›</a>` : '<span></span>'}</div>
    <p class="atif-ip">Metinden bir bölüm seçin: kaynağıyla birlikte atıf hazırlanır.</p>`;
  turkceDugme(ic.querySelector('.ek-metin'), () => ic.querySelector('.ek-metin .metin').innerText);
  scrollTo(0, 0);
  atifEser(e, yol.concat(b[1]), n);
}

function atifEser(e, yol, n) {
  let btn = $('#atifBtn');
  if (!btn) { btn = document.createElement('button'); btn.id = 'atifBtn'; btn.type = 'button'; btn.className = 'atif-btn'; btn.textContent = 'Atıf ver'; btn.hidden = true; document.body.appendChild(btn); }
  const secim = () => {
    const sel = getSelection(); if (!sel || sel.isCollapsed) return null;
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const art = node && node.closest('.okuma .ek-metin'); if (!art) return null;
    const pr = node.closest('p[data-p]');
    const t = sel.toString().trim(); return t.length > 1 ? { t, c: pr?.dataset.c, p: pr?.dataset.p, r: sel.getRangeAt(0).getBoundingClientRect() } : null;
  };
  const guncelle = () => { const x = secim(); if (!x) { btn.hidden = true; return; } btn.hidden = false; btn.style.top = `${Math.max(70, x.r.top + scrollY - 46)}px`; btn.style.left = `${Math.min(innerWidth - 110, Math.max(8, x.r.left + x.r.width / 2 - 50))}px`; btn._x = x; };
  document.onselectionchange = () => { clearTimeout(btn._t); btn._t = setTimeout(guncelle, 150); };
  btn.onclick = () => {
    const x = btn._x || secim(); if (!x) return;
    const yer = [x.c && +x.c && `c. ${x.c}`, x.p && `s. ${x.p}`].filter(Boolean).join(', ');
    const bolum = yol.join(' › ');
    const atifTr = `${e.muellif || e.muellif_ar || ''}, ${e.ad || e.ad_ar}${yer ? `, ${yer}` : ''}.`;
    const tarih = new Date().toISOString().slice(0, 10);
    const zincir = [['Yer', `${yer ? yer + ' · ' : ''}${bolum}`], ['Eser', e.ad ? `${e.ad} (${e.ad_ar})` : e.ad_ar], ['Müellif', `${e.muellif || e.muellif_ar || ''}${e.vefat ? `, ö. ${e.vefat}` : ''}`], e.nesir && ['Neşir', e.nesir],
      ['Veri', e.kaynak === 'Şâmile' ? `el-Mektebetü'ş-Şâmile · kitap ${e.ref}` : e.kaynak === 'OpenITI' ? `OpenITI · ${e.ref}` : `Quranpedia · kitap ${e.ref}`], ['İşleme', 'vahiy++ bölümleme (açık kaynak betikler)'], ['Erişim', `${location.origin}/#/eser/${e.id}/${n} · ${tarih}`]].filter(Boolean);
    const metinKopya = `${atifTr}\n\n${x.t}\n\nİsnad:\n${zincir.map(([k, v]) => `${k}: ${v}`).join('\n')}`;
    let m = $('#atifPanel'); if (!m) { m = document.createElement('div'); m.id = 'atifPanel'; m.className = 'atif-panel'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Atıf'); document.body.appendChild(m); }
    m.innerHTML = `<div class="ap-ic"><h3>Atıf</h3><p class="ap-atif">${esc(atifTr)}</p><blockquote lang="ar" dir="rtl">${esc(x.t.slice(0, 600))}${x.t.length > 600 ? '…' : ''}</blockquote>
      <h4>İsnad</h4><ol class="halka">${zincir.map(([k, v]) => `<li><b>${esc(k)}</b><span><bdi>${esc(v)}</bdi></span></li>`).join('')}</ol>
      <div class="ap-dug"><button type="button" class="gir" id="apKopya">Kopyala</button><button type="button" class="ok-dug" id="apKapat">Kapat</button></div></div>`;
    m.hidden = false; btn.hidden = true;
    $('#apKapat').onclick = () => { m.hidden = true; };
    m.onclick = ev => { if (ev.target === m) m.hidden = true; };
    $('#apKopya').onclick = async () => { try { await navigator.clipboard.writeText(metinKopya); } catch { const ta = document.createElement('textarea'); ta.value = metinKopya; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } $('#apKopya').textContent = 'Kopyalandı'; };
  };
}
