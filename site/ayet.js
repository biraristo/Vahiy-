'use strict';
/* vahiy++ — ayet ekranı: sekmeler, genel bakış kartları, suredeki yer şeridi ve tefsir masası.
   app.js içindeki ayah() iskeleti kurar ve en sonda ayetYeni()'yi çağırır; bölüm içerikleri (k2, kx) app.js'de kalır. */
const AY_SEK = [['genel', 'Genel bakış'], ['metin', 'Metin'], ['kuran', "Kur'an içinde"], ['tefsir', 'Tefsirler'], ['gelenek', 'Gelenek'], ['karsi', 'Karşılaştırma'], ['yazma', 'Yazmalar'], ['masa', 'Araştırma masam']];
const AY_MEAL = ['tz-tr.diyanet', 'tz-tr.yazir', 'tz-tr.ates', 'tz-tr.golpinarli', 'tz-tr.bulac', 'tz-tr.yildirim', 'tz-tr.vakfi', 'tz-tr.ozturk', 'tz-tr.yuksel', 'qp-13656', 'qp-13627', 'qc-210', 'qc-124', 'qc-112', 'qp-2004'];
const AY_MEAL_AD = { 'tz-tr.diyanet': 'Diyanet İşleri', 'tz-tr.yazir': 'Elmalılı Hamdi Yazır', 'tz-tr.ates': 'Süleyman Ateş', 'tz-tr.golpinarli': 'Abdülbaki Gölpınarlı', 'tz-tr.bulac': 'Ali Bulaç', 'tz-tr.yildirim': 'Suat Yıldırım', 'tz-tr.vakfi': 'Diyanet Vakfı', 'tz-tr.ozturk': 'Yaşar Nuri Öztürk', 'tz-tr.yuksel': 'Edip Yüksel', 'qp-13656': 'Diyanet (Quranpedia)', 'qp-13627': 'Türkçe meal (Quranpedia)', 'qc-210': 'Dar al-Salam', 'qc-124': 'Muslim Shahin', 'qc-112': 'Shaban Britch', 'qp-2004': 'el-Muhtasar (Türkçe)' };
const AY_TUR = { 'فعل ماضٍ': 'fiil · mâzî', 'فعل مضارع': 'fiil · muzâri', 'فعل أمر': 'fiil · emir', 'اسم': 'isim', 'حرف جر': 'harf-i cer', 'ضمير': 'zamir', 'اسم موصول': 'ism-i mevsûl', 'اسم إشارة': 'işaret ismi', 'ظرف مكان': 'zarf', 'ظرف زمان': 'zarf', 'حرف عطف': 'atıf harfi', 'حرف نفي': 'nefy harfi', 'اسم علم': 'özel isim', 'صفة': 'sıfat' };
const AY_RENK = ['#9FB4C9', '#C9B48A', '#8FB8A8', '#B9A3C9', '#C9A3A3', '#A9C29A', '#C2B59A', '#9AB8C2'];
const TM_ETIKET_RENK = { g: '#B08D35', m: '#9a5b12', n: '#1E3A5F' };
const tmNorm = t => (t || '').replace(/[ً-ْٰـ]/g, '');
/* hareke farkına aldırmayan vurgu: aranan ifadenin harfleri arasına isteğe bağlı hareke koyar */
const tmVurgu = (html, ifade) => {
  if (!ifade) return html;
  const rx = new RegExp([...tmNorm(ifade)].map(c => c === ' ' ? '\\s+' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\u064B-\\u0652\\u0670\\u0640]*'));
  return html.replace(rx, m => `<mark>${m}</mark>`);
};

function ayetYeni(s, a, A, su, S, D, MI) {
  const id = `${s}:${a}`;
  /* ---- sekmeler ---- */
  const sec = k => {
    view.querySelectorAll('.ay-sek button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.p === k)));
    view.querySelectorAll('.ay-pnl').forEach(p => { p.hidden = p.dataset.p !== k; });
    store.set('aysek', k);
    history.replaceState(null, '', `#/${s}/${a}${k === 'genel' ? '' : '/' + k}`);
    const ilk = view.querySelector(`.ay-pnl[data-p="${k}"] details.sec`);
    if (k !== 'tefsir' && ilk && !view.querySelector(`.ay-pnl[data-p="${k}"] details.sec[open]`)) ilk.open = true;
    if (k === 'tefsir') tefsirMasa(s, a, A);
  };
  const git = (k, bolum) => { sec(k); const d = bolum && $(`#${bolum}`); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else $('.ay-sek').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  view.querySelector('.ay-sek').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b) sec(b.dataset.p); });
  const ilkSek = location.hash.split('/')[3] || store.get('aysek', 'genel');
  sec(AY_SEK.some(x => x[0] === ilkSek) ? ilkSek : 'genel');
  const say = (k, t) => { const el = $(`#sk-${k}`); if (el) el.textContent = t ? ` ${t}` : ''; };
  say('metin', A.kelimeler.length);

  /* ---- suredeki yer şeridi: Corpus Coranicum bölümlerine göre renkli ---- */
  const bol = D.ayetler.map(x => (x.cc_yapi && x.cc_yapi[0] ? x.cc_yapi[0].bolum : null));
  const araliklar = []; bol.forEach((b, i) => { const L = araliklar[araliklar.length - 1]; if (L && L.b === b) L.son = i + 1; else araliklar.push({ b, bas: i + 1, son: i + 1 }); });
  const renk = {}; let ri = 0; araliklar.forEach(r => { if (!(r.b in renk)) renk[r.b] = AY_RENK[ri++ % AY_RENK.length]; });
  const n = D.ayetler.length, burada = araliklar.find(r => a >= r.bas && a <= r.son);
  $('#aySerit').style.gap = n > 120 ? '0' : '1px';
  $('#aySerit').innerHTML = D.ayetler.map((x, i) => `<a href="#/${s}/${i + 1}" title="${su.tr} ${i + 1}" style="height:${i + 1 === a ? 100 : 48 + ((i * 37) % 38)}%;background:${i + 1 === a ? 'var(--gold)' : renk[bol[i]] || 'var(--line)'}"${i + 1 === a ? ' aria-current="true"' : ''}></a>`).join('') + `<span class="mk" style="left:${((a - .5) / n * 100).toFixed(2)}%">${a}</span>`;
  $('#aySl').innerHTML = burada && burada.b != null ? `Corpus Coranicum'a göre ${burada.b}. bölüm: ${su.tr} ${burada.bas}–${burada.son} ${chain([{ r: 'Bölümleme', t: 'Corpus Coranicum sure yapısı', k: 'cc' }])}` : '';

  /* ---- konu çipleri ---- */
  load(`/data/k1/${s}.json`).then(async K1 => {
    const L = (K1.ayetler || {})[id] || {};
    const parts = [];
    if (L.ayni_bolum) { const x = L.ayni_bolum.ayetler; parts.push(`<span class="b">Bölüm · ${x[0].split(':')[1]}–${x[x.length - 1].split(':')[1]}</span>`); }
    if (L.konu && L.konu.length) { const KK = (await load('/data/k1/konular.json')).konular; L.konu.slice(0, 4).forEach(t => { const k = KK[t]; if (k) parts.push(`<span lang="ar">${esc(k.ad.replace(/\s*\[.*?\]/g, ''))}</span>`); }); }
    $('#ayCip').insertAdjacentHTML('beforeend', parts.join(''));
    const nk = (L.benzer_ifade || []).length + (L.ortak_ifade_toplam || 0) + (L.konu || []).length;
    say('kuran', nk || '');
    kartKuran(L);
  }).catch(() => {});

  /* ---- genel bakış kartları ---- */
  const G = $('#ayGenel');
  const kart = (k, baslik, sayi, ic, hedef, bolum, genis) => `<section class="ay-kart${genis ? ' genis' : ''}" data-k="${k}"><div class="ak-bas"><h3>${baslik}</h3>${sayi ? `<span class="n">${sayi}</span>` : ''}${hedef ? `<button type="button" class="ak-git" data-p="${hedef}" data-b="${bolum || ''}">Tümü</button>` : ''}</div>${ic}</section>`;
  const yer = k => `<section class="ay-kart yer" data-k="${k}"></section>`;
  G.innerHTML = ['meal', 'kelime', 'kiraat', 'tefsir', 'selef', 'kuran', 'dinler', 'yazma', 'eser', 'lit', 'gorus'].map(yer).join('');
  G.addEventListener('click', e => { const b = e.target.closest('.ak-git'); if (b) git(b.dataset.p, b.dataset.b); });
  const koy = (k, html) => { const el = G.querySelector(`[data-k="${k}"]`); if (!el) return; if (!html) { el.remove(); return; } el.outerHTML = html; };

  // Mealler
  load(`/data/meal/s/${s}.json`).then(M => {
    const L = AY_MEAL.filter(m => M.mealler[m] && M.mealler[m][a - 1]);
    const satir = m => `<li><b>${esc(AY_MEAL_AD[m] || m)}</b><span>${esc(M.mealler[m][a - 1])}</span></li>`;
    koy('meal', kart('meal', 'Mealler', L.length, `<ul class="ak-meal">${L.slice(0, 4).map(satir).join('')}</ul>${L.length > 4 ? `<details class="ak-daha"><summary>${L.length - 4} meal daha</summary><ul class="ak-meal">${L.slice(4).map(satir).join('')}</ul></details>` : ''}`));
  }).catch(() => koy('meal', ''));

  // Kelime kelime
  const KW = A.kelimeler;
  koy('kelime', kart('kelime', 'Kelime kelime', KW.length, `<table class="ak-tab"><thead><tr><th>Kelime</th><th>Okunuş</th><th>Kök</th><th>Tür</th><th>Anlam</th></tr></thead><tbody>${KW.slice(0, 7).map(w => `<tr><td class="a" lang="ar">${esc(w.ar)}</td><td>${esc(w.okunus || '')}</td><td class="a k" lang="ar">${esc(w.kok || '—')}</td><td>${esc(AY_TUR[w.tur] || (/^حرف/.test(w.tur || '') ? 'harf' : /^اسم/.test(w.tur || '') ? 'isim' : /^فعل/.test(w.tur || '') ? 'fiil' : /^ظرف/.test(w.tur || '') ? 'zarf' : w.tur || ''))}</td><td>${esc(w.tr || '')}</td></tr>`).join('')}</tbody></table>`, 'metin'));

  // Kıraat
  load(`/data/k2/q/${s}.json`).then(Q => {
    const q = Q.ayetler[id] || {}, qp = q.qp || [];
    const nOk = A.cc_kiraat?.okuyus || 0;
    if (!qp.length && !nOk) return koy('kiraat', '');
    const gr = {}; qp.forEach(x => (gr[x.kelime] ||= []).push(x));
    const kel = Object.keys(gr)[0];
    const ic = kel ? `<p class="ak-ust">Farklı okunan kelime: <span lang="ar" class="ar">${esc(kel)}</span>${Object.keys(gr).length > 1 ? ` ve ${Object.keys(gr).length - 1} kelime daha` : ''}</p><div class="ak-kir">${gr[kel].slice(0, 2).map(x => `<div><span class="a" lang="ar">${esc(x.okuyus)}</span><small lang="ar">${x.raviler.slice(0, 6).map(r => esc(r[0])).join('، ')}${x.raviler.length > 6 ? '…' : ''}</small></div>`).join('')}</div>` : '<p class="ak-ust">Kıraat farklarının ayrıntısı Metin sekmesinde.</p>';
    koy('kiraat', kart('kiraat', 'Kıraat', nOk ? `${nOk} okuyuş` : `${qp.length} kayıt`, ic, 'metin', 'kir'));
  }).catch(() => koy('kiraat', ''));

  // Tefsirler: zaman şeridi + üç alıntı
  tmVeri(s, a).then(T => {
    say('tefsir', T.W.length || '');
    if (!T.W.length) return koy('tefsir', '');
    const sec3 = [];
    const ilk = T.W.find(x => x.metin), orta = T.W.find(x => x.metin && x.e.vefat >= 500 && x.e.vefat < 950 && x !== ilk), tr = T.W.find(x => x.metin && x.e.dil === 'tr');
    [ilk, orta, tr || [...T.W].reverse().find(x => x.metin)].forEach(x => { if (x && !sec3.includes(x)) sec3.push(x); });
    koy('tefsir', kart('tefsir', 'Tefsirler', `${T.W.length} eser`, `<p class="ak-ust">On dört asır boyunca bu ayet: her nokta bir tefsir, müellifin vefat yılına göre</p><svg class="tm-serit" data-mini="1"></svg><div class="ak-tef">${sec3.map(x => `<div><b>${esc(x.tr.muellif || x.e.muellif)}</b><small>${x.e.vefat ? 'ö. ' + x.e.vefat : 'çağdaş'} · ${esc(x.tr.ad || x.e.ad)}</small><p class="${x.e.dil === 'tr' ? '' : 'ar'}" dir="${x.e.dil === 'tr' ? 'ltr' : 'rtl'}" lang="${x.e.dil === 'tr' ? 'tr' : 'ar'}">${esc(tmKisa(x.metin, 170))}</p></div>`).join('')}</div>`, 'tefsir', '', true));
    tmSerit(G.querySelector('.tm-serit'), T.W, null, null);
  }).catch(() => koy('tefsir', ''));

  // Kur'an içi (k1 yüklenince)
  function kartKuran(L) {
    const o = L.ortak_ifade || [], b = L.benzer_ifade || [];
    if (!o.length && !b.length && !L.ayni_bolum) return koy('kuran', '');
    const al = x => `<a href="#/${x.replace(':', '/')}">${x}</a>`;
    koy('kuran', kart('kuran', "Kur'an içi bağlar", (L.ortak_ifade_toplam || 0) + b.length + (L.konu || []).length || '', `${b.slice(0, 2).map(g => `<div class="ak-ort"><span lang="ar">${esc(g.not)}</span><p>${g.ayetler.slice(0, 6).map(al).join('')}</p></div>`).join('')}${o.slice(0, 2).map(g => `<div class="ak-ort"><span lang="ar">${esc(g.ifade)}</span><p>${g.ayetler.slice(0, 6).map(al).join('')}</p></div>`).join('')}${L.ayni_bolum ? `<p class="ak-ust">Aynı bölüm: ${L.ayni_bolum.ayetler.length} ayet</p>` : ''}`, 'kuran'));
  }

  // x paketi: selef rivayetleri, eserlerde geçtiği yerler, görüşler
  loadGz(`/data/x/${s}/${a}.json.gz`).then(b => {
    if (b.k4.length) koy('selef', kart('selef', 'Selef rivayetleri', b.k4.length, b.k4.slice(0, 2).map(x => `<blockquote lang="ar" dir="rtl">${esc(tmKisa(x.metin, 200))}</blockquote>${x.tahric ? `<p class="ak-kay" lang="ar" dir="rtl">${esc(tmKisa(x.tahric.replace(/[١٢٣٤٥٦٧٨٩٠]+(?=[^\s])/, ''), 70))}</p>` : ''}`).join(''), 'gelenek', 'riv4'));
    else koy('selef', '');
    const AD = { tefsir: 'Tefsir', ulum: "Kur'an ilimleri", dil: 'Dil ve lügat', cagdas: 'Çağdaş', tarih: 'Tarih', hadis: 'Hadis', fikih: 'Fıkıh', kelam: 'Kelâm', tasavvuf: 'Tasavvuf' };
    const E = Object.entries(b.k3).map(([k, v]) => [k, v.length]).filter(x => x[1]).sort((p, q) => q[1] - p[1]);
    const top = E.reduce((t, x) => t + x[1], 0), mx = E[0]?.[1] || 1;
    say('gelenek', top + b.k4.length || '');
    if (E.length) koy('eser', kart('eser', 'Eserlerde geçtiği yerler', top, E.map(([k, v]) => `<div class="ak-bar"><span>${AD[k] || k}</span><b>${v}</b><i style="--w:${(v / mx * 100).toFixed(0)}%"></i></div>`).join(''), 'gelenek', 'hds'));
    else koy('eser', '');
    const ih = b.k7.ihtilaf, nt = b.notlar, fv = b.k7.fetva;
    if (ih.length || nt.length || fv.length) koy('gorus', kart('gorus', 'Görüşler ve notlar', '', `<div class="ak-oz"><div><b>${ih.length}</b><span>ihtilaf kaydı</span></div><div><b>${nt.length}</b><span>tedebbür notu</span></div><div><b>${fv.length}</b><span>fetva</span></div></div>${ih[0] ? `<blockquote lang="ar" dir="rtl">${esc(tmKisa(ih[0][4], 180))}</blockquote>` : ''}`, 'gelenek', 'iht'));
    else koy('gorus', '');
  }).catch(() => ['selef', 'eser', 'gorus'].forEach(k => koy(k, '')));

  // Dinler tarihi
  Promise.all([load(`/data/k6/${s}.json`), load('/data/kutuphane/dinler.json')]).then(([K, R]) => {
    const L = K.ayetler[id] || []; say('karsi', L.length || '');
    if (!L.length) return koy('dinler', '');
    const DM = {}; R.metinler.forEach(e => { DM[e.id] = e; });
    koy('dinler', kart('dinler', 'Dinler tarihi', `${L.length} metin`, `<ul class="ak-lis">${L.slice(0, 4).map(x => { const e = DM[x.id] || {}; return `<li><a href="#/metin/${x.id}">${esc(e.ad || x.baslik)}</a><small>${esc([e.dil || x.dil, e.tarih || x.tarih].filter(Boolean).join(' · '))}</small></li>`; }).join('')}</ul>`, 'karsi', 'krs'));
  }).catch(() => koy('dinler', ''));

  // El yazmaları
  Promise.all([load(`/data/k6/y/${s}.json`), load('/data/k6/yazma.json')]).then(([Y, R]) => {
    const L = Y.ayetler[id] || []; const ids = [...new Set(L.map(x => x[0]))];
    say('yazma', ids.length || '');
    if (!ids.length) return koy('yazma', '');
    const yil = t => parseInt(String(t || '').replace(/^-/, '')) || 9999;
    const sec4 = ids.filter(m => R.nushalar[m]?.tarih).sort((x, y) => yil(R.nushalar[x].tarih) - yil(R.nushalar[y].tarih)).slice(0, 4);
    const yaprak = m => L.find(x => x[0] === m)?.[1] || '';
    koy('yazma', kart('yazma', 'El yazmaları', `${ids.length} nüsha`, `<div class="ak-yz">${sec4.map(m => { const nn = R.nushalar[m]; return `<a href="https://corpuscoranicum.de/de/manuscript/${m}" target="_blank" rel="noopener"><span class="yp">${esc(yaprak(m))}</span><b>${esc(nn.ad.replace(/\s*\(.*?\)/g, '').slice(0, 70))}</b><small>${esc(String(nn.tarih).replace(/^-/, '… '))}${nn.yazi ? ' · ' + esc(nn.yazi) : ''}</small></a>`; }).join('')}</div>`, 'yazma', 'yzm'));
  }).catch(() => koy('yazma', ''));

  // Akademik literatür
  load(`/data/k8/${s}.json`).then(K => {
    const ay = K.ayet[id] || [], L = [...ay, ...K.sure.filter(x => !ay.includes(x))].slice(0, 4);
    if (!L.length) return koy('lit', '');
    koy('lit', kart('lit', 'Akademik literatür', `${ay.length} + ${K.sure.length}`, `<ul class="ak-lis">${L.map(i => { const m = K.makale[i]; return `<li><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title.split(' / ')[0])}</a><small>${esc((m.authors || '').split(',')[0])}${m.year ? ' · ' + m.year : ''} · ${ay.includes(i) ? 'bu ayet' : 'sure'}</small></li>`; }).join('')}</ul>`, 'karsi', 'lit'));
  }).catch(() => koy('lit', ''));
}

/* ---------------- Tefsir masası ---------------- */
const tmKisa = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };
const TM = {};
/* Bu ayetteki tefsir eserleri: k2 dizini + pasajlar + Türkçe künye (tefsir rafı) */
async function tmVeri(s, a) {
  const key = `${s}:${a}`; if (TM[key]) return TM[key];
  const [E, I, P, R] = await Promise.all([load('/data/k2/eserler.json'), load(`/data/k2/i/${s}.json`), loadGz(`/data/k2/t/${s}/${a}.json.gz`), load('/data/kutuphane/tefsir.json')]);
  const tr = {}; R.eserler.forEach(e => e.k2.forEach(r => { tr[r] = e; }));
  const byW = {}; P.p.forEach(r => (byW[r[0]] ||= []).push(r));
  const W = (I.ayetler[key] || []).map(([w]) => ({ w, e: E.eserler[w], tr: tr[w] || {} }))
    .filter(x => x.e && x.e.tur === 'tefsir' && ['ar', 'tr'].includes(x.e.dil || 'ar'))
    .map(x => { const rows = byW[x.w] || []; const r0 = rows.find(r => typeof r[3] === 'string'); return { ...x, rows, metin: r0 ? r0[3] : '', ortak: rows.length && !r0 ? rows[0][3].ref : '' }; })
    .sort((p, q) => (p.e.vefat || 9999) - (q.e.vefat || 9999));
  /* aynı eserin birden çok dijital nüshası: metni olanı tut, ötekinin sayfalarını ona ekle */
  const tek = new Map();
  W.forEach(x => { const k = x.tr.id || `${x.e.muellif}|${x.e.ad}`; const o = tek.get(k); if (!o) tek.set(k, x); else if (!o.metin && x.metin) { x.rows = [...x.rows, ...o.rows]; tek.set(k, x); } });
  return (TM[key] = { W: [...tek.values()] });
}

/* zaman şeridi: secili = vurgulanan eser kümesi (Map w→renk), aktif = seçili eser */
function tmSerit(svg, W, secili, aktif, tikla) {
  if (!svg) return;
  const Wd = svg.getBoundingClientRect().width || 600, dar = Wd < 520, H = dar ? 70 : 78;
  svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${Wd} ${H}`);
  const x = y => 12 + (y - 60) / (1460 - 60) * (Wd - 24);
  let h = `<line x1="${x(60)}" x2="${x(1460)}" y1="${H - 22}" y2="${H - 22}" stroke="var(--line)"/>`;
  for (let y = 100; y <= 1400; y += 100) if (!dar || y % 200 === 0) h += `<text x="${x(y)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--muted)">${y}</text>`;
  const st = {}, adim = dar ? 40 : 14;
  W.forEach(o => {
    const y = o.e.vefat || 1445, k = Math.round(y / adim); st[k] = (st[k] || 0) + 1;
    const cy = H - 28 - (st[k] - 1) * (dar ? 7 : 8);
    const renk = o.w === aktif ? 'var(--lapis)' : secili ? (secili.get(o.w) || 'var(--line)') : 'var(--gold)';
    h += `<circle data-w="${esc(o.w)}" cx="${x(y)}" cy="${cy}" r="${o.w === aktif ? 6 : dar ? 3.4 : 4}" fill="${renk}"${o.w === aktif ? ' stroke="var(--sheet)" stroke-width="2"' : ''}><title>${esc((o.tr.muellif || o.e.muellif || '') + (o.e.vefat ? ' · ö. ' + o.e.vefat : ''))}</title></circle>`;
  });
  svg.innerHTML = h;
  if (tikla) svg.onclick = e => { const c = e.target.closest('circle[data-w]'); if (c) tikla(c.dataset.w); };
}

async function tefsirMasa(s, a, A) {
  const kutu = $('#tefMasa'); if (!kutu || kutu.dataset.kuruldu) return; kutu.dataset.kuruldu = '1';
  const [T, K9] = await Promise.all([tmVeri(s, a), load('/data/k9/index.json').then(I => I.sureler.includes(s) ? load(`/data/k9/${s}.json`) : { ayetler: {} }).catch(() => ({ ayetler: {} }))]);
  const W = T.W; const MES = (K9.ayetler || {})[`${s}:${a}`] || [];
  if (!W.length) { kutu.innerHTML = '<p class="srcs">Bu ayet için ayet ayet bölünmüş tefsir pasajı yok. Aşağıda diğer eserlerdeki alıntılara bakın.</p>'; return; }
  const DON = [['', 'Tümü'], ['erken', 'Erken'], ['klasik', 'Klasik'], ['orta', 'Orta'], ['osmanli', 'Osmanlı'], ['modern', 'Modern']];
  let sayfa = 30, mes = -1, don = '', dil = '', aktif = W.find(x => x.metin)?.w, pin = [];
  kutu.innerHTML = `
    ${MES.length ? `<h3 class="tm-h">Bu ayette tefsirlerin üzerinde durduğu meseleler</h3><div class="tm-mes" id="tmMes"></div><p class="tm-ip">Meseleler tefsir pasajları okunarak çıkarıldı; görüş etiketleri ve Türkçe özetler makine çalışmasıdır, Arapça metinden kontrol edin.</p>` : ''}
    <div class="tm-serit-k"><div class="tm-sb"><span id="tmSay"></span><div class="tm-lej" id="tmLej"></div></div><svg class="tm-serit" id="tmSerit"></svg></div>
    <div class="tm-arac" id="tmArac"></div>
    <div class="tm-ana"><div class="tm-seyir" id="tmSeyir"></div><aside class="tm-oku" id="tmOku"></aside></div>
    <div class="tm-kars" id="tmKars" hidden></div>`;
  const etiketAd = (m, e) => (m.etiketler || {})[e] || e;
  const liste = () => {
    if (mes >= 0) { const M = MES[mes]; return M.eserler.map(m => ({ ...W.find(x => x.w === m.w), m })).filter(x => x.w && x.e); }
    return W.filter(x => (!don || x.e.donem === don) && (!dil || (x.e.dil || 'ar') === dil));
  };
  const ciz = () => {
    if (MES.length) $('#tmMes').innerHTML = MES.map((M, i) => `<button type="button" data-i="${i}" aria-pressed="${mes === i}">${esc(M.ad)}<small>${M.eserler.length} tefsir · ${esc(M.alt || '')}</small></button>`).join('') + `<button type="button" data-i="-1" aria-pressed="${mes < 0}">Tüm tefsirler<small>${W.length} · tarihe göre</small></button>`;
    const L = liste();
    const secili = mes >= 0 ? new Map(L.map(x => [x.w, TM_ETIKET_RENK[x.m.e] || 'var(--gold)'])) : new Map(L.map(x => [x.w, 'var(--gold)']));
    $('#tmSay').innerHTML = mes >= 0 ? `<b>${L.length} / ${W.length}</b> tefsir bu meseleye değiniyor` : `<b>${L.length}</b> tefsir, müellifin vefat yılına göre`;
    $('#tmLej').innerHTML = mes >= 0 ? Object.entries(MES[mes].etiketler || {}).map(([k, v]) => `<span style="--c:${TM_ETIKET_RENK[k]}">${esc(v)}</span>`).join('') + '<span style="--c:var(--line)">değinmeyen</span>' : '';
    tmSerit($('#tmSerit'), W, secili, aktif, w => { aktif = w; ciz(); oku(); document.querySelector(`.tm-d[data-w="${CSS.escape(w)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#tmArac').innerHTML = mes >= 0 ? '' : `<div class="chips">${DON.map(([k, l]) => { const n = k ? W.filter(x => x.e.donem === k).length : W.length; return n ? `<button type="button" data-d="${k}" aria-selected="${don === k}">${l} <span>${n}</span></button>` : ''; }).join('')}${W.some(x => x.e.dil === 'tr') ? `<button type="button" data-l="tr" aria-selected="${dil === 'tr'}">Türkçe <span>${W.filter(x => x.e.dil === 'tr').length}</span></button>` : ''}</div>${pin.length ? `<button type="button" class="tm-kbtn" id="tmKb">Yan yana oku (${pin.length})</button>` : ''}`;
    if (mes >= 0 && pin.length) $('#tmArac').innerHTML = `<button type="button" class="tm-kbtn" id="tmKb">Yan yana oku (${pin.length})</button>`;
    const goster = mes >= 0 ? L : L.slice(0, sayfa);
    $('#tmSeyir').innerHTML = goster.map(x => {
      const m = x.m, tur = x.e.dil === 'tr';
      const parca = m ? tmVurgu(esc(tmCumle(x.metin, m.vurgu)), m.vurgu) : esc(tmKisa(x.metin, 230));
      return `<article class="tm-d${x.w === aktif ? ' sec' : ''}" data-w="${esc(x.w)}" style="--c:${m ? TM_ETIKET_RENK[m.e] : 'var(--gold)'}"><span class="y">${x.e.vefat ? 'ö. ' + x.e.vefat : 'çağdaş'}</span>
        <div class="h"><b>${esc(x.tr.muellif || x.e.muellif || x.e.kisa)}</b><small>${esc(x.tr.ad || x.e.ad)}</small>${m ? `<span class="r" style="--c:${TM_ETIKET_RENK[m.e]}">${esc(etiketAd(MES[mes], m.e))}</span>` : tur ? '<span class="r tr">Türkçe</span>' : ''}</div>
        ${m && m.ozet ? `<p class="oz">${esc(m.ozet)}</p>` : ''}
        ${x.metin ? `<p class="${tur ? 'tx' : 'tx ar'}" dir="${tur ? 'ltr' : 'rtl'}" lang="${tur ? 'tr' : 'ar'}">${parca}</p>` : `<p class="tx bos">Bu sayfa ${esc(x.ortak)} ayetiyle ortak; okuma panelinde açılır.</p>`}
        <div class="alt"><button type="button" data-ac="oku">Oku</button><button type="button" data-ac="pin" aria-pressed="${pin.includes(x.w)}">${pin.includes(x.w) ? 'Karşılaştırmada' : 'Karşılaştırmaya ekle'}</button>${x.tr.id ? `<a href="#/kitap/${x.tr.id}/${s}/${a}">Kitapta aç</a>` : ''}</div></article>`;
    }).join('') + (goster.length < L.length ? `<button type="button" class="more tm-daha" id="tmDaha">Sonraki ${Math.min(30, L.length - goster.length)} tefsir (${L.length - goster.length} kaldı)</button>` : '') || '<p class="srcs">Bu süzgece uyan tefsir yok.</p>';
    goster.filter(x => !x.metin && x.ortak).forEach(async x => { const P = await metinAl(x); const el = document.querySelector(`.tm-d[data-w="${CSS.escape(x.w)}"] .tx.bos`); if (el && P[0]) { el.className = x.e.dil === 'tr' ? 'tx' : 'tx ar'; el.dir = x.e.dil === 'tr' ? 'ltr' : 'rtl'; el.innerHTML = `${esc(tmKisa(P[0][1], 230))} <span class="ort">${esc(x.ortak)} ile ortak sayfa</span>`; } });
  };
  const yerYaz = r => [r[1] && +r[1] ? `c. ${r[1]}` : '', r[2] ? `s. ${r[2]}` : ''].filter(Boolean).join(', ');
  const metinAl = async (x) => {
    const out = [];
    for (const r of x.rows) {
      let t = r[3];
      if (typeof t !== 'string') { try { const [ts, ta] = t.ref.split(':'); const P = await loadGz(`/data/k2/t/${ts}/${ta}.json.gz`); const m = P.p.find(y => y[0] === r[0] && y[1] === r[1] && y[2] === r[2] && typeof y[3] === 'string'); t = m ? m[3] : ''; } catch { t = ''; } }
      if (t) out.push([r, t]);
    }
    return out;
  };
  const oku = async () => {
    const x = W.find(y => y.w === aktif); if (!x) return;
    const box = $('#tmOku'); const m = mes >= 0 ? MES[mes].eserler.find(z => z.w === x.w) : null;
    const tur = x.e.dil === 'tr';
    box.innerHTML = `<div class="ob"><b>${esc(x.tr.ad || x.e.ad)}</b><small>${esc(x.tr.muellif || x.e.muellif || '')}${x.e.vefat ? ' · ö. ' + x.e.vefat : ''}</small></div><p class="durum">Yükleniyor…</p>`;
    const P = await metinAl(x);
    const ilk = P[0]?.[0];
    box.innerHTML = `<div class="ob"><b>${esc(x.tr.ad || x.e.ad)}</b><small>${esc(x.tr.muellif || x.e.muellif || '')}${x.e.vefat ? ' · ö. ' + x.e.vefat : ''}</small></div>
      <div class="od">${x.tr.id ? `<a href="#/kitap/${x.tr.id}/${s}/${a}">Kitapta aç${ilk && yerYaz(ilk) ? ' · ' + yerYaz(ilk) : ''}</a>` : ''}<button type="button" data-ac="pin">${pin.includes(x.w) ? 'Karşılaştırmada' : 'Karşılaştırmaya ekle'}</button><button type="button" data-ac="atif">Atıf ver</button></div>
      <div class="ot${tur ? '' : ' ar'}" dir="${tur ? 'ltr' : 'rtl'}" lang="${tur ? 'tr' : 'ar'}">${P.map(([r, t]) => `${yerYaz(r) ? `<span class="sy">${esc(yerYaz(r))}</span>` : ''}${esc(t).split('\n').filter(l => l.trim()).map(l => `<p>${tmVurgu(l.replace(/﴿([^﴾]{1,600})﴾/g, '<span class="ayt">﴿$1﴾</span>'), m?.vurgu)}</p>`).join('')}`).join('') || '<p>Metin bulunamadı.</p>'}</div>
      ${m && m.ozet ? `<div class="oz"><small>Türkçe özet · makine, metinden kontrol edin</small>${esc(m.ozet)}</div>` : ''}
      <p class="srcs">${esc(x.e.kaynak || '')}${x.e.nesir?.yayinevi ? ' · ' + esc(x.e.nesir.yayinevi) : ''} ${chain([{ r: 'Eser', t: `${x.e.muellif || ''}${x.e.vefat ? ` (ö. ${x.e.vefat})` : ''}, ${x.e.ad}`, u: x.w.startsWith('qp') ? qpUrl(x.w.slice(2)) : null }, { r: 'Veri', k: x.w.startsWith('qp') ? 'quranpedia' : 'qul' }, m && { r: 'Mesele ve özet', t: 'makine: tefsir pasajı okunarak', k: 'claude' }, { r: 'İşleme', b: 'k2' }])}</p>`;
    box.querySelector('[data-ac="atif"]').onclick = async ev => {
      const t = `${x.tr.muellif || x.e.muellif}${x.e.vefat ? ` (ö. ${x.e.vefat})` : ''}, ${x.tr.ad || x.e.ad}${ilk && yerYaz(ilk) ? ', ' + yerYaz(ilk) : ''}. vahiy++: ${location.origin}/#/${s}/${a}/tefsir`;
      try { await navigator.clipboard.writeText(t); } catch { /* yok */ } ev.target.textContent = 'Kopyalandı';
    };
    box.querySelector('[data-ac="pin"]').onclick = () => { pinle(x.w); oku(); };
  };
  const pinle = w => { pin = pin.includes(w) ? pin.filter(y => y !== w) : [...pin, w].slice(-3); ciz(); };
  const kars = async () => {
    const box = $('#tmKars'); box.hidden = false; kutu.querySelector('.tm-ana').hidden = true;
    const L = pin.map(w => W.find(x => x.w === w));
    box.innerHTML = `<div class="tk-bas"><b>Yan yana okuma</b><button type="button" id="tkKapat">Listeye dön</button></div><div class="tk-kol" style="--n:${L.length}">${L.map(x => `<section data-w="${esc(x.w)}"><div class="ob"><b>${esc(x.tr.muellif || x.e.muellif)}</b><small>${x.e.vefat ? 'ö. ' + x.e.vefat + ' · ' : ''}${esc(x.tr.ad || x.e.ad)}</small></div><div class="ot ar" dir="${x.e.dil === 'tr' ? 'ltr' : 'rtl'}">Yükleniyor…</div></section>`).join('')}</div>`;
    $('#tkKapat').onclick = () => { box.hidden = true; kutu.querySelector('.tm-ana').hidden = false; };
    for (const x of L) { const P = await metinAl(x); box.querySelector(`section[data-w="${CSS.escape(x.w)}"] .ot`).innerHTML = P.map(([r, t]) => `${yerYaz(r) ? `<span class="sy">${esc(yerYaz(r))}</span>` : ''}${esc(t).split('\n').filter(l => l.trim()).map(l => `<p>${l.replace(/﴿([^﴾]{1,600})﴾/g, '<span class="ayt">﴿$1﴾</span>')}</p>`).join('')}`).join(''); }
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  kutu.addEventListener('click', e => {
    const mb = e.target.closest('#tmMes button'); if (mb) { mes = +mb.dataset.i; if (mes >= 0) aktif = MES[mes].eserler[0].w; ciz(); oku(); return; }
    const db = e.target.closest('#tmArac button[data-d]'); if (db) { don = db.dataset.d; sayfa = 30; ciz(); return; }
    const lb = e.target.closest('#tmArac button[data-l]'); if (lb) { dil = dil ? '' : 'tr'; ciz(); return; }
    if (e.target.closest('#tmKb')) { kars(); return; }
    if (e.target.closest('#tmDaha')) { sayfa += 30; ciz(); return; }
    const d = e.target.closest('.tm-d'); if (!d) return;
    const ac = e.target.closest('[data-ac]')?.dataset.ac;
    if (ac === 'pin') { pinle(d.dataset.w); return; }
    if (e.target.closest('a')) return;
    aktif = d.dataset.w; ciz(); oku();
    if (matchMedia('(max-width: 900px)').matches) $('#tmOku').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  ciz(); oku();
  addEventListener('resize', () => { if (document.body.contains(kutu)) tmSerit($('#tmSerit'), W, mes >= 0 ? new Map(liste().map(x => [x.w, TM_ETIKET_RENK[x.m.e]])) : new Map(liste().map(x => [x.w, 'var(--gold)'])), aktif); }, { passive: true });
}
/* vurgulanacak ifadenin bulunduğu cümleyi (yoksa baştan) kısaltarak al */
function tmCumle(t, ifade) {
  t = String(t || '').replace(/\s+/g, ' ');
  if (ifade) { const n = tmNorm(t), i = n.indexOf(tmNorm(ifade).split(' ')[0]); if (i > 0) {
    // harekeli metinde aynı konumu bul: normalize edilmiş indeksten geriye say
    let k = 0, j = 0; while (j < t.length && k < i) { if (!/[ً-ْٰـ]/.test(t[j])) k++; j++; }
    const bas = Math.max(0, t.lastIndexOf(' ', Math.max(0, j - 90)));
    return (bas > 0 ? '… ' : '') + tmKisa(t.slice(bas), 320);
  } }
  return tmKisa(t, 260);
}
