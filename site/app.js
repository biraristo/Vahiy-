'use strict';
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const cache = {};
async function load(path) {
  if (!cache[path]) cache[path] = fetch(path).then(r => { if (!r.ok) throw new Error(path + ' yüklenemedi'); return r.json(); });
  return cache[path];
}
const fmt = n => n.toLocaleString('tr-TR');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const GENRE = {
  tefsir: 'Tefsir', ulum: "Ulûmü'l-Kur'ân", kiraat: 'Kıraat ve tecvid', dil: 'Dil', meal: 'Meal',
  mushaf: 'Mushaf', hadis: 'Hadis', fikih: 'Fıkıh', akaid: 'Akaid ve kelâm', tasavvuf: 'Tasavvuf ve ahlâk',
  tarih: 'Siyer ve tarih', edebiyat: 'Edebiyat', diger: 'Diğer', belirsiz: 'Sınıflandırılmamış'
};
const TEXT = { 'ayet-bolumlu': 'Ayet ayet', 'tam-metin': 'Tam metin', pdf: 'Yalnız PDF', kunye: 'Yalnız künye', 'kelime-bolumlu': 'Kelime kelime', 'yapisal-veri': 'Yapısal veri' };
const SOURCE = { quranpedia: 'Quranpedia', openiti: 'OpenITI', tafsir_api: 'QUL (tafsir_api)', tanzil: 'Tanzil', corpus_coranicum: 'Corpus Coranicum', 'github:mustafa0x/quran-morphology': 'QAC morfoloji' };

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach(a => a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}

/* ---------------- Atlas ---------------- */
let atlasOrder = 'mushaf';
async function atlas() {
  setNav('atlas');
  const { surahs, source } = await load('/data/surahs.json');
  const ready = surahs.filter(s => s.status === 'hazir').length;
  view.innerHTML = `
    <div class="atlas-head">
      <div>
        <h1>Kur'an atlası</h1>
        <p class="lede">${ready ? `${ready} sure hazır, ${114 - ready} sure sırada.` : 'Henüz hazır sure yok. Sureler tamamlandıkça burada açılacak.'} Hücre genişliği surenin ayet sayısını gösterir.</p>
      </div>
      <div>
        <div class="switch" role="group" aria-label="Sıralama">
          <button type="button" data-order="mushaf" aria-pressed="${atlasOrder === 'mushaf'}">Mushaf sırası</button>
          <button type="button" data-order="nuzul" aria-pressed="${atlasOrder === 'nuzul'}">Nüzul sırası</button>
        </div>
        <p class="source-note" id="order-src"></p>
      </div>
    </div>
    <div class="atlas" id="atlas"></div>
    <p class="tip" id="tip" aria-live="polite"></p>
    <div class="legend"><span><i class="g"></i>Hazır</span><span><i></i>Sırada</span><span><b>Mavi numara</b>: Medenî</span></div>`;
  const box = $('#atlas');
  const maxA = Math.max(...surahs.map(s => s.ayas));
  for (const s of surahs) {
    const ok = s.status === 'hazir';
    const el = document.createElement(ok ? 'a' : 'div');
    el.className = `cell ${ok ? 'ready' : 'waiting'} ${s.type === 'Medenî' ? 'medeni' : ''}`;
    if (ok) el.href = `#/sure/${s.n}`; else el.tabIndex = 0;
    el.dataset.n = s.n;
    el.style.setProperty('--r', Math.sqrt(s.ayas / maxA).toFixed(3));
    el.innerHTML = `<span class="n">${s.n}</span><span class="ar">${esc(s.ar)}</span>`;
    el.setAttribute('aria-label', `${s.n}. ${s.tr} suresi, ${s.ayas} ayet, ${s.type}, nüzul sırası ${s.nuzul}${ok ? ', hazır' : ', sırada'}`);
    const tip = () => { $('#tip').textContent = `${s.n}. ${s.tr} · ${s.ayas} ayet · ${s.type} · nüzul ${s.nuzul}. sırada · ${ok ? 'hazır' : 'henüz işlenmedi'}`; };
    el.addEventListener('mouseenter', tip); el.addEventListener('focus', tip);
    box.appendChild(el);
  }
  const arrange = (animate) => {
    const cells = [...box.children];
    const first = new Map(cells.map(c => [c, c.getBoundingClientRect()]));
    const key = atlasOrder === 'mushaf' ? (c => +c.dataset.n) : (c => surahs[c.dataset.n - 1].nuzul);
    cells.sort((a, b) => key(a) - key(b)).forEach(c => box.appendChild(c));
    $('#order-src').textContent = atlasOrder === 'mushaf' ? 'Mevcut mushaf tertibi' : `Kaynak: ${source.tertip_nuzul}`;
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cells.forEach(c => {
      const a = first.get(c), b = c.getBoundingClientRect();
      c.style.transition = 'none';
      c.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`;
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
function norm(s) {
  return String(s || '').normalize('NFKC').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLocaleLowerCase('tr');
}
async function library() {
  setNav('kutuphane');
  view.innerHTML = '<p class="lede">Katalog yükleniyor…</p>';
  const [sum, rows] = await Promise.all([load('/data/library-summary.json'), load('/data/catalog.json')]);
  const tbl = (obj, map = x => x) => `<table class="kv">${Object.entries(obj).map(([k, v]) => `<tr><td>${esc(map(k))}</td><td>${fmt(v)}</td></tr>`).join('')}</table>`;
  view.innerHTML = `
    <h1>Kütüphane</h1>
    <p class="lede">Erişilebilen bütün kaynaklardaki eserlerin kataloğu. Bir eserin katalogda olması metninin işlendiği anlamına gelmez; metin durumu sütunu neyin elde olduğunu gösterir.</p>
    <div class="stats">
      <div><p class="total">${fmt(sum.kayit_toplam)}</p><p class="total-label">katalog kaydı · tahminen ${fmt(sum.tekil_eser_tahmini)} tekil eser<br>${fmt(sum.indirilen)} kaydın metni indirildi · güncelleme ${esc(sum.tarih)}</p></div>
      <div><h2>Kaynağa göre</h2>${tbl(sum.kaynaga_gore, k => SOURCE[k] || k)}</div>
      <div><h2>Türe göre</h2>${tbl(sum.ture_gore, k => GENRE[k] || k)}</div>
      <div><h2>Metin durumu</h2>${tbl(sum.metin_durumuna_gore, k => TEXT[k] || k)}</div>
    </div>
    <div class="filters">
      <input id="q" type="search" placeholder="Eser veya müellif ara (Arapça ya da Latin)" aria-label="Eser veya müellif ara">
      <select id="fg" aria-label="Tür"><option value="">Bütün türler</option>${Object.keys(sum.ture_gore).map(k => `<option value="${k}">${esc(GENRE[k] || k)}</option>`).join('')}</select>
      <select id="fs" aria-label="Kaynak"><option value="">Bütün kaynaklar</option>${Object.keys(sum.kaynaga_gore).map(k => `<option value="${k}">${esc(SOURCE[k] || k)}</option>`).join('')}</select>
      <select id="ft" aria-label="Metin durumu"><option value="">Her metin durumu</option>${Object.keys(sum.metin_durumuna_gore).map(k => `<option value="${k}">${esc(TEXT[k] || k)}</option>`).join('')}</select>
    </div>
    <p class="count" id="cnt"></p>
    <div class="table-wrap"><table class="works"><thead><tr><th class="rt">Eser</th><th class="rt">Müellif</th><th class="num">Vefat (h.)</th><th class="hide-sm">Tür</th><th class="hide-sm">Kaynak</th><th>Metin</th></tr></thead><tbody id="tb"></tbody></table></div>
    <button class="more" id="more" hidden>Daha fazla göster</button>`;
  // satır: [id, eser, müellif, vefat, tür, dil, kaynak, metin, indirildi, latin]
  const idx = rows.map(r => norm(r[1] + ' ' + r[2] + ' ' + (r[9] || '')));
  let shown = 0, hits = [];
  const draw = (reset) => {
    if (reset) { shown = 0; $('#tb').innerHTML = ''; }
    const part = hits.slice(shown, shown + 200);
    $('#tb').insertAdjacentHTML('beforeend', part.map(i => {
      const r = rows[i];
      return `<tr><td class="t">${esc(r[1])}</td><td class="t">${esc(r[2])}</td><td class="num">${r[3] ?? '–'}</td><td class="hide-sm">${esc(GENRE[r[4]] || r[4])}</td><td class="hide-sm">${esc(SOURCE[r[6]] || r[6])}</td><td><span class="badge ${r[8] ? 'ok' : ''}">${esc(TEXT[r[7]] || r[7])}${r[8] ? ' · elde' : ''}</span></td></tr>`;
    }).join(''));
    shown += part.length;
    $('#cnt').textContent = `${fmt(hits.length)} kayıt${hits.length > shown ? `, ilk ${fmt(shown)} gösteriliyor` : ''}`;
    $('#more').hidden = shown >= hits.length;
  };
  const run = () => {
    const q = norm($('#q').value.trim()), g = $('#fg').value, s = $('#fs').value, t = $('#ft').value;
    hits = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (g && r[4] !== g) continue; if (s && r[6] !== s) continue; if (t && r[7] !== t) continue;
      if (q && !idx[i].includes(q)) continue;
      hits.push(i);
    }
    draw(true);
  };
  let timer; $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 150); });
  ['#fg', '#fs', '#ft'].forEach(id => $(id).addEventListener('change', run));
  $('#more').addEventListener('click', () => draw(false));
  run();
}

/* ---------------- Sure ---------------- */
async function surah(n) {
  setNav('atlas');
  const { surahs } = await load('/data/surahs.json');
  const s = surahs[n - 1];
  if (!s) { view.innerHTML = '<h1>Böyle bir sure yok</h1><p><a href="#/">Atlasa dön</a></p>'; return; }
  if (s.status !== 'hazir') {
    view.innerHTML = `<div class="empty"><p class="ar-title" lang="ar" dir="rtl">${esc(s.ar)}</p><h1>${s.n}. ${esc(s.tr)}</h1>
      <p class="lede">Bu sure henüz işlenmedi. Hazır olduğunda atlasta altın renkte görünecek.</p><p><a href="#/">Atlasa dön</a></p></div>`;
    return;
  }
  view.innerHTML = `<h1>${s.n}. ${esc(s.tr)}</h1><p class="lede">Sure sayfası yükleniyor…</p>`;
}

/* ---------------- Yönlendirme ---------------- */
async function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  try {
    if (h === '/' || h === '/atlas') await atlas();
    else if (h === '/kutuphane') await library();
    else if (h.startsWith('/sure/')) await surah(+h.split('/')[2]);
    else await atlas();
  } catch (e) {
    view.innerHTML = `<h1>Sayfa açılamadı</h1><p class="lede">${esc(e.message)}. Sayfayı yenileyin; sorun sürerse veri dosyası eksik olabilir.</p>`;
  }
  view.focus({ preventScroll: true });
}
addEventListener('hashchange', route);
route();
