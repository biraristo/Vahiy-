'use strict';
/* vahiy++ — statik istemci. Bütün veri /data altındaki hazır JSON dosyalarından okunur; sunucuda hesap yapılmaz. */
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const cache = {};
const load = (p) => (cache[p] ||= fetch(p).then(r => { if (!r.ok) throw new Error(`${p} yüklenemedi (${r.status})`); return r.json(); }));
const fmt = n => Number(n).toLocaleString('tr-TR');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* yok */ } } };

const RAVI = { 'ورش': 'Verş', 'قالون': 'Kālûn', 'البزي': 'Bezzî', 'قنبل': 'Kunbul', 'الدوري': 'Dûrî', 'السوسي': 'Sûsî', 'شعبة': "Şu'be", 'حفص': 'Hafs' };
const SAYIM = { 'الكوفي': 'Kûfî', 'المدني الأول': 'Medenî-i evvel', 'المدني الأخير': 'Medenî-i âhir', 'المكي': 'Mekkî', 'البصري': 'Basrî', 'الشامي': 'Şâmî' };
const LAYERS = [
  ['Kur\'an iskeleti', true], ['Kur\'an içi ağ', true], ['Ayet ayet kaynaklar (tefsir, kıraat, esbâb)', false], ['Külliyat alıntı indeksi', false],
  ['Aktarım, hadis, ricâl', false], ['Kavramlar', false], ['Karşılaştırmalı metinler', false], ['Görüş ve ihtilaf', false], ['Literatür ve masa', false],
];
const LATER = [
  [2, 'Tefsirler', '~200 tefsirin bu ayete dair pasajları, dönemlere göre'],
  [2, 'Esbâb-ı nüzûl ve nâsih-mensûh', 'Nüzul sebebi rivayetleri ve nesih tartışmaları'],
  [3, 'Hadis ve rivayet', 'Hadis kitaplarında bu ayetin geçtiği yerler'],
  [3, 'Fıkıh ve usûl', 'Ahkâm, fıkıh usulü ve mezhep kitaplarında kullanımı'],
  [3, 'Kelâm, tasavvuf, tarih', 'Diğer ilimlerde bu ayetin kullanımı'],
  [4, 'Râviler ve ricâl', 'Rivayetlerin isnadları ve râvilerin biyografileri'],
  [5, 'Kavramlar', 'Kelimelerin kavram tarihi ve lügat maddeleri'],
  [6, 'Karşılaştırmalı metinler', 'Tevrat, Talmud, İncil ve Geç Antik Çağ paralelleri'],
  [7, 'İhtilaflar', 'Ayette tartışılan meseleler ve müfessirlerin görüşleri'],
  [8, 'Akademik literatür', 'Bu ayetle ilgili makaleler: özet ve bağlantı'],
];

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach(a => a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}
async function meta() {
  const m = await load('/data/k0/surahs.json');
  if (!m._off) { let o = 0; m._off = m.sureler.map(s => { const v = o; o += s.ayet; return v; }); }
  return m;
}
const surahOptions = (S, sel) => S.sureler.map(s => `<option value="${s.n}"${s.n === sel ? ' selected' : ''}>${s.n}. ${esc(s.tr)} — ${esc(s.ar)}</option>`).join('');

/* ---------------- Açılış ---------------- */
async function home() {
  setNav('');
  const S = await meta();
  const last = (store.get('son', '1:1')).split(':').map(Number);
  view.innerHTML = `<section class="home"><div class="picker">
      <p class="basmala" lang="ar">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
      <form id="go" aria-label="Sure ve ayet seçimi">
        <select id="ps" aria-label="Sure">${surahOptions(S, last[0])}</select>
        <input id="pa" type="number" min="1" inputmode="numeric" aria-label="Ayet numarası" value="${last[1]}">
        <button type="submit">Ayeti aç</button>
      </form>
      <p class="hint" id="ph"></p>
    </div></section>`;
  const sync = () => { const s = S.sureler[$('#ps').value - 1]; $('#pa').max = s.ayet; $('#ph').textContent = `${s.tr} suresi ${s.ayet} ayet · ${s.tur}`; };
  $('#ps').addEventListener('change', () => { $('#pa').value = 1; sync(); });
  sync();
  $('#go').addEventListener('submit', e => {
    e.preventDefault();
    const s = +$('#ps').value, max = S.sureler[s - 1].ayet;
    const a = Math.min(Math.max(1, +$('#pa').value || 1), max);
    location.hash = `#/${s}/${a}`;
  });
}

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
  const mealOpts = Object.entries(groups).map(([d, ms]) => `<optgroup label="${esc(d)} (${ms.length})">${ms.map(m => `<option value="${m.id}"${m.id === mealId ? ' selected' : ''}>${esc(m.ad)}${m.mutercim && m.mutercim !== m.ad ? ' — ' + esc(m.mutercim) : ''}</option>`).join('')}</optgroup>`).join('');
  const k = A.konum;
  const t = su.tertip;
  const ihtilaf = su.ihtilaf || {};
  const sayim = A.sayim_farki || [];

  view.innerHTML = `<div class="ayah-layout">
  <aside class="left">
    <div class="card">
      <h3>Sure ve ayet</h3>
      <select id="ls" aria-label="Sure">${surahOptions(S, s)}</select>
      <div class="navbtns">
        <a href="${prev ? `#/${prev[0]}/${prev[1]}` : '#'}" aria-disabled="${!prev}" aria-label="Önceki ayet">‹ Önceki</a>
        <a href="${next ? `#/${next[0]}/${next[1]}` : '#'}" aria-disabled="${!next}" aria-label="Sonraki ayet">Sonraki ›</a>
      </div>
      <nav class="alist" aria-label="${esc(su.tr)} ayetleri">${D.ayetler.map(x => `<a href="#/${s}/${x.a}" ${x.a === a ? 'aria-current="true"' : ''}>${x.a}. ayet</a>`).join('')}</nav>
    </div>
    <div class="card ctx" id="ctx"><h3>Ayetin bağlamı</h3></div>
  </aside>

  <section class="center">
    <header class="head">
      <p class="where-line"><a href="#/">Kur'an</a> › <b>${s}. ${esc(su.tr)}</b> › <b>${a}. ayet</b> · Hafs ʿan ʿÂsım · Kûfî sayım</p>
      <p class="verse" lang="ar">${esc(A.metin)} <span class="no">﴿${a.toLocaleString('ar-EG')}﴾</span></p>
      <div class="meal-row">
        <label for="msel">Meal</label>
        <select id="msel">${mealOpts}</select>
        <span class="src" id="msrc"></span>
      </div>
      <p class="meal" id="mtext">…</p>
    </header>

    <details class="sec" open>
      <summary><span class="num">1</span><span class="t">Bu ayet nerede</span><span class="d">Katman 0</span></summary>
      <div class="body">
        <div class="facts">
          <div class="fact"><span class="k">Mushaf tertibi</span><span class="v">${s}. sure, ${a}/${su.ayet}. ayet</span><span class="s">${k.cuz}. cüz · ${k.hizb}. hizb · ${k.sayfa}. sayfa</span></div>
          <div class="fact${ihtilaf.nuzul_misir ? ' warn' : ''}"><span class="k">Nüzul sırası (Mısır)</span><span class="v">${t.nuzul_misir}. sırada</span><span class="s">Tanzil${ihtilaf.nuzul_misir ? ` · Quranpedia: ${esc(ihtilaf.nuzul_misir.Quranpedia)}` : ' · Quranpedia ile aynı'}</span></div>
          <div class="fact"><span class="k">Nöldeke–Schwally sırası</span><span class="v">${t.noldeke}. sırada</span><span class="s">ikincil aktarım (Robinson 2003)</span></div>
          <div class="fact${ihtilaf.tur ? ' warn' : ''}"><span class="k">Mekkî / Medenî</span><span class="v">${esc(su.tur)}</span><span class="s">${ihtilaf.tur ? `Kaynaklar ayrışıyor · Quranpedia: ${esc(ihtilaf.tur.Quranpedia)}` : 'Tanzil = Quranpedia'}</span></div>
          <div class="fact"><span class="k">Rükû · menzil</span><span class="v">${k.ruku}. rükû · ${k.menzil}. menzil</span></div>
          ${A.secde ? `<div class="fact"><span class="k">Secde</span><span class="v">Secde ayeti</span><span class="s">${A.secde === 'obligatory' ? 'vâcib (Tanzil)' : 'tavsiye (Tanzil)'}</span></div>` : ''}
          ${A.cc_yapi && A.cc_yapi.length ? `<div class="fact"><span class="k">Fâsıla (kafiye) · bölüm</span><span class="v">${esc([...new Set(A.cc_yapi.map(x => x.kafiye).filter(Boolean))].join(', ') || '—')}</span><span class="s">Corpus Coranicum, ${A.cc_yapi[0].bolum ?? '—'}. bölüm</span></div>` : ''}
        </div>
        ${sayim.length ? `<p class="note"><b>Sayım farkı:</b> ${sayim.map(x => `${esc(RAVI[x.rivayet] || x.rivayet)} (${esc(SAYIM[x.sayim] || x.sayim)}) bu ayeti ${x.durum === 'bölünüyor' ? `iki ayete böler: ${x.ayet_no.join(' ve ')}. ayetler` : `başka ayetle birleştirir: ${x.ayet_no.join(', ')}. ayet (Hafs ${x.hafs_karsiligi.join('–')})`}`).join(' · ')}</p>` : ''}
      </div>
    </details>

    <details class="sec" open>
      <summary><span class="num">2</span><span class="t">Kelimeler</span><span class="d">${A.kelimeler.length} kelime · kök ve i'râb</span></summary>
      <div class="body">
        <div class="words" role="group" aria-label="Kelimeler">${A.kelimeler.map((w, i) => `<button type="button" class="w" data-i="${i}" aria-pressed="false"><span class="a" lang="ar">${esc(w.ar)}</span><span class="m">${esc(w.tr || '')}</span></button>`).join('')}</div>
        <div class="wdetail" id="wd" hidden></div>
      </div>
    </details>

    <details class="sec" id="riv">
      <summary><span class="num">3</span><span class="t">Rivayetler ve sayım</span><span class="d">8 rivayette metin ve ayet numarası</span></summary>
      <div class="body" id="rivbody">Açınca yüklenir.</div>
    </details>

    <details class="sec">
      <summary><span class="num">4</span><span class="t">Kıraat</span><span class="d">${A.cc_kiraat && A.cc_kiraat.okuyus ? `${A.cc_kiraat.okuyus} okuyuş · ${A.cc_kiraat.kaynak_eser} kaynak eser` : 'kayıt yok'}</span></summary>
      <div class="body"><p style="font-family:var(--sans);margin:0">${A.cc_kiraat && A.cc_kiraat.okuyus ? `Corpus Coranicum bu ayet için ${A.cc_kiraat.okuyus} okuyuş kaydediyor (${A.cc_kiraat.kaynak_eser} kaynak eserden). Okuyuşların listesi, okuyanları ve kaynak eserleri Katman 2 ile bu bölümde açılacak.` : 'Corpus Coranicum veri tabanında bu ayet için kıraat kaydı yok. Bu, ayette kıraat farkı olmadığı anlamına gelmez; yalnızca o veri tabanının kapsamını gösterir.'}</p></div>
    </details>

    <details class="sec" id="k1" open>
      <summary><span class="num">5</span><span class="t">Kur'an içi ilişkiler</span><span class="d" id="k1d">Katman 1</span></summary>
      <div class="body" id="k1body">Yükleniyor…</div>
    </details>

    ${LATER.map(([L, title, d], i) => `<details class="sec later"><summary><span class="num">${i + 6}</span><span class="t">${esc(title)}</span><span class="d">Katman ${L} ile gelecek</span></summary></details>`).join('')}
  </section>

  <aside class="right">
    <div class="card">
      <h3>Bu sayfanın kapsamı</h3>
      ${LAYERS.map(([n, done], i) => `<div class="layer${done ? ' done' : ''}"><i>${done ? '●' : '○'}</i><span>${i}. ${esc(n)}</span></div>`).join('')}
    </div>
    <div class="card">
      <h3>${esc(su.tr)} suresi</h3>
      <dl>
        <dt>Arapça</dt><dd class="ar" style="font-size:1.2rem">${esc(su.ar)}</dd>
        <dt>Ayet</dt><dd>${su.ayet} (Kûfî)</dd>
        <dt>Kelime</dt><dd>${fmt(su.kelime)}</dd>
        <dt>Tür</dt><dd>${esc(su.tur)}${ihtilaf.tur ? ' <span class="tag w">ihtilaflı</span>' : ''}</dd>
        <dt>Nüzul</dt><dd>Mısır ${t.nuzul_misir} · Nöldeke ${t.noldeke}</dd>
        <dt>Rükû</dt><dd>${su.ruku}</dd>
      </dl>
      <h3 style="margin-top:.9rem">Rivayetlere göre ayet sayısı</h3>
      <dl>${Object.entries(su.rivayetlere_gore_ayet_sayisi).map(([r, n]) => { const m = r.match(/^(.*) \((.*)\)$/); return `<dt>${esc(RAVI[m?.[1]] || r)}</dt><dd>${n}${m ? ` · ${esc(SAYIM[m[2]] || m[2])}` : ''}</dd>`; }).join('')}</dl>
    </div>
    <div class="card">
      <h3>Kaynaklar</h3>
      <ul class="srcs">${Object.values(S.kaynaklar).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="srcs" style="padding:0">Veri sürümü: ${esc(D.version)}</p>
    </div>
  </aside>
  </div>`;

  $('#ls').addEventListener('change', e => { location.hash = `#/${e.target.value}/1`; });
  const cur = view.querySelector('.alist [aria-current="true"]');
  if (cur) cur.parentElement.scrollTop = cur.offsetTop - cur.parentElement.clientHeight / 2;

  const ctx = (arr) => {
    const item = (p, label) => p ? `<a href="#/${p[0]}/${p[1]}">${label}: ${esc(S.sureler[p[0] - 1].tr)} ${p[0]}:${p[1]}</a><p>${esc((arr[S._off[p[0] - 1] + p[1] - 1] || '').slice(0, 140))}…</p>` : '';
    $('#ctx').innerHTML = `<h3>Ayetin bağlamı</h3>${item(prev, 'Önceki')}${item(next, 'Sonraki')}`;
  };
  const showMeal = async (id) => {
    const m = MI.mealler.find(x => x.id === id) || MI.mealler[0];
    $('#msrc').textContent = `${m.kaynak}${m.diger_kaynaklar.length ? ' (+' + m.diger_kaynaklar.join(', ') + ')' : ''}`;
    $('#mtext').textContent = '…';
    try {
      const arr = await load(`/data/meal/${m.id}.json`);
      const tx = arr[S._off[s - 1] + a - 1] || '(Bu mealde bu ayet boş.)';
      $('#mtext').textContent = tx;
      $('#mtext').dir = /[؀-ۿ]/.test(tx.slice(0, 40)) ? 'rtl' : 'ltr';
      ctx(arr);
    } catch (e) { $('#mtext').textContent = e.message; }
  };
  $('#msel').addEventListener('change', e => { store.set('meal', e.target.value); showMeal(e.target.value); });
  showMeal(mealId);

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
    <p class="srcs" style="margin-top:.5rem;padding:0">Morfoloji: Quranic Arabic Corpus${w.dogrulandi_qac ? ' (QAC elle doğrulanmış)' : ''} · Kelime meali: Quran.com</p>`;
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
    el.href = `#/${s.n}/1`;
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
    </div>
    <p class="count" id="cnt"></p>
    <div class="table-wrap"><table class="works"><thead><tr><th class="rt">Eser</th><th class="rt">Müellif</th><th class="num">Vefat (h.)</th><th class="hide-sm">Tür</th><th class="hide-sm">Kaynak</th><th>Metin</th></tr></thead><tbody id="tb"></tbody></table></div>
    <button class="more" id="more" hidden>Daha fazla göster</button>`;
  const idx = rows.map(r => norm(r[1] + ' ' + r[2] + ' ' + (r[9] || '')));
  let shown = 0, hits = [];
  const draw = (reset) => {
    if (reset) { shown = 0; $('#tb').innerHTML = ''; }
    const part = hits.slice(shown, shown + 200);
    $('#tb').insertAdjacentHTML('beforeend', part.map(i => { const r = rows[i]; return `<tr><td class="tt">${esc(r[1])}</td><td class="tt">${esc(r[2])}</td><td class="num">${r[3] ?? '–'}</td><td class="hide-sm">${esc(GENRE[r[4]] || r[4])}</td><td class="hide-sm">${esc(SOURCE[r[6]] || r[6])}</td><td><span class="badge ${r[8] ? 'ok' : ''}">${esc(TEXT[r[7]] || r[7])}${r[8] ? ' · elde' : ''}</span></td></tr>`; }).join(''));
    shown += part.length;
    $('#cnt').textContent = `${fmt(hits.length)} kayıt${hits.length > shown ? `, ilk ${fmt(shown)} gösteriliyor` : ''}`;
    $('#more').hidden = shown >= hits.length;
  };
  const run = () => {
    const q = norm($('#q').value.trim()), g = $('#fg').value, s = $('#fs').value, t = $('#ft').value;
    hits = [];
    for (let i = 0; i < rows.length; i++) { const r = rows[i]; if (g && r[4] !== g) continue; if (s && r[6] !== s) continue; if (t && r[7] !== t) continue; if (q && !idx[i].includes(q)) continue; hits.push(i); }
    draw(true);
  };
  let timer; $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 150); });
  ['#fg', '#fs', '#ft'].forEach(id => $(id).addEventListener('change', run));
  $('#more').addEventListener('click', () => draw(false));
  run();
}

/* ---------------- Yönlendirme ---------------- */
async function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  const m = h.match(/^\/(\d{1,3})\/(\d{1,3})$/);
  try {
    if (m) await ayah(+m[1], +m[2]);
    else if (h === '/atlas') await atlas();
    else if (h === '/kutuphane') await library();
    else await home();
  } catch (e) {
    view.innerHTML = `<h1>Sayfa açılamadı</h1><p class="lede">${esc(e.message)}. Sayfayı yenileyin; sorun sürerse veri dosyası eksik olabilir.</p>`;
  }
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}
addEventListener('hashchange', route);
route();
