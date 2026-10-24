'use strict';
/* vahiy++ — statik istemci. Bütün veri /data altındaki hazır JSON dosyalarından okunur; sunucuda hesap yapılmaz. */
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const cache = {};
const load = (p) => (cache[p] ||= fetch(p).then(r => { if (!r.ok) throw new Error(`${p} yüklenemedi (${r.status})`); return r.json(); }));
const loadGz = (p) => (cache[p] ||= fetch(p).then(async r => {
  if (!r.ok) throw new Error(`${p} yüklenemedi (${r.status})`);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] !== 0x1f || buf[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(buf));
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
}));
/* R2 paketinden tek gzip üyesini Range ile çek (kitap/ ve atif/ .bin biçimi) */
const rangeGz = (key, o) => (cache[key + '@' + o[0]] ||= fetch(`/r2/${key}`, { headers: { Range: `bytes=${o[0]}-${o[0] + o[1] - 1}` } }).then(async r => {
  if (!r.ok && r.status !== 206) throw new Error(`${key} yüklenemedi (${r.status})`);
  return new Response(new Blob([await r.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
}));
const atifOfs = () => load('/data/y/ofs.json');
/* ---- Kaynak zinciri (veri isnadı) ---- */
const REPO_URL = 'https://github.com/biraristo/Vahiy-/blob/main/';
const kaynaklar = () => load('/data/kaynaklar.json');
const oiUrl = ref => { const m = /^(\d{4})([^.]+)\.([^.]+)/.exec(ref || ''); if (!m) return null; const blk = String(Math.ceil(Math.max(+m[1], 1) / 25) * 25).padStart(4, '0') + 'AH'; const au = m[1] + m[2]; return `https://github.com/OpenITI/${blk}/tree/master/data/${au}/${au}.${m[3]}`; };
const qpUrl = id => `https://quranpedia.net/book/${id}`;
const pv = (v, p) => +v || +p ? `PageV${String(+v || 1).padStart(2, '0')}P${String(+p || 0).padStart(3, '0')}` : '';
const KAYNAK_ACIK = false; /* kullanıcı kararı (24.10.2026 22:04): 🔗 kaynak zinciri site genelinde gizli */
function chain(items) {
  if (!KAYNAK_ACIK) return '';
  return `<details class="chain"><summary title="Kaynak zinciri" aria-label="Bu bilginin kaynak zinciri">🔗</summary><ol>${items.filter(Boolean).map(i => `<li${i.k ? ` data-k="${i.k}"` : ''}${i.b ? ` data-b="${i.b}"` : ''}><span class="cr">${esc(i.r)}</span> ${i.u ? `<a href="${esc(i.u)}" target="_blank" rel="noopener">${esc(i.t || i.u)}</a>` : esc(i.t || '')}</li>`).join('')}</ol></details>`;
}
document.addEventListener('toggle', async e => {
  const d = e.target;
  if (!d.classList?.contains('chain') || !d.open || d.dataset.f) return;
  d.dataset.f = '1';
  const K = await kaynaklar().catch(() => null); if (!K) return;
  d.querySelectorAll('li[data-k]').forEach(li => { const x = K.kaynaklar[li.dataset.k]; if (!x) return; li.insertAdjacentHTML('beforeend', ` <b>${esc(x.ad)}</b>${x.kurum ? ' — ' + esc(x.kurum) : ''}${x.surum ? ` · sürüm ${esc(x.surum)}` : ''}${x.doi ? ` · doi:${esc(x.doi)}` : ''}${x.url ? ` · <a href="${esc(x.url)}" target="_blank" rel="noopener">site</a>` : ''}${x.ham ? ` · <a href="${esc(x.ham)}" target="_blank" rel="noopener">ham kopya</a>` : ''}${x.lisans ? ` · <span class="lic">${esc(x.lisans)}</span>` : ''}${x.not ? `<br><span class="lic">${esc(x.not)}</span>` : ''}`); });
  d.querySelectorAll('li[data-b]').forEach(li => { li.dataset.b.split(',').forEach(b => { const p = K.betikler[b]; if (p) li.insertAdjacentHTML('beforeend', ` <a href="${REPO_URL + p}" target="_blank" rel="noopener">${esc(p.split('/').pop())}</a>`); }); });
}, true);
const fmt = n => Number(n).toLocaleString('tr-TR');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* yok */ } } };

const RAVI = { 'ورش': 'Verş', 'قالون': 'Kālûn', 'البزي': 'Bezzî', 'قنبل': 'Kunbul', 'الدوري': 'Dûrî', 'السوسي': 'Sûsî', 'شعبة': "Şu'be", 'حفص': 'Hafs' };
const SAYIM = { 'الكوفي': 'Kûfî', 'المدني الأول': 'Medenî-i evvel', 'المدني الأخير': 'Medenî-i âhir', 'المكي': 'Mekkî', 'البصري': 'Basrî', 'الشامي': 'Şâmî' };
const LAYERS = [
  ['Kur\'an iskeleti', true], ['Kur\'an içi ağ', true], ['Ayet ayet kaynaklar (tefsir, kıraat, esbâb)', true], ['Külliyat alıntı indeksi', true],
  ['Aktarım, hadis, ricâl', true], ['Kavramlar', true], ['Karşılaştırmalı metinler', true], ['Görüş ve ihtilaf', true], ['Literatür ve masa', true],
];
const LATER = [];
const KARI = [['Alafasy_128kbps', 'Mişârî el-Afâsî (Hafs)'], ['Husary_128kbps', 'Mahmûd Halîl el-Husarî (Hafs)'], ['Minshawy_Murattal_128kbps', 'Muhammed Sıddîk el-Minşâvî (Hafs)'], ['Abdul_Basit_Murattal_192kbps', 'Abdülbâsıt Abdüssamed (Hafs)'], ['Abdurrahmaan_As-Sudais_192kbps', 'Abdurrahman es-Sudeys (Hafs)'], ['warsh/warsh_ibrahim_aldosary_128kbps', 'İbrâhîm ed-Devserî (Verş)']];

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach(a => a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}
async function meta() {
  const m = await load('/data/k0/surahs.json');
  if (!m._off) { let o = 0; m._off = m.sureler.map(s => { const v = o; o += s.ayet; return v; }); }
  return m;
}
const surahOptions = (S, sel) => S.sureler.map(s => `<option value="${s.n}"${s.n === sel ? ' selected' : ''}>${s.n}. ${esc(s.tr)} — ${esc(s.ar)}</option>`).join('');

/* Açılış sayfası home.js içindedir. */

/* ---------------- Ayet sayfası ---------------- */
async function ayah(s, a) {
  setNav('');
  const S = await meta();
  const su = S.sureler[s - 1];
  if (!su || a < 1 || a > su.ayet) { view.innerHTML = '<h1>Böyle bir ayet yok</h1><p><a href="#/">Sure ve ayet seçimine dön</a></p>'; return; }
  store.set('son', `${s}:${a}`);
  view.innerHTML = '<p class="lede">Ayet yükleniyor…</p>';
  const [D, MI] = await Promise.all([load(`/data/k0/s/${s}.json`), load('/data/meal/index.json')]);
  const A = D.ayetler[a - 1];
  const prev = a > 1 ? [s, a - 1] : (s > 1 ? [s - 1, S.sureler[s - 2].ayet] : null);
  const next = a < su.ayet ? [s, a + 1] : (s < 114 ? [s + 1, 1] : null);
  const mealId = store.get('meal', MI.varsayilan);
  const groups = {};
  MI.mealler.forEach(m => (groups[m.dil || 'Diğer'] ||= []).push(m));
  const mealOpts = Object.entries(groups).map(([d, ms]) => `<optgroup label="${esc(d)} (${ms.length})">${ms.map(m => `<option value="${m.id}"${m.id === mealId ? ' selected' : ''}>${esc(m.ad)}${m.mutercim && m.mutercim !== m.ad ? ' — ' + esc(m.mutercim) : ''}${m.eksik_ayet ? ` (${m.eksik_ayet} ayet eksik)` : ''}</option>`).join('')}</optgroup>`).join('');
  const k = A.konum;
  const t = su.tertip;
  const ihtilaf = su.ihtilaf || {};
  const sayim = A.sayim_farki || [];

  const sec = (id, t, d, open) => `<details class="sec" id="${id}"${open ? ' open' : ''}><summary><span class="t">${t}</span><span class="d" id="${id}d">${d}</span></summary><div class="body" id="${id}body">Açınca yüklenir.</div></details>`;
  const ok = (p, yon) => p ? `<a class="a3-ok" href="#/${p[0]}/${p[1]}" aria-label="${yon === 'p' ? 'Önceki' : 'Sonraki'} ayet: ${esc(S.sureler[p[0] - 1].tr)} ${p[1]}">${yon === 'p' ? '‹' : ''}<span>${p[0] === s ? p[1] : `${esc(S.sureler[p[0] - 1].tr)} ${p[1]}`}</span>${yon === 'n' ? '›' : ''}</a>` : '<span class="a3-ok bos"></span>';
  view.innerHTML = `<div class="ay3">
  <header class="a3-bas">${ok(prev, 'p')}<h1><a href="#/sure/${s}">${esc(su.tr)}</a> ${a}<small lang="ar">${esc(su.ar)}</small></h1>${ok(next, 'n')}</header>
  <p class="verse" lang="ar" id="ayMetin">${ayetKelimeli(A)} <span class="no">﴿${a.toLocaleString('ar-EG')}﴾</span></p>
  <div class="a3-kel" id="a3Kel" hidden></div>
  <div class="audio-row a3-til"><select id="kari" aria-label="Kâri">${KARI.map(([k, n]) => `<option value="${k}"${k === store.get('kari', KARI[0][0]) ? ' selected' : ''}>${n}</option>`).join('')}</select><audio id="aud" controls preload="none" src="https://everyayah.com/data/${store.get('kari', KARI[0][0])}/${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}.mp3"></audio></div>
  <div class="a3-meal"><div class="meal-row"><select id="msel" aria-label="Meal">${mealOpts}</select><span class="src" id="msrc"></span></div>
    <p class="meal" id="mtext">…</p><div id="a3Mealler"></div></div>
  <section class="a3-sure" aria-label="Ayet fihristi"><div class="a3-h"><h2>Ayet fihristi</h2><span id="a3SureNot"></span></div><div class="a3-serit" id="aySerit"></div></section>
  <section class="a3-blok" id="b-tefsir"><div class="a3-h"><h2>Tefsirler</h2><span id="b-tefsir-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-esbab"><div class="a3-h"><h2>Esbâb-ı nüzûl ve nâsih-mensûh</h2><span id="b-esbab-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-selef"><div class="a3-h"><h2>Selef rivayetleri</h2><span id="b-selef-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-hadis"><div class="a3-h"><h2>Hadis kitapları</h2><span id="b-hadis-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-dil"><div class="a3-h"><h2>Dil, edebiyat ve Kur'an ilimleri</h2><span id="b-dil-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-fikih"><div class="a3-h"><h2>Fıkıh, usûl ve fetvalar</h2><span id="b-fikih-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-kelam"><div class="a3-h"><h2>Kelâm, tasavvuf ve tarih</h2><span id="b-kelam-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-cagdas"><div class="a3-h"><h2>Çağdaş ve diğer eserler</h2><span id="b-cagdas-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-dinler"><div class="a3-h"><h2>Dinler tarihi</h2><span id="b-dinler-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-yazma"><div class="a3-h"><h2>El yazmaları</h2><span id="b-yazma-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok" id="b-literatur"><div class="a3-h"><h2>Akademik literatür</h2><span id="b-literatur-n"></span></div><div class="zc-govde">Yükleniyor…</div></section>
  <section class="a3-blok a3-masa" id="b-masa"><div class="a3-h"><h2>Araştırma masam</h2><span>Notlarınız yalnızca bu tarayıcıda saklanır</span></div><div id="a3Masa"></div></section>
  <div hidden>${sec('riv', '', '')}${sec('kvr', '', '')}${sec('iht', '', '')}${sec('krs', '', '')}${sec('lit', '', '')}${sec('yzm', '', '')}${sec('masa', '', '')}    <details class="sec">
      <summary><span class="t">Kelimeler</span><span class="d">${A.kelimeler.length} kelime · kök ve i'râb</span></summary>
      <div class="body">
        <div class="words" role="group" aria-label="Kelimeler">${A.kelimeler.map((w, i) => `<button type="button" class="w" data-i="${i}" aria-pressed="false"><span class="a" lang="ar">${esc(w.ar)}</span><span class="m">${esc(w.tr || '')}</span></button>`).join('')}</div>
        <div class="wdetail" id="wd" hidden></div>
        <details class="work" id="sxd"><summary><span class="who">Cümle çözümlemesi</span><span class="tag">Quranic Treebank</span></summary><div class="pgs" id="sxb">Yükleniyor…</div></details>
      </div>
    </details>
    ${sec('kir', 'Kıraat', A.cc_kiraat && A.cc_kiraat.okuyus ? `${A.cc_kiraat.okuyus} okuyuş (Corpus Coranicum)` : 'Katman 2')}
${sec('k1', '', '')}${sec('irb', '', '')}${sec('tef', '', '')}${sec('esb', '', '')}${sec('riv4', '', '')}${sec('hds', '', '')}${sec('fkh', '', '')}${sec('klm', '', '')}${sec('dil', '', '')}${sec('cgd', '', '')}</div>
  <p class="srcs ay-veri">Veri sürümü: ${esc(D.version)} ${chain([{ r: 'Metin', t: 'Hafs ʿan ʿÂsım, Medine mushafı imlâsı', k: 'tanzil' }, { r: 'Karşılaştırma', t: 'Quranpedia Hafs mushafı ile harf iskeleti düzeyinde %100 aynı', k: 'quranpedia' }, { r: 'Ses', t: 'EveryAyah.com ayet ayet kayıtlar', u: 'https://everyayah.com' }])}</p>
  </div>`;


  const ctx = (arr) => {
    const item = (p, label) => p ? `<a href="#/${p[0]}/${p[1]}">${label}: ${esc(S.sureler[p[0] - 1].tr)} ${p[0]}:${p[1]}</a><p>${esc((arr[S._off[p[0] - 1] + p[1] - 1] || '').slice(0, 140))}…</p>` : '';
    if ($('#ctx')) $('#ctx').innerHTML = `<h3>Ayetin bağlamı</h3>${item(prev, 'Önceki')}${item(next, 'Sonraki')}`;
  };
  const showMeal = async (id) => {
    const m = MI.mealler.find(x => x.id === id) || MI.mealler[0];
    $('#msrc').innerHTML = `${esc(m.kaynak)}${m.diger_kaynaklar.length ? ' (+' + esc(m.diger_kaynaklar.join(', ')) + ')' : ''} ${chain([{ r: 'Meal', t: `${m.ad}${m.mutercim ? ' — ' + m.mutercim : ''}` }, { r: 'Veri', k: { Tanzil: 'tanzil', 'Quran.com': 'qurancom', Quranpedia: 'quranpedia' }[m.kaynak] || '' }, m.lisans && { r: 'Lisans', t: m.lisans }, { r: 'İşleme', t: 'tekrarlar ayıklandı:', b: 'meal' }])}`;
    $('#mtext').textContent = '…';
    try {
      const arr = await load(`/data/meal/${m.id}.json`);
      const tx = arr[S._off[s - 1] + a - 1] || '(Bu mealin kaynağında bu ayet boş geliyor.)';
      $('#mtext').textContent = tx;
      $('#mtext').dir = /[؀-ۿ]/.test(tx.slice(0, 40)) ? 'rtl' : 'ltr';
      ctx(arr);
    } catch (e) { $('#mtext').textContent = e.message; }
  };
  $('#kari').addEventListener('change', e => { store.set('kari', e.target.value); $('#aud').src = `https://everyayah.com/data/${e.target.value}/${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}.mp3`; });
  load(`/data/k6/y/${s}.json`).then(Y => { const L = Y.ayetler[`${s}:${a}`] || []; $('#yzmd').textContent = L.length ? `${new Set(L.map(x => x[0])).size} nüsha` : 'kayıt yok'; }).catch(() => { $('#yzmd').textContent = '—'; });
  $('#yzm').addEventListener('toggle', async e => {
    if (!e.target.open || e.target.dataset.done) return; e.target.dataset.done = '1';
    const [Y, R] = await Promise.all([load(`/data/k6/y/${s}.json`), load('/data/k6/yazma.json')]);
    const L = Y.ayetler[`${s}:${a}`] || [];
    const by = {}; L.forEach(([m, f, p]) => (by[m] ||= []).push([f, p]));
    const ids = Object.keys(by).sort((x, y) => (parseInt(R.nushalar[x]?.tarih) || 9999) - (parseInt(R.nushalar[y]?.tarih) || 9999));
    $('#yzmbody').innerHTML = ids.length ? `<div class="works">${ids.map(m => { const n = R.nushalar[m] || {}; return `<details class="work"><summary><span class="who">${esc(n.ad || m)}</span>${n.tarih ? `<span class="tag" dir="ltr">${esc(n.tarih)}</span>` : ''}<span class="tag" dir="ltr">${by[m].map(x => x[0]).join(', ')}</span></summary><div class="pgs"><p class="srcs" style="padding:0">${[n.kurum, n.no, n.malzeme].filter(Boolean).map(esc).join(' · ')} ${chain([{ r: 'Nüsha', t: `${n.ad} (${n.no || ''})`, u: `https://corpuscoranicum.de/de/manuscripts/${m}` }, { r: 'Yaprak', t: by[m].map(x => x[0]).join(', ') }, { r: 'Veri', k: 'cc' }, { r: 'İşleme', t: 'TEI yaprak aralıkları ayetlere açıldı:', b: 'yazma' }])}</p>${n.ozet ? `<p class="pt">${esc(n.ozet)}</p>` : ''}<p class="links">${by[m].map(([f, p]) => p ? `<a href="https://corpuscoranicum.de/de/manuscripts/${m}/page/${p}" target="_blank" rel="noopener">${esc(f)} görüntüsü</a>` : esc(f)).join(' ')}</p></div></details>`; }).join('')}</div><p class="srcs" style="padding:0">Corpus Coranicum'un Manuscripta Coranica veri tabanı: bu ayetin yer aldığı yapraklar (CC BY 4.0). Tarihler kaynağın verdiği biçimde (miladi); görüntüler kurumların izniyle CC sitesinde.</p>` : '<p class="srcs" style="padding:0">Bu ayet için kayıtlı el yazması yaprağı yok.</p>';
  });
  $('#msel').addEventListener('change', e => { store.set('meal', e.target.value); showMeal(e.target.value); });
  showMeal(mealId);

  const SX = () => load(`/data/k0/sx/${s}.json`).then(d => d.ayetler[String(a)] || []);
  const sxRows = (rows) => rows.map(([wn, wt, toks]) => toks.map((t, i) => `<tr><td>${i ? '' : wn}</td><td class="ar">${esc(t[0])}</td><td class="ar">${esc(t[1] || '')}</td><td class="ar">${esc(t[2] || '')}</td><td>${t[3] != null && t[2] ? (typeof t[3] === 'number' ? `${t[3]}. kelime <span class="ar">${esc((rows.find(r => r[0] === t[3]) || [, ''])[1])}</span>` : `ayet ${esc(t[3])}`) : ''}</td><td class="ar">${esc(t[5] || '')}</td></tr>`).join('')).join('');
  const SXHEAD = '<tr><th>Kelime</th><th>Parça</th><th>Tür</th><th>Görev</th><th>Bağlı olduğu</th><th>Öbek</th></tr>';
  $('#sxd').addEventListener('toggle', async e => {
    if (!e.target.open || e.target.dataset.done) return; e.target.dataset.done = '1';
    const rows = await SX();
    $('#sxb').innerHTML = rows.length ? `<div class="table-wrap"><table class="t"><thead>${SXHEAD}</thead><tbody>${sxRows(rows)}</tbody></table></div><p class="srcs">${chain([{ r: 'Çözümleme', t: 'The Quranic Treebank — NoorBayan, Quranic Arabic Corpus (Kais Dukes) üzerine', u: 'https://github.com/NoorBayan/Quranic' }, { r: 'Veri', k: 'quranpedia' }, { r: 'İşleme', b: 'k0' }])} Bağımlılık (i'râb) ilişkileri: her parça hangi kelimeye bağlı ve görevi ne.</p>` : '<p class="srcs">Bu ayet için çözümleme yok.</p>';
  });
  view.querySelectorAll('.w').forEach(b => b.addEventListener('click', async () => {
    view.querySelectorAll('.w').forEach(x => x.setAttribute('aria-pressed', x === b));
    const w = A.kelimeler[+b.dataset.i];
    const wd = $('#wd'); wd.hidden = false;
    wd.innerHTML = `<dl>
      <dt>Kelime</dt><dd class="ar" style="font-size:1.4rem">${esc(w.ar)}</dd>
      <dt>Okunuş</dt><dd>${esc(w.okunus || '—')}</dd>
      <dt>Türkçe</dt><dd>${esc(w.tr || '—')}</dd>
      <dt>İngilizce</dt><dd>${esc(w.en || '—')}</dd>
      <dt>Kök</dt><dd class="ar">${esc(w.kok || '—')}</dd>
      <dt>Lemma</dt><dd class="ar">${esc(w.lemma || '—')}</dd>
      <dt>Tür · i'râb</dt><dd class="ar">${esc(w.aciklama || [w.tur, w.irab].filter(Boolean).join('، '))}</dd>
    </dl><div class="occ" id="occ">${w.kok ? 'Kökün geçtiği yerler yükleniyor…' : ''}</div>
    <p class="srcs" style="margin-top:.5rem;padding:0">${chain([{ r: 'Kelime', t: `${s}:${a}:${w.n}` }, { r: 'Morfoloji', k: 'qac' }, { r: 'Kelime meali', k: 'qurancom' }, { r: 'İşleme', b: 'k0' }])} Morfoloji: Quranic Arabic Corpus${w.dogrulandi_qac ? ' (QAC elle doğrulanmış)' : ''} · Kelime meali: Quran.com</p>`;
    SX().then(rows => { const r = rows.filter(x => x[0] === w.n); if (r.length) $('#wd').insertAdjacentHTML('beforeend', `<div class="table-wrap"><table class="t"><thead>${SXHEAD}</thead><tbody>${sxRows(r).replace(/<td>\d+\. kelime <span class="ar">/g, '<td><span class="ar">')}</tbody></table></div>`); }).catch(() => {});
    if (w.kok) {
      const Z = await load('/data/k0/dizin.json');
      const occ = Z.kok[w.kok] || [];
      const ayahs = [...new Set(occ.map(x => x.split(':').slice(0, 2).join(':')))];
      $('#occ').innerHTML = `<b class="ar">${esc(w.kok)}</b> kökü Kur'an'da ${fmt(occ.length)} kez, ${fmt(ayahs.length)} ayette geçiyor: ` +
        ayahs.slice(0, 40).map(x => `<a href="#/${x.replace(':', '/')}">${x}</a>`).join('') + (ayahs.length > 40 ? ` <span class="tag">+${ayahs.length - 40}</span>` : '');
    }
  }));

  // Katman 1
  (async () => {
    const id = `${s}:${a}`;
    const L = ((await load(`/data/k1/${s}.json`)).ayetler || {})[id] || {};
    const al = (x) => `<a href="#/${x.replace(':', '/')}">${x}</a>`;
    const parts = [];
    let n = 0;
    if (L.benzer_ifade && L.benzer_ifade.length) {
      n += L.benzer_ifade.length;
      parts.push(`<h4 class="k1h">Benzer ifadeler <span class="tag v">kaynaklı · Quranpedia</span></h4><table class="t"><tbody>${L.benzer_ifade.map(g => `<tr><td class="ar" style="font-size:1.05rem;width:45%">${esc(g.not)}</td><td class="links">${g.ayetler.map(al).join(' ')}</td></tr>`).join('')}</tbody></table>`);
    }
    if (L.ortak_ifade && L.ortak_ifade.length) {
      n += L.ortak_ifade_toplam;
      parts.push(`<h4 class="k1h">Ortak ifade (lemma düzeyinde) <span class="tag">mekanik</span></h4><table class="t"><tbody>${L.ortak_ifade.map(o => `<tr><td class="ar" style="font-size:1.15rem;width:42%">${esc(o.ifade)} <span class="tag" dir="ltr">${o.uzunluk} kelime</span></td><td class="links">${o.ayetler.map(al).join(' ')}</td></tr>`).join('')}</tbody></table>${L.ortak_ifade_grup > L.ortak_ifade.length ? `<p class="srcs" style="padding:0">En uzun ${L.ortak_ifade.length} ifade gösteriliyor (toplam ${L.ortak_ifade_grup} ifade, ${L.ortak_ifade_toplam} ayet bağı).</p>` : ''}<p class="srcs" style="padding:0">Lemma düzeyinde: kelimelerin sözlük biçimleri aynı; çekim, zamir ve ilgi zamiri biçimleri farklı olabilir.</p>`);
    }
    if (L.konu && L.konu.length) {
      const K = (await load('/data/k1/konular.json')).konular;
      n += L.konu.length;
      parts.push(`<h4 class="k1h">Konular <span class="tag v">kaynaklı · Quranpedia konu dizini</span></h4><div class="topics">${L.konu.map(t => { const k = K[t]; return k ? `<details class="topic"><summary><span class="ar">${esc(k.ad)}</span>${k.ust ? ` <span class="tag ar">${esc(k.ust)}</span>` : ''} <span class="tag" dir="ltr">${k.ayetler.length} ayet</span></summary><p class="links">${k.ayetler.filter(x => x !== id).map(al).join(' ')}</p></details>` : ''; }).join('')}</div>`);
    }
    if (L.ayni_bolum) {
      parts.push(`<h4 class="k1h">Aynı bölümdeki ayetler <span class="tag v">kaynaklı · Corpus Coranicum</span></h4><p class="links">${L.ayni_bolum.ayetler.filter(x => x !== id).map(al).join(' ')}</p>`);
    }
    $('#k1d').textContent = n ? `${n} bağ · Katman 1` : 'Katman 1';
    $('#k1body').innerHTML = parts.length ? parts.join('') : '<p style="font-family:var(--sans);margin:0">Bu ayet için Katman 1 kaynaklarında bağ bulunmadı. Tefsirlerdeki ayetler arası atıflar Katman 2 ile eklenecek.</p>';
  })().catch(e => { $('#k1body').textContent = e.message; });

  $('#riv').addEventListener('toggle', async (e) => {
    if (!e.target.open || e.target.dataset.loaded) return;
    e.target.dataset.loaded = '1';
    const R = (await load(`/data/k0/r/${s}.json`))[`${s}:${a}`] || {};
    $('#rivbody').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Rivayet</th><th>Sayım</th><th>Ayet no</th><th style="text-align:right">Metin</th></tr></thead><tbody>
      <tr><td>Hafs (esas)</td><td>Kûfî</td><td>${a}</td><td class="ar">${esc(A.metin)}</td></tr>
      ${Object.entries(R).map(([r, v]) => `<tr><td>${esc(RAVI[r] || r)}${v.iskelet_farkli ? ' <span class="tag w">harf farkı</span>' : ''}</td><td>${esc(SAYIM[v.sayim] || v.sayim)}</td><td>${v.ayet_no.join(', ')}</td><td class="ar">${v.metin.map(esc).join(' <span class="tag">|</span> ')}</td></tr>`).join('')}
      </tbody></table></div><p class="srcs" style="padding:0;margin-top:.5rem">"Harf farkı": harf iskeletinde Hafs'tan ayrılan okuyuş (yazım ve hareke farkları hariç). Kaynak: Quranpedia rivayet mushafları.</p>`;
  });
  k2(s, a, A);
  kx(s, a, A);
  ayetYeni(s, a, A, su, S, D, MI);
}

/* ---------------- Katman 2: tefsir, kıraat, esbâb, i'râb, garîb ---------------- */
const SITE_DIL = ['ar', 'tr'];  // sitede gösterilen tefsir dilleri; öteki diller veride durur
const DIL = { ar: 'Arapça', tr: 'Türkçe', en: 'İngilizce', ur: 'Urduca', bn: 'Bengalce', ru: 'Rusça', id: 'Endonezce', ku: 'Kürtçe', fa: 'Farsça', sq: 'Arnavutça', fr: 'Fransızca', it: 'İtalyanca', bs: 'Boşnakça', zh: 'Çince', ja: 'Japonca', ml: 'Malayalam', tl: 'Tagalog', vi: 'Vietnamca', si: 'Seylanca', as: 'Assamca', km: 'Kmerce', es: 'İspanyolca', de: 'Almanca' };
const DONEM = [['erken', 'Erken'], ['klasik', 'Klasik'], ['orta', 'Orta'], ['osmanli', 'Osmanlı'], ['modern', 'Modern'], ['belirsiz', 'Tarihsiz']];
const TUR_SEC = { tefsir: 'tef', esbab: 'esb', nasih: 'esb', irab: 'irb', kiraat: 'kir', garib: 'irb' };
const PAGE = 8;
function k2(s, a, A) {
  const id = `${s}:${a}`;
  const meta = Promise.all([load('/data/k2/eserler.json'), load(`/data/k2/i/${s}.json`)]).then(([E, I]) => ({ E: E.eserler, list: (I.ayetler[id] || []).map(([w, n]) => ({ w, n, e: E.eserler[w] })).filter(x => x.e && SITE_DIL.includes(x.e.dil || 'ar')) }));
  const pas = () => loadGz(`/data/k2/t/${s}/${a}.json.gz`).then(d => d.p);
  const yr = e => e.vefat ? `ö. ${e.vefat}` : (e.donem === 'modern' ? 'çağdaş' : 'tarihsiz');
  const cite = r => r[1] || r[2] ? `<span class="cite">${r[1] ? `c. ${esc(r[1])}` : ''}${r[1] && r[2] ? ', ' : ''}${r[2] ? `s. ${esc(r[2])}` : ''}</span>` : '';
  const text = t => esc(t).split('\n').map(l => l.startsWith('§ ') ? `<b class="ph">${l.slice(2)}</b>` : l).filter(l => l.trim()).join('<br>');
  const resolve = async (r) => {
    const [ts, ta] = r[3].ref.split(':');
    try {
      const P = await loadGz(`/data/k2/t/${ts}/${ta}.json.gz`);
      const m = P.p.find(x => x[0] === r[0] && x[1] === r[1] && x[2] === r[2] && typeof x[3] === 'string');
      if (m) return m[3];
    } catch { /* aşağıda */ }
    return null;
  };
  const workBlock = (x, rows) => {
    const e = x.e;
    const shown = rows.length;
    return `<details class="work" data-w="${esc(x.w)}"><summary><span class="who">${esc(e.muellif || e.kisa || '—')}</span><span class="wt ar">${esc(e.ad)}</span><span class="tag" dir="ltr">${yr(e)}</span><span class="tag" dir="ltr">${shown} sayfa</span>${e.dil && e.dil !== 'ar' ? `<span class="tag v">${esc(DIL[e.dil] || e.dil)}</span>` : ''}</summary><div class="pgs" data-off="0"></div></details>`;
  };
  const fillWork = async (det, rows, e) => {
    const box = det.querySelector('.pgs');
    const off = +box.dataset.off;
    const part = rows.slice(off, off + PAGE);
    const html = [];
    for (const r of part) {
      let t = r[3], shared = '';
      if (typeof t !== 'string') { shared = r[3].ref; t = await resolve(r); }
      const dir = /[؀-ۿ]/.test((t || '').slice(0, 60)) ? 'rtl' : 'ltr';
      const wid = det.dataset.w, nn = e.nesir || {};
      const ch = chain([{ r: 'Yer', t: [r[1] && `cilt ${r[1]}`, r[2] && `sayfa ${r[2]}`].filter(Boolean).join(', ') || '—' }, shared && { r: 'Ortak sayfa', t: `asıl kayıt ${shared} ayetinde` },
        { r: 'Eser', t: `${e.muellif || ''}${e.vefat ? ` (ö. ${e.vefat})` : ''}, ${e.ad}`, u: wid.startsWith('qp') ? qpUrl(wid.slice(2)) : null },
        (nn.muhakkik || nn.yayinevi || nn.baski || nn.yil) && { r: 'Neşir', t: [nn.muhakkik && 'thk. ' + nn.muhakkik, nn.yayinevi, nn.baski && nn.baski + '. baskı', nn.yil].filter(Boolean).join(', ') },
        { r: 'Veri', k: wid.startsWith('qp') ? 'quranpedia' : 'qul' }, { r: 'İşleme', t: 'ayet ayet ayrıştırma, fihrist ayıklama:', b: 'k2,k2_temizlik' }]);
      html.push(`<div class="pg"><div class="pgh">${cite(r)}${ch}${shared ? `<span class="tag">${esc(shared)} ile ortak sayfa</span>` : ''}</div>${t ? `<p class="pt${dir === 'rtl' ? ' ar' : ''}" dir="${dir}">${text(t)}</p>` : `<p class="srcs">Bu sayfa <a href="#/${shared.replace(':', '/')}">${shared}</a> ayetinde.</p>`}</div>`);
    }
    box.querySelector('.more')?.remove();
    box.insertAdjacentHTML('beforeend', html.join(''));
    box.dataset.off = off + part.length;
    if (off + part.length < rows.length) {
      box.insertAdjacentHTML('beforeend', `<button type="button" class="more">Sonraki ${Math.min(PAGE, rows.length - off - part.length)} sayfa (${rows.length - off - part.length} kaldı)</button>`);
      box.querySelector('.more').addEventListener('click', () => fillWork(det, rows, e));
    }
    const n = e.nesir || {};
    if (off === 0) box.insertAdjacentHTML('afterbegin', `<p class="srcs nesir">${[e.muellif_tam, n.muhakkik && `thk. ${n.muhakkik}`, n.yayinevi, n.baski && `${n.baski}. baskı`, n.yil, n.cilt && `${n.cilt} cilt`].filter(Boolean).map(esc).join(' · ') || esc(e.ad)} — ${esc(e.kaynak)}</p>`);
  };
  const works = async (sec, turs) => {
    const { list } = await meta;
    const W = list.filter(x => turs.includes(x.e.tur)).sort((p, q) => (p.e.vefat || 9999) - (q.e.vefat || 9999));
    return W;
  };
  const renderWorks = async (sec, turs, withTabs) => {
    const body = $(`#${sec}body`);
    body.textContent = 'Yükleniyor…';
    const [W, P] = await Promise.all([works(sec, turs), pas()]);
    if (!W.length) { body.innerHTML = '<p class="srcs" style="padding:0">Bu ayet için bu türde eser pasajı yok.</p>'; return; }
    const byW = {};
    P.forEach(r => (byW[r[0]] ||= []).push(r));
    const cnt = {}; W.forEach(x => cnt[x.e.donem] = (cnt[x.e.donem] || 0) + 1);
    const tabs = withTabs ? `<div class="chips" role="tablist">${[['', 'Tümü', W.length], ...DONEM.map(([k, l]) => [k, l, cnt[k] || 0])].filter(x => x[2]).map(([k, l, n]) => `<button type="button" role="tab" data-d="${k}" aria-selected="${k === ''}">${l} <span>${n}</span></button>`).join('')}</div>` : '';
    const langs = [...new Set(W.map(x => x.e.dil || 'ar'))];
    const ltabs = withTabs && langs.length > 1 ? `<div class="chips" role="tablist" data-k="dil"><button type="button" data-l="" aria-selected="true">Bütün diller</button>${langs.map(l => `<button type="button" data-l="${l}" aria-selected="false">${esc(DIL[l] || l)} <span>${W.filter(x => (x.e.dil || 'ar') === l).length}</span></button>`).join('')}</div>` : '';
    body.innerHTML = tabs + ltabs + `<div class="works">${W.map(x => workBlock(x, byW[x.w] || [])).join('')}</div><p class="srcs" style="padding:0">Eserler vefat tarihine göre sıralı. Pasajlar yayımlanmış neşirlerin sayfalarıdır; cilt/sayfa Quranpedia'nın esas aldığı baskıya göredir. Birden çok ayeti birlikte ele alan sayfalar her ayette "ortak sayfa" olarak görünür.</p>`;
    body.querySelectorAll('.work').forEach(det => det.addEventListener('toggle', () => {
      if (det.open && !det.dataset.done) { det.dataset.done = '1'; const x = W.find(y => y.w === det.dataset.w); fillWork(det, byW[x.w] || [], x.e); }
    }));
    let fD = '', fL = '';
    const apply = () => body.querySelectorAll('.works .work[data-w]').forEach(det => { const x = W.find(y => y.w === det.dataset.w); if (x) det.hidden = (!!fD && x.e.donem !== fD) || (!!fL && (x.e.dil || 'ar') !== fL); });
    body.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('button').forEach(c => c.setAttribute('aria-selected', c === b));
      if ('l' in b.dataset) fL = b.dataset.l; else fD = b.dataset.d;
      apply();
    }));
    return W;
  };
  const once = (sec, fn) => $(`#${sec}`).addEventListener('toggle', e => { if (e.target.open && !e.target.dataset.loaded) { e.target.dataset.loaded = '1'; fn().catch(err => { $(`#${sec}body`).textContent = err.message; }); } });

  meta.then(({ list }) => {
    const c = t => list.filter(x => t.includes(x.e.tur));
    const tf = c(['tefsir']), es = c(['esbab', 'nasih']), ir = c(['irab', 'garib']);
    $('#tefd').textContent = `${tf.length} eser · Katman 2`;
    esbCount(s, a, es.length);
    $('#irbd').textContent = `${ir.length} eser · Katman 2`;
  }).catch(() => {});

  once('tef', async () => { await renderWorks('tef', ['tefsir'], true); if (window.__tefExtra) await window.__tefExtra(); });
  once('esb', async () => { await renderWorks('esb', ['esbab', 'nasih'], false); await esbExtra(s, a); });
  once('irb', async () => {
    const G = (await load(`/data/k2/g/${s}.json`)).ayetler[id] || [];
    await renderWorks('irb', ['irab'], false);
    if (G.length) $('#irbbody').insertAdjacentHTML('afterbegin', `<h4 class="k1h">Garîbü'l-Kur'ân <span class="tag v">kaynaklı · ${G.length} eser</span></h4>${G.map(g => `<details class="work"><summary><span class="who">${esc(g.muellif || '—')}</span><span class="wt ar">${esc(g.eser)}</span><span class="tag" dir="ltr">${g.kelimeler.length} kelime</span></summary><div class="pgs"><table class="t"><tbody>${g.kelimeler.map(k => `<tr><td class="ar" style="width:30%;font-size:1.15rem">${esc(k.k)}</td><td class="ar">${esc(k.a)}</td></tr>`).join('')}</tbody></table>${g.nesir ? `<p class="srcs">${esc(g.nesir)}</p>` : ''}</div></details>`).join('')}<h4 class="k1h">İ'râb eserleri</h4>`);
  });
  once('kir', async () => {
    const Q = (await load(`/data/k2/q/${s}.json`));
    const q = Q.ayetler[id] || {};
    const ref = q.cc_ref || {};
    const parts = [];
    if (q.qp && q.qp.length) parts.push(`<h4 class="k1h">On kıraat ve râvileri <span class="tag v">kaynaklı · Quranpedia</span> ${chain([{ r: 'Veri', t: 'Quranpedia kıraat hizmeti', k: 'quranpedia' }, { r: 'İşleme', b: 'k2' }])}</h4><div class="table-wrap"><table class="t"><thead><tr><th>Kelime</th><th>Okuyuş</th><th>Okuyanlar</th></tr></thead><tbody>${q.qp.map(x => `<tr><td class="ar" style="font-size:1.15rem">${esc(x.kelime)}</td><td class="ar">${esc(x.okuyus)}</td><td class="ar" style="font-size:.95rem">${x.raviler.map(r => `${esc(r[0])} <span class="muted">(${esc(r[1])})</span>`).join('، ')}</td></tr>`).join('')}</tbody></table></div>`);
    if (q.cc && q.cc.length) parts.push(`<h4 class="k1h">Kıraat kayıtları (kanonik ve şâz) <span class="tag v">kaynaklı · Corpus Coranicum</span> ${chain([{ r: 'Veri', t: 'Corpus Coranicum Lesarten veri tabanı', k: 'cc' }, { r: 'İşleme', b: 'k2' }])}</h4><div class="table-wrap"><table class="t"><thead><tr><th>Kelime</th><th>Okuyuş</th><th>Okuyan</th><th>Kaynak eser</th></tr></thead><tbody>${q.cc.map(x => `<tr><td class="ar" style="font-size:1.1rem">${(ks => ks.slice(0, 4).map(k => esc(ref[k] || k)).join(' ') + (ks.length > 4 ? ` <span class="tag" dir="ltr">+${ks.length - 4} kelime</span>` : ''))(Object.keys(x.okuyus))}</td><td dir="ltr"><i>${(vs => vs.slice(0, 4).map(esc).join(' ') + (vs.length > 4 ? ' …' : ''))(Object.values(x.okuyus))}</i></td><td style="font-size:.9rem">${x.okuyanlar.map(esc).join(', ')}</td><td style="font-size:.9rem">${esc(x.eser)}${x.kanonik_eser ? ' <span class="tag v">kanonik</span>' : ''}</td></tr>`).join('')}</tbody></table></div><p class="srcs" style="padding:0">Okuyuşlar Corpus Coranicum'un Latin harfli transkripsiyonuyla; okuyan adları veri tabanındaki (Almanca) biçimiyle.</p>`);
    const W = await works('kir', ['kiraat']);
    $('#kirbody').innerHTML = (parts.join('') || '<p class="srcs" style="padding:0">Bu ayet için kıraat veri tabanlarında kayıt yok. Bu, ayette kıraat farkı olmadığı anlamına gelmez.</p>') + (W.length ? `<h4 class="k1h">Kıraat eserlerinde bu ayet</h4><div id="kirw"></div>` : '');
    $('#kird').textContent = `${(q.qp || []).length + (q.cc || []).length} kayıt · ${W.length} eser`;
    if (W.length) {
      const P = await pas(); const byW = {}; P.forEach(r => (byW[r[0]] ||= []).push(r));
      $('#kirw').innerHTML = W.map(x => workBlock(x, byW[x.w] || [])).join('');
      $('#kirw').querySelectorAll('.work').forEach(det => det.addEventListener('toggle', () => { if (det.open && !det.dataset.done) { det.dataset.done = '1'; const x = W.find(y => y.w === det.dataset.w); fillWork(det, byW[x.w] || [], x.e); } }));
    }
  });
}

/* ---------------- Sure sayfası ---------------- */
async function surePage(n) {
  setNav('');
  const S = await meta();
  if (!S.sureler[n - 1]) { view.innerHTML = '<h1>Böyle bir sure yok</h1>'; return; }
  view.innerHTML = '<p class="lede">Sure yükleniyor…</p>';
  const [D, A, MI] = await Promise.all([load(`/data/sure/${n}.json`), load(`/data/k0/s/${n}.json`), load('/data/meal/index.json')]);
  const nm = k => k ? `<a href="#/sure/${k}">${k}. ${esc(S.sureler[k - 1].tr)}</a>` : '—';
  const al = x => `<a href="#/${x.replace(':', '/')}">${x.split(':')[1]}</a>`;
  const c = D.sayilar || {};
  view.innerHTML = `<article class="sure">
    <p class="where-line"><a href="#/">Kur'an</a> › <b>${n}. sure</b> · <a href="#/atlas">Atlas</a></p>
    <header class="sh"><h1><span class="ar">${esc(D.ar)}</span> <span>${esc(D.tr)}</span></h1>
      <p class="lede">${esc(D.tur)}${D.ihtilaf?.tur ? ' (ihtilaflı)' : ''} · ${D.ayet} ayet · ${fmt(D.kelime)} kelime · ${D.ruku} rükû${D.mukattaa ? ` · hurûf-ı mukattaa: ${esc(D.mukattaa)}` : ''} ${chain([{ r: 'Künye', k: 'tanzil' }, { r: 'Tür karşılaştırması', k: 'quranpedia' }, { r: 'Mukattaa', k: 'wikipedia' }, { r: 'İşleme', b: 'k0,sure' }])}</p>
      <p><a class="more" href="#/${n}/1">1. ayetten başla</a></p></header>
    <section class="sec2"><h2>Dizimlerde yeri</h2><div class="facts">${D.dizimler.map(d => `<div class="fact"><span class="k">${esc(d.ad)}</span><span class="v">${d.sira}. sırada</span><span class="s">önceki: ${nm(d.onceki)} · sonraki: ${nm(d.sonraki)}</span></div>`).join('')}</div>
      <p class="srcs" style="padding:0">Mısır sırası Tanzil'den (Robinson 2003 ile aynı); Nöldeke–Schwally sırası Robinson 2003 aktarımından (ikincil). ${chain([{ r: 'Mısır nüzul sırası', k: 'tanzil' }, { r: 'Nöldeke–Schwally', k: 'robinson' }, { r: 'İşleme', b: 'k0,sure' }])}</p>
      ${D.rivayetlere_gore_ayet_sayisi ? `<p class="srcs" style="padding:0">Rivayetlere göre ayet sayısı: ${Object.entries(D.rivayetlere_gore_ayet_sayisi).map(([r, v]) => { const m = r.match(/^(.*) \((.*)\)$/); return `${esc(RAVI[m?.[1]] || r)} ${v}`; }).join(' · ')}</p>` : ''}</section>
    ${D.temalar_tr.length ? `<section class="sec2"><h2>Ana temalar ${chain([{ r: 'Kaynak', k: 'wikipedia' }, { r: 'Türkçesi', k: 'claude' }, { r: 'İşleme', b: 'sure' }])}</h2><ul class="themes">${D.temalar_tr.map(t => `<li>${esc(t)}</li>`).join('')}</ul><details class="work"><summary><span class="who">İngilizce asıl</span></summary><div class="pgs"><ul>${D.temalar_en.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></details><p class="srcs" style="padding:0">${esc(D.temalar_kaynak)}</p></section>` : ''}
    <section class="sec2"><h2>Konu haritası ${chain([{ r: 'Konu dizini', k: 'quranpedia' }, { r: 'Bölümler', k: 'cc' }, { r: 'İşleme', b: 'k1,sure' }])}</h2>
      ${D.cc_bolumler.length ? `<p class="links">Corpus Coranicum bölümleri: ${D.cc_bolumler.map(b => `<a href="#/${n}/${b.ayetler[0]}">${b.bolum}. bölüm (${b.ayetler[0]}–${b.ayetler[1]})</a>`).join(' ')}</p>` : ''}
      ${D.ust_konular.length ? `<div class="chips">${D.ust_konular.map(([u, k]) => `<span class="tag ar">${esc(u)} <span dir="ltr">${k}</span></span>`).join(' ')}</div>` : ''}
      <div class="topics">${D.konular.map(k => `<details class="topic"><summary><span class="ar">${esc(k.ad)}</span> <span class="tag" dir="ltr">${k.ayetler.length} ayet</span></summary><p class="links">${k.ayetler.map(al).join(' ')}</p></details>`).join('')}</div></section>
    <section class="sec2"><h2>Bu suredeki kaynak yoğunluğu</h2><div class="facts">
      <div class="fact"><span class="k">Kitaplarda alıntı</span><span class="v">${fmt(c.alinti || 0)}</span></div>
      <div class="fact"><span class="k">Selef rivayeti</span><span class="v">${fmt(c.rivayet || 0)}</span><span class="s">nüzul ${c.nuzul || 0} · nesih ${c.nesih || 0}</span></div>
      <div class="fact"><span class="k">İhtilaf kaydı</span><span class="v">${fmt(c.ihtilaf || 0)}</span></div>
      <div class="fact"><span class="k">Fetva</span><span class="v">${fmt(c.fetva || 0)}</span></div></div></section>
    <section class="sec2"><h2>Tefsirlerde sureye giriş</h2><div id="sgiris"><button type="button" class="more" id="sgbtn">Klasik tefsirlerin sure girişlerini yükle</button></div></section>
    ${D.tanitim ? `<section class="sec2"><h2>Tanıtım <span class="tag">${esc(D.tanitim.kaynak)}</span> ${chain([{ r: 'Metin', t: D.tanitim.kaynak }, { r: 'Veri', k: 'qurancom' }, { r: 'İşleme', b: 'sure' }])}</h2><p>${esc(D.tanitim.ozet)}</p><details class="work"><summary><span class="who">Tam metin (İngilizce)</span></summary><div class="pgs"><p class="pt">${para(D.tanitim.metin).replace(/(^|<br>)§ ([^<]*)/g, '$1<b>$2</b>')}</p></div></details></section>` : ''}
    ${D.cc ? `<section class="sec2"><h2>Kronolojik-edebî şerh <span class="tag">Corpus Coranicum, Almanca</span> ${chain([{ r: 'Şerh', t: D.cc.atif }, { r: 'Veri', k: 'cc' }, { r: 'İşleme', b: 'sure' }])}</h2><p class="srcs" style="padding:0">${esc(D.cc.baslik)} — ${esc(D.cc.yazar)}</p>${(function rec(L) { return L.map(b => b.alt ? `<details class="work"><summary><span class="who">${esc(b.baslik)}</span></summary><div class="pgs">${rec(b.alt)}</div></details>` : (b.metin ? `<details class="work"><summary><span class="who">${esc(b.baslik)}</span>${b.ozel ? `<span class="tag">${esc(b.ozel)}</span>` : ''}</summary><div class="pgs"><p class="pt">${para(b.metin)}</p>${b.eserler ? `<p class="srcs">${esc(b.eserler)}</p>` : ''}</div></details>` : '')).join(''); })(D.cc.bolumler)}
      ${D.cc.yapi?.length ? `<details class="work"><summary><span class="who">Metin yapısı: kafiye, bölüm, ana kısım</span></summary><div class="pgs"><div class="table-wrap"><table class="t"><thead><tr><th>Ayet</th><th>Kafiye</th><th>Bölüm</th><th>Almanca</th><th style="text-align:right">Metin</th></tr></thead><tbody>${D.cc.yapi.map(r => `<tr><td><a href="#/${n}/${r.a}">${r.a}</a></td><td>${esc(r.kafiye || '')}</td><td>${r.bolum ?? ''}${r.ana != null ? '/' + r.ana : ''}</td><td>${esc(r.de || '')}</td><td class="ar">${esc(r.ar || '')}</td></tr>`).join('')}</tbody></table></div></div></details>` : ''}</section>` : ''}
    <section class="sec2"><h2>Sure hakkında makaleler</h2><div id="smak">Yükleniyor…</div></section>
    <section class="sec2"><h2>Ayetler</h2><ol class="ayl">${A.ayetler.map(x => `<li><a href="#/${n}/${x.a}"><span class="ar">${esc(x.metin.split(' ').slice(0, 7).join(' '))}${x.metin.split(' ').length > 7 ? '…' : ''}</span></a></li>`).join('')}</ol></section>
  </article>`;
  load(`/data/k8/${n}.json`).then(K => {
    const ids = [...new Set([...K.sure, ...Object.values(K.ayet).flat()])];
    $('#smak').innerHTML = ids.length ? ids.slice(0, 80).map(i => { const m = K.makale[i]; return `<div class="pg"><div class="pgh"><span class="cite">${esc(m.authors || '—')}</span>${m.year ? `<span class="tag" dir="ltr">${m.year}</span>` : ''}</div><p class="pt"><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a></p></div>`; }).join('') + (ids.length > 80 ? `<p class="srcs">ve ${ids.length - 80} makale daha</p>` : '') : '<p class="srcs" style="padding:0">Bu sureye atıf yapan makale bulunmadı.</p>';
  }).catch(e => { $('#smak').textContent = e.message; });
  $('#sgbtn').addEventListener('click', async () => {
    $('#sgiris').textContent = 'Yükleniyor…';
    const [E, P] = await Promise.all([load('/data/k2/eserler.json'), loadGz(`/data/k2/t/${n}/1.json.gz`)]);
    const first = {};
    for (const r of P.p) if (typeof r[3] === 'string' && !first[r[0]] && (E.eserler[r[0]] || {}).tur === 'tefsir') first[r[0]] = r;
    const L = Object.values(first).sort((x, y) => (E.eserler[x[0]].vefat || 9999) - (E.eserler[y[0]].vefat || 9999));
    $('#sgiris').innerHTML = `<div class="works">${L.map(r => { const e = E.eserler[r[0]]; return `<details class="work"><summary><span class="who">${esc(e.muellif || '—')}</span><span class="wt ar">${esc(e.ad)}</span><span class="tag" dir="ltr">${e.vefat ? 'ö. ' + e.vefat : 'çağdaş'}</span></summary><div class="pgs"><div class="pgh"><span class="cite">${r[1] ? 'c. ' + esc(r[1]) + ', ' : ''}${r[2] ? 's. ' + esc(r[2]) : ''}</span>${chain([{ r: 'Yer', t: `${r[1] ? 'cilt ' + r[1] + ', ' : ''}${r[2] ? 'sayfa ' + r[2] : ''}` }, { r: 'Eser', t: e.ad, u: r[0].startsWith('qp') ? qpUrl(r[0].slice(2)) : null }, { r: 'Veri', k: r[0].startsWith('qp') ? 'quranpedia' : 'qul' }, { r: 'İşleme', b: 'k2' }])}</div><p class="pt ar" dir="rtl">${esc(r[3].slice(0, 2500))}${r[3].length > 2500 ? '…' : ''}</p><p class="srcs"><a href="#/${n}/1">Devamı 1. ayetin tefsir bölümünde</a></p></div></details>`; }).join('')}</div><p class="srcs" style="padding:0">Her tefsirin bu surenin 1. ayetine bağlı ilk sayfası; çoğu tefsir sure girişini (adı, Mekkî/Medenîliği, fazileti) burada verir.</p>`;
  });
}

/* ---------------- Atlas ---------------- */
let atlasOrder = 'mushaf';
async function atlas() {
  setNav('atlas');
  const S = await meta();
  const done = LAYERS.filter(l => l[1]).length;
  view.innerHTML = `
    <div class="atlas-head">
      <div><h1>Kur'an atlası</h1><p class="lede">Hücre genişliği surenin ayet sayısını, alttaki altın çizgi işlenmiş katman oranını gösterir (şu an ${done}/${LAYERS.length}). Bir sureye tıklayın.</p></div>
      <div>
        <div class="switch" role="group" aria-label="Sıralama">
          <button type="button" data-order="mushaf" aria-pressed="${atlasOrder === 'mushaf'}">Mushaf</button>
          <button type="button" data-order="nuzul_misir" aria-pressed="${atlasOrder === 'nuzul_misir'}">Nüzul (Mısır)</button>
          <button type="button" data-order="noldeke" aria-pressed="${atlasOrder === 'noldeke'}">Nöldeke</button>
        </div>
        <p class="source-note" id="order-src"></p>
      </div>
    </div>
    <div class="atlas" id="atlas"></div>
    <p class="tip" id="tip" aria-live="polite"></p>
    <div class="legend"><span><b>Mavi numara</b>: Medenî</span><span>Altın çizgi: işlenen katmanlar</span></div>`;
  const box = $('#atlas');
  const maxA = Math.max(...S.sureler.map(x => x.ayet));
  for (const s of S.sureler) {
    const el = document.createElement('a');
    el.className = `cell ${s.tur === 'Medenî' ? 'medeni' : ''}`;
    el.href = `#/sure/${s.n}`;
    el.dataset.n = s.n;
    el.style.setProperty('--r', Math.sqrt(s.ayet / maxA).toFixed(3));
    el.innerHTML = `<span class="n">${s.n}</span><span class="ar">${esc(s.ar)}</span><span class="lv" style="--lv:${(done / LAYERS.length * 100).toFixed(0)}%"></span>`;
    el.setAttribute('aria-label', `${s.n}. ${s.tr}, ${s.ayet} ayet, ${s.tur}`);
    const tip = () => { $('#tip').textContent = `${s.n}. ${s.tr} · ${s.ayet} ayet · ${s.tur} · nüzul (Mısır) ${s.tertip.nuzul_misir} · Nöldeke ${s.tertip.noldeke}`; };
    el.addEventListener('mouseenter', tip); el.addEventListener('focus', tip);
    box.appendChild(el);
  }
  const SRC = { mushaf: 'Mevcut mushaf tertibi', nuzul_misir: 'Kaynak: Tanzil (Mısır/Ezher mushafı), Robinson 2003 ile aynı', noldeke: 'Kaynak: Nöldeke–Schwally sırası, Robinson 2003 aktarımı (ikincil)' };
  const arrange = (animate) => {
    const cells = [...box.children];
    const first = new Map(cells.map(c => [c, c.getBoundingClientRect()]));
    cells.sort((x, y) => S.sureler[x.dataset.n - 1].tertip[atlasOrder] - S.sureler[y.dataset.n - 1].tertip[atlasOrder]).forEach(c => box.appendChild(c));
    $('#order-src').textContent = SRC[atlasOrder];
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cells.forEach(c => {
      const p = first.get(c), q = c.getBoundingClientRect();
      c.style.transition = 'none'; c.style.transform = `translate(${p.left - q.left}px, ${p.top - q.top}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = ''; c.style.transform = ''; }));
    });
  };
  arrange(false);
  view.querySelectorAll('[data-order]').forEach(b => b.addEventListener('click', () => {
    atlasOrder = b.dataset.order;
    view.querySelectorAll('[data-order]').forEach(x => x.setAttribute('aria-pressed', x === b));
    arrange(true);
  }));
}

/* ---------------- Kütüphane ---------------- */
const GENRE = { tefsir: 'Tefsir', ulum: "Ulûmü'l-Kur'ân", kiraat: 'Kıraat ve tecvid', dil: 'Dil', meal: 'Meal', mushaf: 'Mushaf', hadis: 'Hadis', fikih: 'Fıkıh', akaid: 'Akaid ve kelâm', tasavvuf: 'Tasavvuf ve ahlâk', tarih: 'Siyer ve tarih', 'ricâl': 'Ricâl ve tabakât', felsefe: 'Felsefe ve mantık', modern: 'Çağdaş genel', farsca: 'Farsça', edebiyat: 'Edebiyat', diger: 'Diğer', belirsiz: 'Sınıflandırılmamış' };
const YANS = { K0: 'Kur\'an metni', K2: 'ayet ayet bölümler', K3: 'ayet alıntıları', 'K3-PDF': 'PDF\'ten ayet alıntıları', K5: 'lügat maddeleri', K4R: 'râvi biyografileri', 'BOS-METINYOK': 'metni elde değil', 'BOS-ARCHIVE': 'archive.org engelli', 'BOS-TARANMIS': 'taranmış, OCR bekliyor', 'BOS-ALINTIYOK': 'metinde ayet alıntısı yok', 'BOS-BEKLIYOR': 'PDF işleniyor' };
const yans = r => { const c = (r[11] || '').split(' ').filter(Boolean); if (!c.length) return ''; const bos = c.every(x => x.startsWith('BOS')); return `<span class="badge ${bos ? '' : 'ok'}" title="${esc(c.map(x => YANS[x] || x).join(', '))}">${bos ? esc(YANS[c[0]] || c[0]) : `${fmt(r[10] || 0)} ayet · ${esc(c.filter(x => !x.startsWith('BOS')).map(x => YANS[x] || x).join(', '))}`}</span>`; };
const TEXT = { 'ayet-bolumlu': 'Ayet ayet', 'tam-metin': 'Tam metin', pdf: 'Yalnız PDF', kunye: 'Yalnız künye', 'kelime-bolumlu': 'Kelime kelime', 'yapisal-veri': 'Yapısal veri' };
const SOURCE = { quranpedia: 'Quranpedia', openiti: 'OpenITI', tafsir_api: 'QUL (tafsir_api)', tanzil: 'Tanzil', corpus_coranicum: 'Corpus Coranicum', 'github:mustafa0x/quran-morphology': 'QAC morfoloji' };
const norm = s => String(s || '').normalize('NFKC').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLocaleLowerCase('tr');
async function library() {
  setNav('kutuphane');
  view.innerHTML = '<p class="lede">Katalog yükleniyor…</p>';
  const [sum, rows] = await Promise.all([load('/data/library-summary.json'), load('/data/catalog.json')]);
  const tbl = (obj, map = x => x) => `<table class="kv">${Object.entries(obj).map(([k, v]) => `<tr><td>${esc(map(k))}</td><td>${fmt(v)}</td></tr>`).join('')}</table>`;
  view.innerHTML = `
    <h1>Kütüphane</h1>
    <p class="lede">Erişilebilen bütün kaynaklardaki eserlerin kataloğu. Katalogda olmak, metnin işlendiği anlamına gelmez; metin durumu sütunu neyin elde olduğunu gösterir.</p>
    <div class="stats">
      <div><p class="total">${fmt(sum.kayit_toplam)}</p><p class="total-label">katalog kaydı · tahminen ${fmt(sum.tekil_eser_tahmini)} tekil eser<br>${fmt(sum.indirilen)} kaydın metni elde · ${esc(sum.tarih)}</p></div>
      <div><h2>Kaynağa göre</h2>${tbl(sum.kaynaga_gore, k => SOURCE[k] || k)}</div>
      <div><h2>Türe göre</h2>${tbl(sum.ture_gore, k => GENRE[k] || k)}</div>
      <div><h2>Metin durumu</h2>${tbl(sum.metin_durumuna_gore, k => TEXT[k] || k)}</div>
    </div>
    <div class="filters">
      <input id="q" type="search" placeholder="Eser veya müellif ara (Arapça ya da Latin)" aria-label="Eser veya müellif ara">
      <select id="fg" aria-label="Tür"><option value="">Bütün türler</option>${Object.keys(sum.ture_gore).map(k => `<option value="${k}">${esc(GENRE[k] || k)}</option>`).join('')}</select>
      <select id="fs" aria-label="Kaynak"><option value="">Bütün kaynaklar</option>${Object.keys(sum.kaynaga_gore).map(k => `<option value="${k}">${esc(SOURCE[k] || k)}</option>`).join('')}</select>
      <select id="ft" aria-label="Metin durumu"><option value="">Her metin durumu</option>${Object.keys(sum.metin_durumuna_gore).map(k => `<option value="${k}">${esc(TEXT[k] || k)}</option>`).join('')}</select>
      <select id="fy" aria-label="Sitedeki yeri"><option value="">Sitede: hepsi</option><option value="+">Ayetlere bağlı</option>${Object.entries(YANS).filter(([k]) => k.startsWith('BOS')).map(([k, v]) => `<option value="${k}">Boşta: ${esc(v)}</option>`).join('')}</select>
    </div>
    <p class="count" id="cnt"></p>
    <div class="table-wrap"><table class="works"><thead><tr><th class="rt">Eser</th><th class="rt">Müellif</th><th class="num">Vefat (h.)</th><th class="hide-sm">Tür</th><th class="hide-sm">Kaynak</th><th>Metin</th><th>Sitede</th></tr></thead><tbody id="tb"></tbody></table></div>
    <button class="more" id="more" hidden>Daha fazla göster</button>`;
  const idx = rows.map(r => norm(r[1] + ' ' + r[2] + ' ' + (r[9] || '')));
  let shown = 0, hits = [];
  const draw = (reset) => {
    if (reset) { shown = 0; $('#tb').innerHTML = ''; }
    const part = hits.slice(shown, shown + 200);
    $('#tb').insertAdjacentHTML('beforeend', part.map(i => { const r = rows[i]; return `<tr><td class="tt">${esc(r[1])}</td><td class="tt">${esc(r[2])}</td><td class="num">${r[3] ?? '–'}</td><td class="hide-sm">${esc(GENRE[r[4]] || r[4])}</td><td class="hide-sm">${esc(SOURCE[r[6]] || r[6])}</td><td><span class="badge ${r[8] ? 'ok' : ''}">${esc(TEXT[r[7]] || r[7])}${r[8] ? ' · elde' : ''}</span></td><td>${yans(r)}</td></tr>`; }).join(''));
    shown += part.length;
    $('#cnt').textContent = `${fmt(hits.length)} kayıt${hits.length > shown ? `, ilk ${fmt(shown)} gösteriliyor` : ''}`;
    $('#more').hidden = shown >= hits.length;
  };
  const run = () => {
    const q = norm($('#q').value.trim()), g = $('#fg').value, s = $('#fs').value, t = $('#ft').value;
    hits = [];
    const y = $('#fy').value;
    for (let i = 0; i < rows.length; i++) { const r = rows[i]; if (y === '+' && !(r[10] > 0 || /K[0-9]/.test(r[11] || ''))) continue; if (y && y !== '+' && !(r[11] || '').includes(y)) continue; if (g && r[4] !== g) continue; if (s && r[6] !== s) continue; if (t && r[7] !== t) continue; if (q && !idx[i].includes(q)) continue; hits.push(i); }
    draw(true);
  };
  let timer; $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 150); });
  ['#fg', '#fs', '#ft', '#fy'].forEach(id => $(id).addEventListener('change', run));
  $('#more').addEventListener('click', () => draw(false));
  run();
}

/* ---------------- Yönlendirme ---------------- */
async function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  const m = h.match(/^\/(\d{1,3})\/(\d{1,3})(?:\/([a-z]+))?$/);
  try {
    if (m) { if (m[3] && AY_SEK.some(x => x[0] === m[3])) store.set('aysek', m[3]); await ayah(+m[1], +m[2]); }
    else if (/^\/sure\/\d{1,3}$/.test(h)) await surePage(+h.split('/')[2]);
    else if (/^\/kisi\/\d{1,7}$/.test(h)) await kisiSayfa(h.split('/')[2]);
    else if (h === '/atlas') await atlas();
    else if (h === '/kutuphane') await library();
    else if (h === '/kutuphane/dinler') await dinlerRaf();
    else if (/^\/kutuphane\/[a-z]+$/.test(h)) await turRaf(h.split('/')[2]);
    else if (/^\/metin\/\d{1,5}$/.test(h)) await metinOku(h.split('/')[2]);
    else if (/^\/kitap\/t\d+(\/\d{1,3}\/\d{1,3})?$/.test(h)) { const p = h.split('/'); await kitapOku(p[2], +(p[3] || 1), +(p[4] || 1)); }
    else if (/^\/eser\/(?:[hfksrlqupt]\d+|sh\d+|oi[0-9a-f]{8})(\/\d{1,6})?$/.test(h)) { const p = h.split('/'); await eserOku(p[2], p[3] === undefined ? undefined : +p[3]); }
    else await home();
  } catch (e) {
    view.innerHTML = `<h1>Sayfa açılamadı</h1><p class="lede">${esc(e.message)}. Sayfayı yenileyin; sorun sürerse veri dosyası eksik olabilir.</p>`;
  }
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}
addEventListener('hashchange', route);
addEventListener('DOMContentLoaded', route);

/* ---------------- Esbâb ve nâsih: K2 eserleri + Mevsûa rivayetleri + uzman kitaplardaki alıntılar ---------------- */
const ESB_BOOKS = ['0911Suyuti.LubabNuqul', '0852IbnHajarCasqalani.CujabFiBayanAsbab', '0117IbnDicamaSadusi.NasikhWaMansukh', '0224QasimIbnSallam.NasikhWaMansukh', '0246QasimRassi.NasikhWaMansukh',
  '0273AbuBakrAthram.NasikhHadith', '0310CabdAllahIbnHusaynRassi.NasikhWaMansukh', '0338AbuJacfarNahhas.NasikhWaMansukh', '0385IbnShahin.NasikhHadithWaMansukhuh', '0410IbnSalamaBaghdadi.NasikhWaMansukh',
  '0456IbnHazm.NasikhWaMansukh', '0543IbnCarabiIshbili.NasikhWaMansukh', '0584IbnMusaHazimi.IctibarFiNasikhWaMansukh', '0597IbnJawzi.NawasikhQuran', '0738IbnCabdRahimSharafDinHamawi.NasikhQuran'];
const esbParts = async (s, a) => {
  const [b, K] = await Promise.all([loadGz(`/data/x/${s}/${a}.json.gz`), load('/data/x/kitaplar.json').then(d => d.kitaplar)]);
  const riv = b.k4.filter(x => /نزول|النسخ/.test(x.tur || ''));
  const books = Object.values(b.k3).flat().filter(([nb]) => { const k = K[nb] || {}; const r = k.ref || ''; return ESB_BOOKS.some(p => r.startsWith(p)) || ['asbab', 'nasekh'].includes(k.qp_tur); });
  return { b, K, riv, books };
};
async function esbCount(s, a, n2) {
  const el = $('#esbd');
  try { const { riv, books } = await esbParts(s, a); const n = n2 + books.length; el.textContent = n || riv.length ? `${n} eser${riv.length ? ` · ${riv.length} rivayet` : ''}` : 'bu ayet için kayıt yok'; }
  catch { el.textContent = n2 ? `${n2} eser` : 'bu ayet için kayıt yok'; }
}
async function esbExtra(s, a) {
  const { K, riv, books } = await esbParts(s, a);
  const body = $('#esbbody');
  if (/eser pasajı yok/.test(body.textContent) && (riv.length || books.length)) body.innerHTML = '';
  let h = '';
  if (riv.length) h += `<h4 class="k1h">Nüzul ve nesih rivayetleri <span class="tag v">kaynaklı · Mevsûatü't-tefsîri'l-me'sûr</span></h4>${riv.map(x => `<article class="rv"><div class="pgh"><span class="tag v">${/النسخ/.test(x.tur) ? 'Nesih' : 'Nüzul'}</span>${x.hukum ? `<span class="tag ${/sahih|hasen/.test(x.hukum) ? 'v' : 'w'}">tahrîcte: ${esc(x.hukum)}</span>` : ''}</div><p class="pt ar" dir="rtl">${esc(x.metin).replace(/\n/g, '<br>')}</p>${x.tahric ? `<details class="tah"><summary>Tahrîc</summary><p class="ar" dir="rtl">${esc(x.tahric)}</p></details>` : ''}</article>`).join('')}`;
  if (books.length) {
    books.sort((p, q) => (K[p[0]].vefat || 9999) - (K[q[0]].vefat || 9999));
    h += `<h4 class="k1h">Esbâb ve nâsih-mensûh kitaplarında <span class="tag">makine: ayet alıntısı</span></h4><div class="works">${books.map(([nb, n, hits]) => { const k = K[nb]; return `<details class="work"><summary><span class="who">${esc((k.muellif || '—').replace(/\s*\(المتوفى[^)]*\)/, ''))}</span><span class="wt ar">${esc(k.ad)}</span><span class="tag" dir="ltr">${k.vefat ? 'ö. ' + k.vefat : ''}</span><span class="tag" dir="ltr">${n} yer</span></summary><div class="pgs">${hits.map(x => `<div class="pg"><div class="pgh"><span class="cite">${+x[0] ? `c. ${+x[0]}, ` : ''}${x[1] !== '0' ? 's. ' + esc(x[1]) : ''}</span>${chain([{ r: 'Yer', t: pv(x[0], x[1]) || '—' }, { r: 'Kitap', t: k.ad, u: k.kaynak === 'Quranpedia PDF' ? ((k.pdf || {})[String(+x[0])] ? `${k.pdf[String(+x[0])]}#page=${+x[1]}` : qpUrl(k.ref)) : oiUrl(k.ref) }, { r: 'Veri', k: k.kaynak === 'Quranpedia PDF' ? 'quranpedia_pdf' : 'openiti' }, { r: 'Bağ', t: `makine: ${x[2]} kelimelik metin eşleşmesi`, b: 'k3,paket' }])}</div>${x[4] ? `<p class="pt ar" dir="rtl">${esc(x[4])}</p>` : ''}</div>`).join('')}<p class="srcs nesir">${esc(k.kaynak || 'OpenITI')} · ${esc(k.ref)}</p></div></details>`; }).join('')}</div><p class="srcs" style="padding:0">Bu kitaplarda ayetin geçtiği yerler alıntı taramasıyla bulundu; pasajın tamamı için OpenITI metnine bakın.</p>`;
  }
  body.insertAdjacentHTML('beforeend', h);
}

/* ---------------- Katman 3–8 ---------------- */
const GRP = { hadis: 'Hadis', fikih: 'Fıkıh ve usûl', kelam: 'Kelâm ve felsefe', tasavvuf: 'Tasavvuf', tarih: 'Tarih, siyer, ricâl', dil: 'Dil ve edebiyat', ulum: "Kur'an ilimleri ve kıraat", cagdas: 'Çağdaş ve diğer' };
const RTYPE = t => /نزول/.test(t) ? 'Nüzul' : /النسخ/.test(t) ? 'Nesih' : /أحكام/.test(t) ? 'Ahkâm' : /قراءات/.test(t) ? 'Kıraat' : /آثار/.test(t) ? 'Âsâr' : 'Tefsir';
const GRADE_TR = { 'ثقه ثبت': 'sika sebt', 'ثقه حافظ': 'sika hâfız', 'ثقه': 'sika', 'صدوق يهم': 'sadûk, vehmi var', 'صدوق يخطئ': 'sadûk, hata eder', 'صدوق': 'sadûk', 'لا باس به': 'lâ be\'se bih', 'مقبول': 'makbûl', 'لين الحديث': 'leyyinü\'l-hadîs', 'مستور': 'mestûr', 'مجهول الحال': 'meçhûlü\'l-hâl', 'مجهول': 'meçhûl', 'ضعيف': 'zayıf', 'متروك': 'metrûk', 'متهم': 'müttehem', 'كذاب': 'kezzâb', 'كذبوه': 'yalanlanmış', 'صحابي': 'sahâbî', 'له صحبه': 'sahâbî' };
const isAr = t => /[؀-ۿ]/.test((t || '').slice(0, 80));
const para = t => esc(t).split('\n').filter(l => l.trim()).join('<br>');
function kx(s, a, A) {
  const id = `${s}:${a}`;
  const B = loadGz(`/data/x/${s}/${a}.json.gz`);
  const KB = () => load('/data/x/kitaplar.json').then(d => d.kitaplar);
  const once = (sec, fn) => $(`#${sec}`).addEventListener('toggle', e => { if (e.target.open && !e.target.dataset.loaded) { e.target.dataset.loaded = '1'; fn().catch(err => { $(`#${sec}body`).textContent = err.message; }); } });
  const setD = (sec, t) => { const el = $(`#${sec}d`); if (el) el.textContent = t; };
  const loc = (k, h) => k.kaynak === 'OpenITI' ? (+h[0] ? `c. ${+h[0]}, s. ${h[1]}` : (h[1] !== '0' ? `s. ${h[1]}` : '')) : k.kaynak === 'Quranpedia PDF' ? `c. ${+h[0]}, PDF s. ${+h[1]}` : 'Quranpedia bölümü';
  const pdfLink = (k, h) => k.pdf && k.pdf[String(+h[0])] ? `${k.pdf[String(+h[0])]}#page=${+h[1]}` : null;

  const booksHtml = (L, K) => L.map(([nb, n, hits]) => {
    const k = K[nb] || {};
    return `<details class="work" data-nb="${nb}"><summary><span class="who">${esc((k.muellif || '—').replace(/\s*\(المتوفى[^)]*\)/, ''))}</span><span class="wt ar">${esc(k.ad || '')}</span><span class="tag" dir="ltr">${k.vefat ? 'ö. ' + k.vefat : 'tarihsiz'}</span><span class="tag" dir="ltr">${n} yer</span></summary><div class="pgs">${
      hits.map(h => `<div class="pg"><div class="pgh"><span class="cite">${esc(loc(k, h))}</span>${chain([{ r: 'Yer', t: k.kaynak === 'OpenITI' ? `${loc(k, h)} — metinde ${pv(h[0], h[1])} işaretinin hemen öncesi` : k.kaynak === 'Quranpedia PDF' ? `${loc(k, h)} (PDF dosyasının ${+h[1]}. sayfası)` : `Quranpedia içerik no ${h[1]}`, u: k.kaynak === 'Quranpedia PDF' ? pdfLink(k, h) : null },
        { r: 'Kitap', t: `${(k.muellif || '').replace(/\s*\(المتوفى[^)]*\)/, '')}${k.vefat ? ` (ö. ${k.vefat})` : ''}, ${k.ad}`, u: k.kaynak === 'OpenITI' ? oiUrl(k.ref) : qpUrl(k.ref) }, k.nesir && { r: 'Neşir', t: k.nesir },
        { r: 'Veri', k: k.kaynak === 'OpenITI' ? 'openiti' : k.kaynak === 'Quranpedia PDF' ? 'quranpedia_pdf' : 'quranpedia' }, { r: 'Bağ', t: h[3] === 'b' ? 'kaynağın kendi ayet bağı' : `makine: ${h[2]} kelimelik metin eşleşmesi` , b: 'k3,paket' }])}${h[3] === 'b' ? '<span class="tag v">kaynakta bu ayete bağlı bölüm</span>' : `<span class="tag">${h[2]} kelimelik alıntı</span>`}</div>${h[4] ? `<p class="pt ar" dir="rtl">${esc(h[4])}</p>` : ''}</div>`).join('')}${n > hits.length ? `<p class="srcs">Bu eserde ${n - hits.length} yer daha var.</p>` : ''}<p class="srcs nesir">${esc(k.kaynak)}${k.ref ? ' · ' + esc(k.ref) : ''}${k.nesir ? ' · ' + esc(k.nesir) : ''}</p></div></details>`;
  }).join('');
  const groupSec = (sec, groups, extra) => once(sec, async () => {
    const [b, K] = await Promise.all([B, KB()]);
    const present = groups.filter(g => (b.k3[g] || []).length);
    const parts = [];
    if (present.length > 1) parts.push(`<div class="chips" role="tablist"><button type="button" role="tab" data-g="" aria-selected="true">Tümü</button>${present.map(g => `<button type="button" role="tab" data-g="${g}" aria-selected="false">${GRP[g]} <span>${b.k3[g].length}</span></button>`).join('')}</div>`);
    for (const g of present) parts.push(`<div class="grp" data-g="${g}">${present.length > 1 ? `<h4 class="k1h">${GRP[g]}</h4>` : ''}<div class="works">${booksHtml(b.k3[g], K)}</div></div>`);
    let html = parts.join('') || '<p class="srcs" style="padding:0">Taranan kitaplarda bu ayetten alıntı bulunmadı.</p>';
    html += '<p class="srcs" style="padding:0">Alıntılar makineyle bulundu: kitap metni ile ayet metni harekesiz karşılaştırıldı; en az 6 kelimelik eşleşme ya da kısa bir ayetin tamamı aranır. Sayfa numarası OpenITI metnindeki baskı işaretlerine göredir.</p>';
    if (extra) html = (await extra(b)) + html;
    const body = $(`#${sec}body`); body.innerHTML = html;
    body.querySelectorAll('.chips button').forEach(bt => bt.addEventListener('click', () => {
      body.querySelectorAll('.chips button').forEach(c => c.setAttribute('aria-selected', c === bt));
      body.querySelectorAll('.grp').forEach(d => { d.hidden = !!bt.dataset.g && d.dataset.g !== bt.dataset.g; });
    }));
  });

  window.__tefExtra = async () => {
    const [b, K] = await Promise.all([B, KB()]);
    const L = b.k3.tefsir || [];
    if (!L.length) return;
    $('#tefbody').insertAdjacentHTML('beforeend', `<h4 class="k1h">Diğer tefsir ve tefsir çalışmalarında <span class="tag">makine: ayet alıntısı</span> <span class="tag" dir="ltr">${L.length} eser</span></h4><div class="works">${booksHtml(L, K)}</div><p class="srcs" style="padding:0">Bu eserler (OpenITI tefsirleri ve Quranpedia kitapları) ayet ayet bölünmüş değil; ayetin metnini aktardıkları ya da kaynağın bu ayete bağladığı yerler gösterilir. Tam pasaj için kaynak zincirindeki bağlantıyı izleyin.</p>`);
  };
  B.then(b => { const n = (b.k3.tefsir || []).length; if (n) { const d = $('#tefd'); const add = () => { if (!/alıntı/.test(d.textContent)) d.textContent += ` · +${n} eserde alıntı`; }; setTimeout(add, 800); } }).catch(() => {});
  B.then(b => {
    const c = gs => gs.reduce((t, g) => t + (b.k3[g] || []).length, 0);
    const y = gs => gs.reduce((t, g) => t + (b.k3[g] || []).reduce((u, x) => u + x[1], 0), 0);
    const lab = gs => c(gs) ? `${c(gs)} eser · ${y(gs)} yer` : 'alıntı bulunmadı';
    setD('riv4', b.k4.length ? `${b.k4.length} rivayet` : 'kayıt yok');
    setD('hds', lab(['hadis']));
    setD('fkh', `${lab(['fikih'])}${b.k7.fetva.length ? ` · ${b.k7.fetva.length} fetva` : ''}`);
    setD('klm', lab(['kelam', 'tasavvuf', 'tarih']));
    setD('dil', lab(['dil', 'ulum']));
    setD('cgd', `${lab(['cagdas'])}${b.notlar.length ? ` · ${b.notlar.length} not` : ''}`);
    setD('iht', b.k7.ihtilaf.length ? `${b.k7.ihtilaf.length} ihtilaf kaydı` : 'kayıt yok');
  }).catch(e => ['riv4', 'hds', 'fkh', 'klm', 'dil', 'cgd', 'iht'].forEach(x => setD(x, e.message)));

  // 9 — Selef rivayetleri
  once('riv4', async () => {
    const [b, R] = await Promise.all([B, load('/data/k4/raviler.json')]);
    const RV = R.raviler;
    if (!b.k4.length) { $('#riv4body').innerHTML = '<p class="srcs" style="padding:0">Mevsûatü\'t-tefsîri\'l-me\'sûr bu ayet için rivayet kaydetmiyor.</p>'; return; }
    const types = [...new Set(b.k4.map(x => RTYPE(x.tur)))];
    const ravi = rid => { const r = RV[rid]; return r ? `<button type="button" class="ravi" data-r="${rid}">${esc(r.ad)}${r.takrib?.derece ? ` <span class="g">${esc(GRADE_TR[r.takrib.derece] || r.takrib.derece)}</span>` : ''}</button>` : ''; };
    $('#riv4body').innerHTML = `${types.length > 1 ? `<div class="chips" role="tablist"><button type="button" data-t="" aria-selected="true">Tümü <span>${b.k4.length}</span></button>${types.map(t => `<button type="button" data-t="${t}" aria-selected="false">${t} <span>${b.k4.filter(x => RTYPE(x.tur) === t).length}</span></button>`).join('')}</div>` : ''}
      <div class="rivs">${b.k4.map(x => `<article class="rv" data-t="${RTYPE(x.tur)}"><div class="pgh">${chain([{ r: 'Rivayet', t: `Mevsûa kayıt no ${x.id} (${x.tur || ''})` }, x.tahric && { r: 'Tahrîc', t: x.tahric.slice(0, 300) }, { r: 'Eser', k: 'mevsua' }, { r: 'Veri', k: 'quranpedia' }, { r: 'Râvi dereceleri', t: 'Takrîbü\'t-Tehzîb ile makine eşleştirmesi', b: 'k4_ravi' }, { r: 'İşleme', b: 'paket' }])}<span class="tag v">${RTYPE(x.tur)}</span>${x.hukum ? `<span class="tag ${/sahih|hasen/.test(x.hukum) ? 'v' : 'w'}">tahrîcte: ${esc(x.hukum)}</span>` : ''}${x.raviler.map(ravi).join('')}</div><p class="pt ar" dir="rtl">${para(x.metin)}</p>${x.tahric ? `<details class="tah"><summary>Tahrîc</summary><p class="ar" dir="rtl">${para(x.tahric)}</p></details>` : ''}</article>`).join('')}</div>
      <div class="ravibox" id="ravibox" hidden></div>
      <p class="srcs" style="padding:0">Kaynak: Mevsûatü't-tefsîri'l-me'sûr (Quranpedia). Râvi dereceleri İbn Hacer'in Takrîbü't-Tehzîb'inden makineyle eşleştirildi; "tahrîcte" etiketi tahrîc notundaki ifadeden alınır.</p>`;
    const body = $('#riv4body');
    body.querySelectorAll('.chips button').forEach(bt => bt.addEventListener('click', () => {
      body.querySelectorAll('.chips button').forEach(c => c.setAttribute('aria-selected', c === bt));
      body.querySelectorAll('.rv').forEach(d => { d.hidden = !!bt.dataset.t && d.dataset.t !== bt.dataset.t; });
    }));
    body.querySelectorAll('.ravi').forEach(bt => bt.addEventListener('click', () => {
      const r = RV[bt.dataset.r]; const box = $('#ravibox');
      const t = r.takrib;
      box.innerHTML = `<h4 class="k1h">${esc(r.ad)} <span class="tag" dir="ltr">${r.rivayet} rivayet · ${r.ayet} ayet</span></h4>${t ? `<dl><dt>Derece</dt><dd>${esc(GRADE_TR[t.derece] || t.derece || '—')}</dd><dt>Tabaka</dt><dd>${t.tabaka || '—'}</dd><dt>Vefat</dt><dd>${t.vefat ? 'h. ' + t.vefat : '—'}</dd></dl><p class="ar" dir="rtl">${esc(t.metin)}</p><p class="srcs">Takrîbü't-Tehzîb, nr. ${t.no} · eşleşme: ${esc(r.eslesme)} ${chain([{ r: 'Madde', t: `Takrîb nr. ${t.no}` }, { r: 'Eser', t: "İbn Hacer (ö. 852), Takrîbü't-Tehzîb", u: oiUrl('0852IbnHajarCasqalani.TaqribTahdhib.JK000121-ara1') }, { r: 'Veri', k: 'openiti' }, { r: 'Eşleşme', t: r.eslesme, b: 'k4_ravi' }])}</p>` : r.adaylar ? `<p class="srcs">Takrîb'de ${r.aday_sayisi} aday var; makine tek kişiyi seçemedi:</p><ul>${r.adaylar.map(c => `<li class="ar" dir="rtl">${esc(c.ad)} — ${esc(GRADE_TR[c.derece] || c.derece || '')}${c.vefat ? ` (ö. ${c.vefat})` : ''}</li>`).join('')}</ul>` : '<p class="srcs">Takrîbü\'t-Tehzîb\'de eşleşen madde bulunamadı (râvi Kütüb-i Sitte râvisi olmayabilir).</p>'}<button type="button" class="more" id="rclose">Kapat</button>`;
      if (r.biyografi) {
        box.querySelector('#rclose').insertAdjacentHTML('beforebegin', '<div id="rbio" class="srcs">Biyografiler yükleniyor…</div>');
        loadGz(`/data/k4/r/${bt.dataset.r}.json.gz`).then(d => {
          const KM = R['ricâl_kitaplari'] || {};
          $('#rbio').outerHTML = `<h4 class="k1h">Ricâl ve tabakât kitaplarında</h4><div class="works">${d.biyografiler.map(x => { const k = KM[x.kitap] || {}; return `<details class="work"><summary><span class="who">${esc(k.muellif || '')} (ö. ${k.vefat || '?'})</span><span class="wt">${esc(k.ad || x.kitap)}</span><span class="tag" dir="ltr">nr. ${esc(x.no)}</span><span class="tag ${x.guven === 'güçlü' ? 'v' : 'w'}">${x.guven === 'güçlü' ? 'ad tam uyuşuyor' : 'zayıf eşleşme — kontrol edin'}</span></summary><div class="pgs">${chain([{ r: 'Madde', t: `nr. ${x.no}` }, { r: 'Eser', t: `${k.muellif}, ${k.ad}`, u: oiUrl(k.openiti) }, { r: 'Veri', k: 'openiti' }, { r: 'Eşleşme', t: R['ricâl_yontem'], b: 'ricali' }])}<p class="pt ar" dir="rtl">${esc(x.metin)}</p></div></details>`; }).join('')}</div>`;
        }).catch(e => { $('#rbio').textContent = e.message; });
      }
      box.hidden = false; box.scrollIntoView({ block: 'nearest' });
      $('#rclose').addEventListener('click', () => { box.hidden = true; });
    }));
  });

  groupSec('hds', ['hadis'], async () => {
    const H = await load(`/data/k4/he/${s}.json`).catch(() => null);
    const ids = H?.ayet?.[id] || [];
    if (!ids.length) return '';
    return `<h4 class="k1h">Hadis Ansiklopedisi (Türkçe) <span class="tag v">kaynaklı · HadeethEnc</span></h4><div class="works">${ids.map(i => { const h = H.hadis[i]; const t = h.tr || {}; const a = h.ar || {}; return `<details class="work"><summary><span class="who">${esc(t.title || a.title || '')}</span>${(t.grade || a.grade) ? `<span class="tag v">${esc(t.grade || a.grade)}</span>` : ''}${(t.attribution || a.attribution) ? `<span class="tag">${esc(t.attribution || a.attribution)}</span>` : ''}</summary><div class="pgs">${chain([{ r: 'Hadis', t: `HadeethEnc no ${i}`, u: h.url }, { r: 'Kaynakları', t: (a.reference || '').slice(0, 300) }, { r: 'Ayet bağı', t: 'makine: hadis metni ve şerhindeki ayet alıntısı', b: 'hadeethenc' }])}${t.hadeeth ? `<p class="pt">${para(t.hadeeth)}</p>` : ''}<p class="pt ar" dir="rtl">${para(a.hadeeth || '')}</p>${t.explanation ? `<details class="tah"><summary>Açıklama (Türkçe)</summary><p class="pt">${para(t.explanation)}</p></details>` : ''}${a.explanation ? `<details class="tah"><summary>الشرح</summary><p class="pt ar" dir="rtl">${para(a.explanation)}</p></details>` : ''}${(t.hints || []).length ? `<details class="tah"><summary>Faydalar</summary><ul>${t.hints.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}${a.reference ? `<p class="srcs">${esc(a.reference)}</p>` : ''}</div></details>`; }).join('')}</div><h4 class="k1h">Hadis kitaplarında</h4>`;
  });
  groupSec('fkh', ['fikih'], async b => b.k7.fetva.length ? `<h4 class="k1h">Fetvalar <span class="tag v">kaynaklı · Quranpedia</span></h4><div class="works">${b.k7.fetva.map(f => `<details class="work"><summary><span class="who">${esc(f.muftu || '—')}</span><span class="wt ar">${esc(f.soru.slice(0, 140))}</span></summary><div class="pgs">${chain([{ r: 'Fetva', t: `${f.muftu || ''}${f.kategori ? ' · ' + f.kategori : ''}` }, { r: 'Veri', k: 'quranpedia' }, { r: 'İşleme', b: 'paket' }])}<p class="pt ar" dir="rtl"><b>${esc(f.soru)}</b><br>${para(f.cevap)}</p></div></details>`).join('')}</div><h4 class="k1h">Fıkıh ve usûl kitaplarında</h4>` : '');
  groupSec('klm', ['kelam', 'tasavvuf', 'tarih']);
  groupSec('dil', ['dil', 'ulum']);
  groupSec('cgd', ['cagdas'], async b => b.notlar.length ? `<h4 class="k1h">Tedebbür notları <span class="tag">Quranpedia kullanıcı notları</span></h4><div class="works">${b.notlar.map(n => `<div class="pg"><div class="pgh"><span class="cite">${esc(n.yazar || '—')}</span>${n.kategori ? `<span class="tag">${esc(n.kategori)}</span>` : ''}</div><p class="pt ar" dir="rtl">${para(n.metin)}</p></div>`).join('')}</div><h4 class="k1h">Çağdaş ve diğer eserlerde</h4>` : '');

  // 15 — Kavramlar
  const roots = [...new Set(A.kelimeler.map(w => w.kok).filter(Boolean))];
  setD('kvr', roots.length ? `${roots.length} kök` : 'kök yok');
  once('kvr', async () => {
    const I = await load('/data/k5/index.json');
    $('#kvrbody').innerHTML = `<div class="works">${roots.map(r => `<details class="work" data-r="${esc(r)}"><summary><span class="wt ar" style="flex:0 1 auto;color:var(--ink);font-size:1.3rem">${esc(r)}</span><span class="tag ar">${esc(A.kelimeler.filter(w => w.kok === r).map(w => w.ar).join('، '))}</span>${I.kokler[r] === undefined ? '<span class="tag">lügat maddesi bulunamadı</span>' : ''}</summary><div class="pgs">Yükleniyor…</div></details>`).join('')}</div><p class="srcs" style="padding:0">Madde başları her lügatin kendi düzeninden ayrıştırılıp köke makineyle bağlandı. Lügatler: ${Object.values(I.lugatler).map(l => `${esc(l.muellif)} (ö. ${l.vefat}), ${esc(l.ad)}`).join(' · ')} — OpenITI.</p>`;
    $('#kvrbody').querySelectorAll('.work').forEach(det => det.addEventListener('toggle', async () => {
      if (!det.open || det.dataset.done) return; det.dataset.done = '1';
      const n = I.kokler[det.dataset.r]; const box = det.querySelector('.pgs');
      if (n === undefined) { box.innerHTML = '<p class="srcs">Bu kök için ayrıştırılmış lügat maddesi yok.</p>'; return; }
      const d = await loadGz(`/data/k5/r/${n}.json.gz`);
      const keys = Object.keys(I.lugatler).filter(k => d.lugat[k]).sort((x, y) => I.lugatler[x].vefat - I.lugatler[y].vefat);
      box.innerHTML = keys.map(k => `<details class="lx"${keys[0] === k ? ' open' : ''}><summary>${esc(I.lugatler[k].muellif)} (ö. ${I.lugatler[k].vefat}) — <span class="ar">${esc(I.lugatler[k].ad)}</span> <span class="tag" dir="ltr">madde: ${esc(d.lugat[k].bas)}</span></summary>${chain([{ r: 'Madde', t: d.lugat[k].bas }, { r: 'Eser', t: `${I.lugatler[k].muellif} (ö. ${I.lugatler[k].vefat}), ${I.lugatler[k].ad}`, u: oiUrl(I.lugatler[k].openiti) }, { r: 'Veri', k: 'openiti' }, { r: 'Kök bağı', t: 'makine: madde başı → kök harf karşılaştırması', b: 'k5' }])}<p class="pt ar" dir="rtl">${para(d.lugat[k].metin)}</p></details>`).join('');
    }));
  });

  // 16 — Karşılaştırmalı metinler
  load(`/data/k6/${s}.json`).then(K => { const L = K.ayetler[id] || []; setD('krs', L.length ? `${L.length} metin` : 'kayıt yok'); }).catch(() => setD('krs', '—'));
  once('krs', async () => {
    const L = (await load(`/data/k6/${s}.json`)).ayetler[id] || [];
    if (!L.length) { $('#krsbody').innerHTML = '<p class="srcs" style="padding:0">Corpus Coranicum bu ayet için Geç Antik Çağ paralel metni kaydetmiyor.</p>'; return; }
    $('#krsbody').innerHTML = `<div class="works">${L.map(x => `<details class="work" data-m="${x.id}"><summary><span class="who">${esc(x.baslik)}</span><span class="tag">${esc(x.ust)}</span><span class="tag">${esc(x.dil || '')}</span><span class="tag">${esc(x.tarih || '')}</span></summary><div class="pgs">Yükleniyor…</div></details>`).join('')}</div><p class="srcs" style="padding:0">Paralellik tespitleri Corpus Coranicum editörlerinindir (CC BY 4.0); açıklama ve çeviriler kaynağın dilinde (Almanca) verilir. İbranice Kitab-ı Mukaddes pasajlarına Sefaria'dan İngilizce JPS çevirisi eklendi.</p>`;
    $('#krsbody').querySelectorAll('.work').forEach(det => det.addEventListener('toggle', async () => {
      if (!det.open || det.dataset.done) return; det.dataset.done = '1';
      const m = await load(`/data/k6/m/${det.dataset.m}.json`);
      const blk = (h, t, rtl) => t ? `<h5 class="k6h">${h}</h5><p class="pt${rtl ? ' heb' : ''}" dir="${rtl ? 'rtl' : 'ltr'}">${para(t)}</p>` : '';
      det.querySelector('.pgs').innerHTML = blk(`Asıl metin (${esc(m.dil || '')})`, m.metin, m.yon === 'rtl') + blk('Transkripsiyon', m.transkripsiyon) + blk('İngilizce (Sefaria)', m.sefaria?.metin) + blk(`Grekçe — ${esc(m.lxx?.kaynak || '')}`, m.lxx?.metin) + blk(`Grekçe — ${esc(m.sblgnt?.kaynak || '')}`, m.sblgnt?.metin) + blk(`Süryanice — ${esc(m.pesitta?.kaynak || '')}`, m.pesitta?.metin, true) + blk(`Süryanice — ${esc(m.syrnt?.kaynak || '')}`, m.syrnt?.metin, true) + blk('Almanca çeviri (CC)', m.ceviri_de) + blk('İngilizce çeviri (CC)', m.ceviri_en) + blk('Açıklama (CC, Almanca)', m.not_de) +
        chain([{ r: 'Metin', t: `${m.baslik} — ${m.kaynak || ''}` }, m.tespit && { r: 'Paralelliği tespit eden', t: m.tespit }, { r: 'Madde', t: `Corpus Coranicum TUK ${m.id}${m.madde_yazari ? ', ' + m.madde_yazari : ''}`, u: m.cc }, { r: 'Veri', k: 'cc' }, m.sefaria && { r: 'Çeviri', t: m.sefaria.kaynak, k: 'sefaria' }, m.lxx && { r: 'Grekçe tanık', t: m.lxx.kaynak, u: 'https://github.com/eliranwong/LXX-Rahlfs-1935' }, m.sblgnt && { r: 'Grekçe tanık', t: m.sblgnt.kaynak, u: 'https://github.com/LogosBible/SBLGNT' }, m.pesitta && { r: 'Süryanice tanık', t: m.pesitta.kaynak, u: 'https://github.com/ETCBC/peshitta' }, m.syrnt && { r: 'Süryanice tanık', t: m.syrnt.kaynak, u: 'https://github.com/ETCBC/syrnt' }, { r: 'İşleme', b: 'k6' }]) +
        `<p class="srcs nesir">${[m.kaynak, m.tespit && 'Tespit: ' + m.tespit, m.madde_yazari && 'Madde: ' + m.madde_yazari, m.sefaria?.kaynak].filter(Boolean).map(esc).join(' · ')} · <a href="${esc(m.cc)}" target="_blank" rel="noopener">Corpus Coranicum'da aç</a></p><p class="links">Bu metnin bağlı olduğu ayetler: ${m.ayetler.map(x => `<a href="#/${x.replace(':', '/')}">${x}</a>`).join(' ')}</p>`;
    }));
  });

  // 17 — İhtilaflar
  once('iht', async () => {
    const [b, E, OZ] = await Promise.all([B, load('/data/k2/eserler.json'), load('/data/k7/ozet.json').catch(() => ({ ayetler: {} }))]);
    const oz = OZ.ayetler?.[id];
    const KN = { ihtilaf: 'ihtilaf', aqwal: 'görüşler', vucuh: 'vecihler' };
    $('#ihtbody').innerHTML = (oz ? `<div class="ozet"><h4 class="k1h">Türkçe özet <span class="tag w">makine özeti — kaynaklardan kontrol edin</span></h4>${oz.maddeler.map(m => `<div class="om"><b>${esc(m.mesele)}</b><p>${esc(m.ozet)}</p><p class="srcs">${m.kaynaklar.map(esc).join(' · ')} ${chain([{ r: 'Özet', t: 'makine özeti', k: 'claude' }, ...m.kaynaklar.map(x => ({ r: 'Dayandığı eser', t: x }))])}</p></div>`).join('')}</div>` : '') +
      (b.k7.ihtilaf.length ? `<div class="works">${b.k7.ihtilaf.map(r => { const e = E.eserler[r[0]] || {}; return `<div class="pg"><div class="pgh"><span class="cite">${esc(e.muellif || e.ad || r[0])}${e.vefat ? ` (ö. ${e.vefat})` : ''}</span><span class="ar">${esc(e.ad || '')}</span>${r[1] || r[2] ? `<span class="tag" dir="ltr">${r[1] ? 'c. ' + esc(r[1]) + ', ' : ''}s. ${esc(r[2])}</span>` : ''}<span class="tag">${KN[r[3]]}</span>${chain([{ r: 'Yer', t: [r[1] && `cilt ${r[1]}`, r[2] && `sayfa ${r[2]}`].filter(Boolean).join(', ') || '—' }, { r: 'Eser', t: `${e.muellif || ''}${e.vefat ? ` (ö. ${e.vefat})` : ''}, ${e.ad || ''}`, u: r[0].startsWith('qp') ? qpUrl(r[0].slice(2)) : null }, { r: 'Veri', k: r[0].startsWith('qp') ? 'quranpedia' : 'qul' }, { r: 'Tespit', t: 'makine: ihtilaf kalıbı araması', b: 'k7' }])}</div><p class="pt ar" dir="rtl">${esc(r[4])}</p></div>`; }).join('')}</div><p class="srcs" style="padding:0">Tefsir pasajlarında ihtilaf kalıpları (اختلف، قولان، أقوال، وجهان…) makineyle arandı; her kayıt ihtilafın geçtiği cümleyi ve yerini gösterir, hükmü değil.</p>` : '<p class="srcs" style="padding:0">Tefsir pasajlarında bu ayet için ihtilaf kalıbı bulunmadı.</p>');
  });

  // 18 — Literatür
  load(`/data/k8/${s}.json`).then(K => { const n = (K.ayet[id] || []).length; setD('lit', `${n} makale bu ayete · ${K.sure.length} sureye`); }).catch(() => setD('lit', '—'));
  once('lit', async () => {
    const [K, M] = await Promise.all([load(`/data/k8/${s}.json`), meta()]);
    const art = i => { const m = K.makale[i]; return `<div class="pg"><div class="pgh"><span class="cite">${esc(m.authors || '—')}</span>${m.year ? `<span class="tag" dir="ltr">${m.year}</span>` : ''} <span class="tag">${esc(m.journal || '')}</span>${chain([{ r: 'Makale', t: m.url, u: m.url }, { r: 'Künye ve özet', k: 'crossref' }, { r: 'Ayet bağı', t: 'makine: başlık/özetteki atıf', b: 'k8' }])}</div><p class="pt"><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a></p>${m.abstract ? `<p class="srcs" style="padding:0">${esc(m.abstract)}</p>` : ''}</div>`; };
    const ay = K.ayet[id] || [];
    $('#litbody').innerHTML = `${ay.length ? `<h4 class="k1h">Bu ayeti anan makaleler</h4>${ay.map(art).join('')}` : '<p class="srcs" style="padding:0">Başlığında ya da özetinde bu ayete açık atıf olan makale bulunmadı.</p>'}${K.sure.length ? `<details class="work"><summary><span class="who">${esc(M.sureler[s - 1].tr)} suresi hakkındaki makaleler</span><span class="tag" dir="ltr">${K.sure.length}</span></summary><div class="pgs">${K.sure.map(art).join('')}</div></details>` : ''}<p class="srcs" style="padding:0">Crossref'teki Kur'an çalışmaları; bağlar başlık ve özetteki atıflardan makineyle çıkarıldı. Tam metin için bağlantıya gidin.</p>`;
  });

  // 19 — Araştırma masası
  once('masa', async () => {
    const key = `masa:${id}`;
    const all = () => { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('masa:')) o[k.slice(5)] = localStorage.getItem(k); } } catch { /* yok */ } return o; };
    const list = () => Object.keys(all()).sort((x, y) => { const [a1, b1] = x.split(':').map(Number), [a2, b2] = y.split(':').map(Number); return a1 - a2 || b1 - b2; });
    $('#masabody').innerHTML = `<label for="masat" class="srcs" style="padding:0">Bu ayete notunuz (yalnızca bu tarayıcıda saklanır)</label><textarea id="masat" rows="6">${esc(store.get(key, ''))}</textarea><div class="masabar"><span id="masas" class="srcs" style="padding:0"></span><button type="button" class="more" id="masax">Tüm notları indir</button><label class="more">Notları içe aktar<input type="file" id="masai" accept="application/json" hidden></label></div><p class="links" id="masal"></p>`;
    const renderList = () => { const L = list(); $('#masal').innerHTML = L.length ? `Notlu ayetler: ${L.map(x => `<a href="#/${x.replace(':', '/')}">${x}</a>`).join(' ')}` : ''; };
    renderList();
    let tm;
    $('#masat').addEventListener('input', e => { clearTimeout(tm); tm = setTimeout(() => { const v = e.target.value; try { v.trim() ? localStorage.setItem(key, v) : localStorage.removeItem(key); $('#masas').textContent = 'Kaydedildi'; } catch { $('#masas').textContent = 'Bu tarayıcı kaydetmeye izin vermiyor; notu indirerek saklayın.'; } renderList(); }, 400); });
    $('#masax').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ vahiy: 'masa', tarih: new Date().toISOString(), notlar: all() }, null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = 'vahiy-notlar.json'; l.click(); URL.revokeObjectURL(u); });
    $('#masai').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); Object.entries(d.notlar || {}).forEach(([k, v]) => localStorage.setItem('masa:' + k, v)); $('#masas').textContent = `${Object.keys(d.notlar || {}).length} not içe aktarıldı`; $('#masat').value = store.get(key, ''); renderList(); } catch (err) { $('#masas').textContent = 'Dosya okunamadı: ' + err.message; } });
  });
}

/* ---------------- yatay kaydırma işareti (bütün site) ----------------
   Taşan her yatay şeridin devam eden kenarı solar ve ok düğmesi çıkar; sona gelince kaybolur. Sağdan sola şeritler de desteklenir. */
const KAY_SECICI = '.zc-serit, .fh-serit, .ss-ic, .siralar, .ek-sahne, .raf-turler, .raf-altlar, .zc-sz, .table-wrap, .zc-k-serit';
function kayIsaretle(el) {
  if (el._kay) return el._kay();
  const kap = el.parentElement; if (getComputedStyle(kap).position === 'static') kap.style.position = 'relative';
  const ok = yon => { const b = document.createElement('button'); b.type = 'button'; b.className = `kay-ok ${yon}`; b.setAttribute('aria-label', yon === 'sag' ? 'Sağa kaydır' : 'Sola kaydır'); b.innerHTML = yon === 'sag' ? '›' : '‹'; b.hidden = true; kap.appendChild(b); b.onclick = () => el.scrollBy({ left: (yon === 'sag' ? 1 : -1) * el.clientWidth * .8, behavior: 'smooth' }); return b; };
  const sag = ok('sag'), sol = ok('sol');
  const guncelle = () => {
    const tas = el.scrollWidth - el.clientWidth, sl = Math.abs(el.scrollLeft), rtl = getComputedStyle(el).direction === 'rtl';
    const solKalan = rtl ? tas - sl : sl, sagKalan = rtl ? sl : tas - sl;
    const v = tas > 6; sag.hidden = !(v && sagKalan > 6); sol.hidden = !(v && solKalan > 6);
    el.classList.toggle('kay-sag', !sag.hidden); el.classList.toggle('kay-sol', !sol.hidden);
    const ust = el.offsetTop + Math.min(el.offsetHeight, 260) / 2; sag.style.top = sol.style.top = `${ust}px`;
  };
  el.addEventListener('scroll', guncelle, { passive: true }); el._kay = guncelle; guncelle();
}
let _kayZ = 0;
const kayTara = () => { clearTimeout(_kayZ); _kayZ = setTimeout(() => document.querySelectorAll(KAY_SECICI).forEach(kayIsaretle), 120); };
new MutationObserver(kayTara).observe(document.body, { childList: true, subtree: true });
addEventListener('resize', kayTara); kayTara();

/* ---------------- Türkçe okuma (ücretsiz) ----------------
   Arapça metnin altına "Türkçe oku" düğmesi: metin 2.500 harflik parçalar halinde /api/cevir'e gider (Workers AI, ücretsiz kota,
   R2'de saklanır). Kota dolarsa ya da hata olursa Google Çeviri bağlantısı verilir. */
const gceviri = t => `https://translate.google.com/?sl=ar&tl=tr&op=translate&text=${encodeURIComponent(t.slice(0, 1800))}`;
function parcala(t, n = 2400) {
  const P = t.split(/\n+/).map(x => x.trim()).filter(Boolean), L = []; let acc = '';
  for (let p of P) { while (p.length > n) { const i = p.lastIndexOf(' ', n) > n / 2 ? p.lastIndexOf(' ', n) : n; if (acc) { L.push(acc); acc = ''; } L.push(p.slice(0, i)); p = p.slice(i).trim(); }
    if ((acc + '\n' + p).length > n && acc) { L.push(acc); acc = p; } else acc = acc ? acc + '\n' + p : p; }
  if (acc) L.push(acc); return L;
}
function turkceDugme(hedef, metinAl) {
  if (!hedef || hedef.parentElement.querySelector(':scope > .tr-kutu')) return;
  const k = document.createElement('div'); k.className = 'tr-kutu';
  k.innerHTML = '<button type="button" class="tr-dug">Türkçe oku</button>';
  hedef.after(k);
  k.querySelector('.tr-dug').onclick = async ev => {
    const b = ev.currentTarget, metin = metinAl().trim(); if (!metin) return;
    const P = parcala(metin); b.disabled = true; b.textContent = `Çevriliyor… 0/${P.length}`;
    const cikti = document.createElement('div'); cikti.className = 'tr-metin'; k.appendChild(cikti);
    for (let i = 0; i < P.length; i++) {
      let r; try { r = await fetch('/api/cevir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ metin: P[i] }) }); } catch { r = null; }
      const d = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok || !d.ceviri) {
        cikti.insertAdjacentHTML('beforeend', `<p class="tr-uyari">${esc(d.hata || 'Çeviri şu an yapılamadı.')} <a href="${gceviri(P.slice(i).join('\n'))}" target="_blank" rel="noopener">Google Çeviri'de aç</a></p>`); break; }
      cikti.insertAdjacentHTML('beforeend', d.ceviri.split(/\n+/).map(x => `<p>${esc(x)}</p>`).join(''));
      b.textContent = `Çevriliyor… ${i + 1}/${P.length}`;
    }
    b.remove();
    cikti.insertAdjacentHTML('afterbegin', '<small class="tr-not">Makine çevirisi (Qwen3, Cloudflare Workers AI): terim ve isimleri Arapça aslından kontrol edin.</small>');
    cikti.insertAdjacentHTML('beforeend', `<a class="tr-g" href="${gceviri(metin)}" target="_blank" rel="noopener">Google Çeviri ile karşılaştır</a>`);
  };
}
