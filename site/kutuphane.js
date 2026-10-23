'use strict';
/* vahiy++ — tür rafları (#/kutuphane/tefsir) ve kitap okuma ekranı (#/kitap/{id}/{sure}/{ayet}), seçili metinden isnadlı atıf.
   app.js ve home.js'den sonra yüklenir. */
const RAF_RENK = { erken: ['#1F5C5F', '#174649'], klasik: ['#1E3A5F', '#152B47'], orta: ['#5B3A2A', '#45291D'], osmanli: ['#6B2E2E', '#4F2121'], modern: ['#2F4A3A', '#22382B'] };
const TURLER = [['tefsir', 'Tefsir', 'التفسير']];
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
  const T = TURLER.find(x => x[0] === tur) || [tur, tur, ''];
  const okunur = R.eserler.filter(e => e.k2.length).length;
  view.innerHTML = `<div class="raf-sayfa">
    <h1 class="raf-h1">${esc(T[1])} <span class="ar" lang="ar">${esc(T[2])}</span></h1>
    <p class="raf-ozet">${fmt(R.eserler.length)} eser; ${fmt(okunur)} tanesi ayet ayet okunabilir, diğerlerinde ayetin geçtiği yerler gösterilir. Eserler müelliflerin vefat tarihine göre beş döneme ayrıldı. Bir kitaba dokunun, ${esc(D_ADI(ss))} ${ss}:${sa} ile açılsın.</p>
    <div class="raf-arac"><input id="rafAra" type="search" placeholder="Eser ya da müellif ara" aria-label="Eser ya da müellif ara">
      <select id="rafSira" aria-label="Sıralama"><option value="v">Vefat yılına göre</option><option value="a">Eser adına göre</option><option value="m">Müellife göre</option></select></div>
    <nav class="raf-donemler" id="rafDn" aria-label="Dönemler"></nav>
    <div id="raflar"></div>
    <p class="raf-not">${esc(R.not)} ${chain([{ r: 'Liste', t: 'Tefsir rafı', b: 'raf' }, { r: 'Türkçe adlar', t: 'Claude transkripsiyonu', b: 'raf' }])}</p>
  </div>`;
  const ciz = () => {
    const q = $('#rafAra').value.trim().toLocaleLowerCase('tr'), sira = $('#rafSira').value, suz = '';
    let L = R.eserler.filter(e => (!suz || e.k2.length) && (!q || `${e.ad} ${e.muellif} ${e.ad_ar} ${e.muellif_ar || ''}`.toLocaleLowerCase('tr').includes(q)));
    const cmp = { v: (x, y) => (x.vefat || 9999) - (y.vefat || 9999) || x.ad.localeCompare(y.ad, 'tr'), a: (x, y) => x.ad.replace(/^(el|er|es|et|en|ez|eş|ed)-/, '').localeCompare(y.ad.replace(/^(el|er|es|et|en|ez|eş|ed)-/, ''), 'tr'), m: (x, y) => x.muellif.localeCompare(y.muellif, 'tr') }[sira];
    L = L.slice().sort(cmp);
    $('#rafDn').innerHTML = R.donemler.map(([k, ad]) => { const n = L.filter(e => e.donem === k).length; return n ? `<a href="#raf-${k}" data-d="${k}">${esc(ad)} <small>(${n})</small></a>` : ''; }).join('');
    $('#raflar').innerHTML = R.donemler.map(([k, ad, alt]) => {
      const B = L.filter(e => e.donem === k); if (!B.length) return '';
      return `<section class="donem" id="raf-${k}"><div class="d-bas"><h2>${esc(ad)}</h2><span>${esc(alt)} · ${B.length} eser</span></div><div class="raf">${B.map((e, i) => `<a class="kitap" href="#/kitap/${e.id}/${ss}/${sa}">
        <div class="kapak">${kapakSvg(e, i)}<div class="cer"></div><div class="bas" lang="ar">${esc(e.ad_ar.length > 60 ? e.ad_ar.slice(0, 58) + '…' : e.ad_ar)}</div><div class="yil">${vefatYaz(e.vefat)}</div>${e.k2.length ? '' : '<span class="rozet">alıntılar</span>'}</div>
        <span class="ad">${esc(e.ad)}</span><span class="yazar">${esc(e.muellif)}</span></a>`).join('')}</div></section>`;
    }).join('') || '<p class="raf-ozet">Aramanıza uyan eser yok. Arama kutusunu temizleyin.</p>';
  };
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
    <div class="ok-ayet"><p class="q" lang="ar" id="okQ">…</p><p class="m" id="okM"></p><a class="ref" href="#/${s}/${a}">${esc(su.tr)} ${s}:${a} · ayet sayfası</a></div>
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
