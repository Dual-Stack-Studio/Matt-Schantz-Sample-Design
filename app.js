(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const VW = () => document.documentElement.clientWidth || window.innerWidth;
const VH = () => document.documentElement.clientHeight || window.innerHeight;
const touch = matchMedia('(hover: none)').matches;
const isUrl = p => /^https?:/.test(p);
const sz = (u, w, q) => /cdn\.sanity\.io/.test(u) && !u.includes('?') ? `${u}?w=${w}&q=${q}&auto=format` : u;        // Sanity resizes images on the fly
const A = p => isUrl(p) ? sz(p, 1920, 80) : 'assets/' + p;
const mid = src => isUrl(src) ? sz(src, 1200, 76) : 'mid/' + src.replace(/^matt\//, '').replace('/', '-');       // 1200 px copy: carousel and mosaic use it, the lightbox and the project header use the full file
const MAN = window.MAN || {};
const ratio = p => { const m = MAN[p]; return m ? m[0] / m[1] : 1.5; };
const P = window.PROJECTS, V = window.VIDEOS;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const pad = n => String(n).padStart(2, '0');
const imgsOf = p => p.items.filter(i => i.t === 'img');

const detail = $('#detail'), wrap = $('#dwrap'), prog = $('#dprog');
let paused = false;

/* ------------------------------------------------ hero name fitted to the width */
let lastVW = 0, lastVH = 0;
function fitName(force) {
  const w0 = VW(), h0 = VH();
  if (!force && w0 === lastVW && Math.abs(h0 - lastVH) < 140) return;      // a phone's toolbar growing/shrinking must not re-layout the hero
  lastVW = w0; lastVH = h0;
  const name = $('#name'), span = $('#nameFit'), hero = $('#hero');
  const cs = getComputedStyle(hero), padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
  const W = hero.clientWidth, avail = W - padL - padR, H = h0;
  name.style.setProperty('--fs', '100px');
  const w = span.getBoundingClientRect().width;
  if (!w) return;
  let fs = Math.floor(100 * avail / w * 0.995);
  // the photo covers about 80% of the hero (bottom and right flush), never wider than 2:1 so the whole face stays in frame;
  // on a tall phone it is simply cropped by height and the face stays centred
  const hgt = Math.min(H, Math.max(.82 * H, Math.sqrt(.4 * W * H)));
  const ptop = H - hgt, ph = hgt, pw = Math.min(W, 2 * hgt);
  const imgH = Math.max(pw * .75, ph), eyes = ptop + .38 * imgH;           // the name keeps its bottom edge above the eyes
  fs = Math.min(fs, Math.max(Math.min(fs, 190), Math.floor((eyes - 34 - 86) / 1.6)));
  name.style.setProperty('--fs', fs + 'px');
  hero.style.setProperty('--fs-px', fs);
  hero.style.setProperty('--ptop', Math.round(ptop) + 'px'); hero.style.setProperty('--ph', Math.round(ph) + 'px'); hero.style.setProperty('--pw', Math.round(pw) + 'px');
  hero.style.setProperty('--pr', '0px'); hero.style.setProperty('--hh', H + 'px'); hero.style.setProperty('--opy', '0%');
}
fitName(true);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitName(true));
addEventListener('resize', () => fitName());
addEventListener('orientationchange', () => setTimeout(() => fitName(true), 250));

/* ------------------------------------------------ about paragraph: words light up with scroll */
const para = $('#para');
para.innerHTML = para.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
const words = $$('.w', para);

/* ------------------------------------------------ the portfolio: ONE coverflow whose cards are the projects */
const pstage = $('#pstage'), pf = $('.pf'), pills = $('#pills');
const cap = { n: $('#cn'), t: $('#ct'), s: $('#cs'), m: $('#cm'), box: $('#pcap') };
const slides = [], halos = [], pillEls = [], dotEls = [];
let cur = 0, timer = 0;
const n = P.length, EVERY = 3800;
pstage.style.setProperty('--ar', '16/10'); pstage.style.setProperty('--sh', '64%'); pstage.style.setProperty('--step', '.8');
pstage.style.setProperty('--rot', '22'); pstage.style.setProperty('--depth', '190'); pstage.style.setProperty('--every', EVERY + 'ms');
const hbox = h('div', 'halos'), rail = h('div', 'rail'), ctl = h('div', 'ctl'), dots = h('div', 'dots');
P.forEach((p, k) => {
  const hd = h('div', 'halo'); hd.style.backgroundImage = `url(${A(mid(p.cover))})`; halos.push(hd); hbox.append(hd);
  const s = h('div', 'slide', `<img src="${A(mid(p.cover))}" alt="${p.title}" draggable="false" decoding="async"><div class="cl"><b>${p.n}</b><span>${p.title}</span><i>${p.sub}</i></div>`);
  s.addEventListener('click', () => { if (performance.now() - (rail._swiped || 0) < 450) return; if (+s.dataset.d === 0) openProject(k); else go(k, true); });
  slides.push(s); rail.append(s);
  dotEls.push(dots.appendChild(h('i')));
  const short = p.title.replace(' National Park', '') + ' · ' + p.sub;
  const b = h('button', 'pill', short); b.type = 'button'; b.addEventListener('click', () => go(k, true));
  pillEls.push(b); pills.append(b);
});
const arrow = dir => {
  const b = h('button', null, `<svg viewBox="0 0 12 12"><path d="${dir < 0 ? 'M8 1 3 6l5 5' : 'M4 1l5 5-5 5'}"/></svg>`);
  b.type = 'button'; b.setAttribute('aria-label', dir < 0 ? 'Previous project' : 'Next project');
  b.addEventListener('click', () => go(cur + dir, true)); return b;
};
ctl.append(arrow(-1), dots, arrow(1));
pstage.append(hbox, rail, ctl);
let capTimer = 0;
const dOf = k => { let d = ((k - cur) % n + n) % n; if (d > n / 2) d -= n; return d; };
function render(first) {
  slides.forEach((s, k) => {
    const d = dOf(k), old = s._d, jump = !first && old !== undefined && Math.abs(d - old) > 2;
    if (jump) s.classList.add('jump');
    s._d = d; s.dataset.d = d;
    s.style.setProperty('--d', d); s.style.setProperty('--ad', Math.abs(d));
    s.style.zIndex = 10 - Math.abs(d);
    s.classList.toggle('far', Math.abs(d) > 2);
    if (jump) { void s.offsetWidth; s.classList.remove('jump'); }
  });
  halos.forEach((x, k) => x.classList.toggle('on', k === cur));
  pillEls.forEach((x, k) => x.classList.toggle('on', k === cur));
  dotEls.forEach((x, k) => { const was = x.classList.contains('on'); x.classList.toggle('on', k === cur); if (k === cur && was) { x.classList.remove('on'); void x.offsetWidth; x.classList.add('on'); } });
  // the title leaves as the card starts to move, the new one arrives staggered while the card settles
  const setCap = () => {
    const p = P[cur];
    cap.n.textContent = p.n; cap.t.firstChild.nodeValue = p.title; cap.s.textContent = p.sub;
    cap.m.textContent = `${p.year} · ${imgsOf(p).length} photographs`;
    cap.box.classList.remove('out', 'sw'); void cap.box.offsetWidth; cap.box.classList.add('sw');
  };
  clearTimeout(capTimer);
  if (first || reduce) setCap(); else { cap.box.classList.remove('sw'); cap.box.classList.add('out'); capTimer = setTimeout(setCap, 340); }
}
function go(k, user) { cur = ((k % n) + n) % n; render(); if (user && timer) { stop(); start(); } }
function start() { if (timer || paused) return; timer = setInterval(() => go(cur + 1), EVERY); pf.classList.remove('paused'); }
function stop() { clearInterval(timer); timer = 0; pf.classList.add('paused'); }
$('#popen').addEventListener('click', () => openProject(cur));
function fitFlow() {                                            // slide size follows the stage, so phones and tablets get a sensible card
  const W = pstage.clientWidth, Hh = pstage.clientHeight, narrow = W < 700, ar = narrow ? .8 : 1.6;
  pstage.style.setProperty('--ar', narrow ? '4/5' : '16/10'); pstage.style.setProperty('--step', narrow ? '.76' : '.8');
  pstage.style.setProperty('--rot', narrow ? '16' : '22'); pstage.style.setProperty('--depth', narrow ? '130' : '190');
  pstage.style.setProperty('--sh', Math.round(Math.min(Hh * .66, W * (narrow ? .62 : .56) / ar)) + 'px');
}
fitFlow(); addEventListener('resize', fitFlow);
function swipe(el, onPrev, onNext) {                            // touch swipe, horizontal only (vertical scrolling stays free)
  let id = null, x0 = 0, y0 = 0;
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; id = e.pointerId; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', e => {
    if (e.pointerId !== id) return; id = null;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.3) { el._swiped = performance.now(); (dx < 0 ? onNext : onPrev)(); }
  });
  el.addEventListener('pointercancel', () => { id = null; });
}
swipe(rail, () => go(cur - 1, true), () => go(cur + 1, true));
render(true);
let pfVis = false;
new IntersectionObserver(es => es.forEach(e => { pfVis = e.isIntersecting; if (e.isIntersecting) { pf.classList.add('in'); if (!paused) start(); } else stop(); }), { threshold: .2 }).observe(pf);

/* ------------------------------------------------ photos that twinkle in the subjects band */
const stars = $('#stars'), mqBox = $('.mq');
const pool = P.flatMap(p => imgsOf(p).map(i => i.src));
const thumb = src => isUrl(src) ? sz(src, 640, 74) : 'thumbs/' + src.replace(/^matt\//, '').replace('/', '-');
// frame captures of his YouTube videos (the cover image plus three frames of each)
const vpool = V.flatMap(v => v.frames || [0, 1, 2, 3].map(n => `matt/videos/${v.id}-${n}.jpg`));
const live = [], recent = [];
let starTimer = 0, starsVis = false;
const rnd = (a, b) => a + Math.random() * (b - a);
function overlap(a, b) {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), hh = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (w * hh) / Math.min(a.w * a.h, b.w * b.h);
}
function spawnStar() {
  if (!starsVis || paused || reduce) return;
  const W = stars.clientWidth, H = stars.clientHeight, max = VW() > 900 ? 4 : 3;
  if (!W || live.length >= max) return;
  const isVid = Math.random() < .4;                     // about 4 in 10 are frame captures of his videos
  const list = isVid ? vpool : pool;
  let src; do { src = list[Math.floor(Math.random() * list.length)]; } while (recent.includes(src));
  recent.push(src); if (recent.length > 14) recent.shift();
  // creative sizes: four size tiers and several shapes (wide, 4:3, square, portrait, tall), all cropped from the photo
  const q = Math.random(), tier = q < .22 ? [.11, .14] : q < .6 ? [.16, .21] : q < .92 ? [.24, .30] : [.32, .37];
  const shapes = isVid ? [1.78, 1.78, 1.4, 1] : [1.6, 1.33, 1.33, 1, .8, .75, .62];
  const r = shapes[Math.floor(Math.random() * shapes.length)];
  const mob = VW() <= 900, w0 = W * rnd(tier[0], tier[1]) * (mob ? 1.7 : 1);
  const area = w0 * w0 / 1.5;                               // same area for every shape, so a tall one is as big as a wide one
  let w = Math.sqrt(area * r), hgt = Math.sqrt(area / r);
  if (hgt > H * .8) { hgt = H * .8; w = hgt * r; }
  if (w > W * .46) { w = W * .46; hgt = w / r; }
  let best = null, bestScore = 9;
  for (let i = 0; i < 16; i++) {
    const c = { x: rnd(W * .02, W * .98 - w), y: rnd(H * .04, H * .94 - hgt), w, h: hgt };
    const score = live.reduce((s, o) => s + overlap(c, o.box), 0);
    if (score < bestScore) { best = c; bestScore = score; if (score === 0) break; }
  }
  const el = h('div', 'star' + (isVid ? ' vf' : ''), `<img src="${A(isVid ? src : thumb(src))}" alt="">`);
  Object.assign(el.style, { left: best.x + 'px', top: best.y + 'px', width: w + 'px', height: hgt + 'px' });
  stars.append(el);
  const rec = { el, box: best }; live.push(rec);
  void el.offsetWidth; el.classList.add('on');
  const hold = rnd(3200, 5600);
  setTimeout(() => { el.classList.remove('on'); el.classList.add('off'); }, hold);
  setTimeout(() => { el.remove(); live.splice(live.indexOf(rec), 1); }, hold + 2600);
}
function starLoop() { spawnStar(); starTimer = setTimeout(starLoop, rnd(900, 1700)); }
new IntersectionObserver(es => es.forEach(e => { starsVis = e.isIntersecting; if (e.isIntersecting && !starTimer) starLoop(); })).observe(mqBox);

/* ------------------------------------------------ tiles that change their photo by themselves */
const shown = new Set(), recentC = [];
function pickPhoto() {
  let s, t = 0;
  do { s = pool[Math.floor(Math.random() * pool.length)]; t++; } while ((shown.has(s) || recentC.includes(s)) && t < 60);
  recentC.push(s); if (recentC.length > 20) recentC.shift();
  return s;
}
// which project (and caption) each photo belongs to, used for the little captions under the About photos
const meta = new Map();
P.forEach(p => imgsOf(p).forEach((i, k) => meta.set(i.src, { p, k, cap: i.cap })));
$$('.cy').forEach((el, i) => {
  const a = h('img'), b = h('img'); a.alt = b.alt = ''; el.append(a, b);
  const tcap = el.parentElement.querySelector('.tcap');
  let front = a, back = b, cur = null, vis = false;
  const full = el.dataset.full === '1', period = +el.dataset.cy || 5200;
  function swap(first) {
    const src = pickPhoto(), url = A(full ? mid(src) : thumb(src)), im = new Image();
    im.onload = () => {
      if (cur) shown.delete(cur);
      cur = src; shown.add(src);
      back.src = url; back.classList.add('on'); if (!first) front.classList.remove('on');
      if (tcap) {
        const m = meta.get(src);
        tcap.style.opacity = 0;
        setTimeout(() => {
          tcap.innerHTML = m ? `<b>${m.p.title.replace(' National Park', '')} · ${m.p.sub}</b>${m.cap ? '<span>' + m.cap + '</span>' : ''}` : '';
          tcap.style.opacity = 1;
        }, first ? 0 : 700);
      }
      [front, back] = [back, front];
    };
    im.src = url;
  }
  swap(true);
  new IntersectionObserver(es => es.forEach(e => { vis = e.isIntersecting; })).observe(el);
  const first = el.dataset.delay ? +el.dataset.delay : 1200 + i * 1100;   // data-delay lets two tiles take turns
  setTimeout(() => { if (vis && !paused && !reduce) swap(false); setInterval(() => { if (vis && !paused && !reduce) swap(false); }, period); }, first);
});

/* ------------------------------------------------ videos */
const vgrid = $('#vgrid'), vmodal = $('#vmodal'), vframe = $('#vframe');
V.forEach(v => {
  const b = h('button', 'vid rv', `<div class="th"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"><span class="pl"><svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg></span></div><h4>${v.title}</h4><span>Video · YouTube</span>`);
  b.type = 'button';
  b.addEventListener('click', () => {
    vframe.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    vmodal.classList.add('show');
  });
  vgrid.append(b);
});
const closeV = () => { vmodal.classList.remove('show'); setTimeout(() => vframe.innerHTML = '', 420); };
$('#vclose').addEventListener('click', closeV);
vmodal.addEventListener('click', e => { if (e.target === vmodal) closeV(); });

/* ------------------------------------------------ background music: Valley Sunset, starts on the first gesture, one click mutes */
const snd = $('#snd');
const SND = { src: 'assets/audio/valley-sunset.mp3', vol: .17, xf: 5 };   // volume 0 to 1: soft, well under the voices and the videos
let sndState = 'idle', sndTimer = 0, master = 0, sndDucked = false, sndHidden = false, sndTrying = false;
let actx = null, gainNode = null;
try { localStorage.removeItem('sound'); } catch (e) {}           // an old "muted" choice must not silence the site for good
const store = (k, v) => { try { v === undefined ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} };   // a mute lasts for this visit only
const stored = () => { try { return sessionStorage.getItem('sound'); } catch (e) { return null; } };
const pa = new Audio(SND.src), pb = new Audio(SND.src);
[pa, pb].forEach(a => { a.preload = 'none'; a.playsInline = true; });   // nothing is downloaded until the site is ready, so the music never competes with the photos
let sc = pa, sn = pb;                                           // current and next player (they overlap a few seconds to loop without a gap)
const AC = window.AudioContext || window.webkitAudioContext;
const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function ensureAudio() {                                        // only iPhones/iPads ignore audio.volume, so only they get a gain node (and never from file://, where it would be silent)
  if (actx || !AC || !iOS || location.protocol === 'file:') return;
  try {
    actx = new AC(); gainNode = actx.createGain(); gainNode.gain.value = 0; gainNode.connect(actx.destination);
    [pa, pb].forEach(a => actx.createMediaElementSource(a).connect(gainNode));
  } catch (e) { actx = null; gainNode = null; }
}
const setLevel = v => { master = v; if (gainNode) gainNode.gain.value = v; else pa.volume = pb.volume = clamp(v, 0, 1); };
setLevel(0);
const setSnd = st => {
  sndState = st; snd.dataset.state = st;
  snd.setAttribute('aria-pressed', st === 'on' ? 'true' : 'false');
  snd.setAttribute('aria-label', st === 'on' ? 'Mute the music' : 'Turn the music on');
};
function fadeSound(to, ms) {                                    // time-based fade on a timer, so it also runs when the tab is throttled
  clearInterval(sndTimer);
  const from = master, t0 = performance.now();
  sndTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms); setLevel(from + (to - from) * (k * k * (3 - 2 * k)));
    if (k >= 1) { clearInterval(sndTimer); if (to === 0) { pa.pause(); pb.pause(); } }
  }, 40);
}
async function soundOn(fromUser) {
  ensureAudio();
  if (actx && actx.state !== 'running') {
    try { await Promise.race([actx.resume(), wait(400)]); } catch (e) {}
    if (actx.state !== 'running') return false;                  // still blocked: wait for a real gesture
  }
  try { await sc.play(); } catch (e) { return false; }
  sn.play().then(() => sn.pause()).catch(() => {});             // unlock the second player too (iOS only starts media inside a gesture)
  setSnd('on'); fadeSound(SND.vol, 2600);
  if (fromUser) store('sound', 'on');
  return true;
}
function soundOff(fromUser) {
  setSnd('off'); fadeSound(0, 900);
  if (fromUser) store('sound', 'off');
}
setInterval(() => {                                              // loop: start the second copy before the first one ends
  if (sndState !== 'on' || !sc.duration || sc.paused) return;
  if (sc.currentTime > sc.duration - SND.xf && sn.paused) { sn.currentTime = 0; sn.play().catch(() => {}); [sc, sn] = [sn, sc]; }
}, 250);
setInterval(() => {                                              // safety net: if it should be playing but nothing is, start it again
  if (sndState !== 'on' || sndHidden || document.hidden || !sc.paused || !sn.paused) return;
  if (sc.ended) sc.currentTime = 0;
  sc.play().catch(() => {});
}, 1500);
snd.addEventListener('click', e => {
  e.stopPropagation();
  if (sndState === 'on') soundOff(true); else soundOn(true);
});
if (stored() === 'off') setSnd('off');
else {
  (window.siteReady || Promise.resolve()).then(() => soundOn(false));   // works if the browser allows autoplay
  const gestures = ['pointerdown', 'touchend', 'keydown', 'click'];
  const first = async e => {
    if (!window.__ready || snd.contains(e.target) || sndState !== 'idle' || sndTrying) return;
    sndTrying = true;
    const done = await soundOn(false);
    sndTrying = false;
    if (done) gestures.forEach(g => removeEventListener(g, first, true));
  };
  gestures.forEach(g => addEventListener(g, first, true));
}
document.addEventListener('visibilitychange', () => {            // pause when the tab is hidden
  if (document.hidden && sndState === 'on') { sndHidden = true; fadeSound(0, 400); }
  else if (!document.hidden && sndHidden) { sndHidden = false; if (sndState === 'on') { sc.play().catch(() => {}); fadeSound(SND.vol, 1600); } }
});
new MutationObserver(() => {                                     // music steps aside while a YouTube video plays
  const open = $('#vmodal').classList.contains('show');
  if (open && sndState === 'on') { sndDucked = true; setSnd('off'); fadeSound(0, 500); }
  else if (!open && sndDucked) { sndDucked = false; soundOn(false); }
}).observe($('#vmodal'), { attributes: true, attributeFilter: ['class'] });

/* ------------------------------------------------ once the site is ready, quietly fetch the heavy files so opening a project is instant */
(window.siteReady || Promise.resolve()).then(() => {
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1200));
  idle(() => { P.forEach((p, k) => setTimeout(() => { new Image().src = A(p.cover); }, k * 700)); }, { timeout: 4000 });
});

/* ------------------------------------------------ contact popup */
const cmodal = $('#contactModal'), cform = $('#cform'), cpanel = $('.cpanel', cmodal), CFG = window.CONTACT || {};
let cOpen = false, cBusy = false, cOpener = null, cTopic = '';
$('#cmail').textContent = CFG.email || 'hello@example.com'; $('#cmail').href = 'mailto:' + (CFG.email || 'hello@example.com');
function openContact(from) {
  if (cOpen || cBusy) return;
  cOpen = true; cOpener = from || document.activeElement;
  cmodal.classList.remove('sent'); cmodal.classList.add('show'); cmodal.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('lock');
  setTimeout(() => $('#cname').focus({ preventScroll: true }), 700);
}
async function closeContact() {
  if (!cOpen) return;
  cOpen = false; cmodal.classList.remove('show'); cmodal.setAttribute('aria-hidden', 'true');
  await wait(750);
  document.documentElement.classList.remove('lock');
  cmodal.classList.remove('sent'); cform.reset(); $$('.fld', cform).forEach(f => f.classList.remove('bad')); $$('.chip', cform).forEach(c => c.classList.remove('on')); cTopic = '';
  $('#cfail').textContent = ''; $('#csend').disabled = false; $('#csend span').textContent = 'Send message';
  if (cOpener && cOpener.focus) cOpener.focus({ preventScroll: true });
}
function bindContact(el) {
  el.addEventListener('click', e => { e.preventDefault(); openContact(el); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openContact(el); } });
}
$$('[data-contact]').forEach(bindContact);
$('#cclose').addEventListener('click', closeContact);
cmodal.addEventListener('mousedown', e => { if (e.target === cmodal) closeContact(); });
$$('.chip', cform).forEach(ch => ch.addEventListener('click', () => {
  const on = !ch.classList.contains('on'); $$('.chip', cform).forEach(c => c.classList.remove('on'));
  ch.classList.toggle('on', on); cTopic = on ? ch.dataset.v : '';
}));
$$('input,textarea', cform).forEach(i => i.addEventListener('input', () => i.closest('.fld') && i.closest('.fld').classList.remove('bad')));
function cCheck() {
  const v = { name: cform.name.value.trim(), email: cform.email.value.trim(), message: cform.message.value.trim() };
  const errs = {};
  if (v.name.length < 2) errs.name = 'Please add your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errs.email = 'Please enter a valid email address.';
  if (v.message.length < 10) errs.message = 'Tell me a little more (at least 10 characters).';
  $$('.fld', cform).forEach(f => f.classList.remove('bad'));
  Object.keys(errs).forEach(k => { const e = $(`.err[data-for="${k}"]`, cform); e.textContent = errs[k]; e.closest('.fld').classList.add('bad'); });
  const first = Object.keys(errs)[0]; if (first) cform[first].focus({ preventScroll: true });
  return { ok: !first, v };
}
cform.addEventListener('submit', async e => {
  e.preventDefault();
  if (cBusy) return;
  const { ok, v } = cCheck(); if (!ok) return;
  cBusy = true; $('#csend').disabled = true; $('#csend span').textContent = 'Sending…'; $('#cfail').textContent = '';
  let sent = true;
  if (cform.company.value) { await wait(700); }                                            // honeypot filled: pretend it worked, send nothing
  else if (CFG.endpoint) {
    try {
      const r = await fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name: v.name, email: v.email, topic: cTopic, message: v.message }) });
      sent = r.ok;
    } catch (err) { sent = false; }
  } else { console.info('Contact form in demo mode: nothing was sent.'); await wait(900); }
  if (!sent) { cBusy = false; $('#csend').disabled = false; $('#csend span').textContent = 'Send message'; $('#cfail').textContent = 'Something went wrong. Please try again, or write to ' + (CFG.email || 'me directly') + '.'; return; }
  $('#cthx').textContent = 'Thank you, ' + v.name.split(' ')[0] + '.';
  cmodal.classList.add('sent');
  await wait(3200);                                                                        // time to read the thank-you
  await closeContact();
  cBusy = false;
  if (rOpen) await closePiece(); else if (state.open != null) await closeProject();      // sent from a project or a piece: leave it first
  scrollTo({ top: 0, behavior: 'smooth' });                                              // and back to the start of the site
});
cmodal.addEventListener('keydown', e => {                                                  // keep Tab inside the popup
  if (e.key !== 'Tab') return;
  const f = $$('button:not([disabled]),input:not(.hp),textarea,a[href]', cpanel).filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
});

/* ------------------------------------------------ writing: each piece is a small text file in assets/writings */
const wsec = $('#writing'), widx = $('#widx');
const reader = $('#reader'), rwrap = $('#rwrap'), rprog = $('#rprog');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
function parseMd(txt) {
  const m = txt.replace(/\r/g, '').match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const meta = {}; let body = txt;
  if (m) { m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); body = m[2]; }
  const blocks = body.replace(/\r/g, '').trim().split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const html = blocks.map(b => {
    let k;
    if ((k = b.match(/^!\[(.*?)\]\((.+?)\)$/))) return `<figure class="rfig"><img src="${A(k[2])}" alt="${esc(k[1])}" loading="lazy"><figcaption>${inl(k[1])}</figcaption></figure>`;
    if (b.startsWith('>')) return `<blockquote class="rq">${inl(b.replace(/^>\s?/gm, ''))}</blockquote>`;
    if (b.startsWith('## ')) return `<h3 class="rh">${inl(b.slice(3))}</h3>`;
    return `<p>${inl(b.replace(/\n/g, ' '))}</p>`;
  }).join('');
  const first = blocks.find(b => !/^(!\[|>|## )/.test(b)) || '';
  return { meta, html, mins: Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200)), excerpt: meta.excerpt || first.replace(/\*/g, '').slice(0, 220) };
}
const fmtDate = d => { const t = new Date(d + 'T00:00:00'); return isNaN(t) ? '' : t.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); };
let WR = [], wi = 0, wTimer = 0, wHover = false, wVis = false, wTouchUntil = 0;

function wSelect(i) {
  if (!WR.length) return;
  wi = (i + WR.length) % WR.length;
  $$('li', widx).forEach((li, k) => li.classList.toggle('on', k === wi));
}
function buildWriting() {
  if (!WR.length) { widx.innerHTML = '<li class="wempty">No pieces yet. Add a .md file to assets/writings and list it in index.json.</li>'; return; }
  $('#wcnt').textContent = `(${pad(WR.length)})`;
  WR.forEach((w, k) => {
    const li = h('li', null, `<span class="n">${pad(k + 1)}</span><div class="wc"><h3 class="t">${esc(w.meta.title || w.slug)}</h3><div class="wx"><div><p class="ex">${esc(w.excerpt)}</p><div class="wf"><span class="wm">${fmtDate(w.meta.date)} · ${w.mins} min read</span><span class="wr">Read ↗</span></div></div></div></div><div class="wside"><span class="wtag">${esc(w.meta.tag || 'Writing')}</span></div>`);
    li.tabIndex = 0; li.setAttribute('role', 'button');
    li.addEventListener('mouseenter', () => { wHover = true; if (wi !== k) wSelect(k); });
    li.addEventListener('focus', () => { if (wi !== k) wSelect(k); });
    li.addEventListener('click', () => { if (touch && wi !== k) { wSelect(k); wTouchUntil = performance.now() + 9000; return; } openPiece(k); });
    li.addEventListener('keydown', e => { if (e.key === 'Enter') openPiece(k); });
    widx.append(li);
  });
  wsec.addEventListener('mouseleave', () => { wHover = false; });
  wsec.addEventListener('mouseenter', () => { wHover = true; });
  wSelect(0);
  wTimer = setInterval(() => { if (wVis && !wHover && !paused && performance.now() > wTouchUntil && !reader.classList.contains('show')) wSelect(wi + 1); }, 6500);
}
new IntersectionObserver(es => es.forEach(e => { wVis = e.isIntersecting; })).observe(wsec);
(async () => {
  try {
    const idx = window.CMS_WRITINGS ? [] : await (await fetch(A('writings/index.json'))).json();
    const items = window.CMS_WRITINGS ? window.CMS_WRITINGS.map(w => ({ slug: w.slug, ...parseMd(w.text) })) : (await Promise.all(idx.map(async slug => {
      try {
        const r = await fetch(A(`writings/${slug}.md`));
        const txt = await r.text();
        if (!r.ok || /^\s*<(!doctype|html)/i.test(txt)) return null;            // a missing file comes back as an HTML error page: skip it
        return { slug, ...parseMd(txt) };
      } catch (e) { return null; }
    }))).filter(Boolean);
    WR = items.sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''));
  } catch (e) { console.warn('Writings could not be loaded', e); }
  buildWriting();
})();

let ri = 0, rOpen = false;
function readerBuild(i) {
  ri = i; const w = WR[i], nx = WR[(i + 1) % WR.length];
  rwrap.innerHTML = `<article class="rart"><header class="rhead"><span class="rtag">${esc(w.meta.tag || 'Writing')}</span><h2 class="rtitle">${esc(w.meta.title || w.slug)}</h2><p class="rmeta">${fmtDate(w.meta.date)} · ${w.mins} min read</p></header>` +
    `<div class="rbody">${w.html}</div></article><button class="rnext" type="button"><small>Next piece</small><b>${esc(nx.meta.title || nx.slug)}</b></button>`;
  $('.rnext', rwrap).addEventListener('click', async () => {
    reader.classList.remove('show'); await wait(520); reader.scrollTop = 0; readerBuild((i + 1) % WR.length); void reader.offsetWidth; reader.classList.add('show');
  });
  const cov = $('.rcover img', rwrap); rwrap._cov = cov;
}
function openPiece(i) {
  if (!WR.length || rOpen || state.open != null) return;
  rOpen = true; paused = true; stop();
  reader.scrollTop = 0; readerBuild(i);
  document.documentElement.classList.add('lock');
  void reader.offsetWidth; reader.classList.add('show'); reader.setAttribute('aria-hidden', 'false');
}
async function closePiece() {
  if (!rOpen) return;
  reader.classList.remove('show'); reader.setAttribute('aria-hidden', 'true');
  await wait(600);
  document.documentElement.classList.remove('lock');
  rOpen = false; paused = false; if (pfVis) start(); rwrap.innerHTML = '';
}
reader.addEventListener('scroll', () => {
  const max = reader.scrollHeight - VH();
  rprog.style.transform = `scaleX(${max > 0 ? clamp(reader.scrollTop / max, 0, 1) : 0})`;
  const c = rwrap._cov; if (c) c.style.transform = `scale(1.08) translateY(${(reader.scrollTop * .05).toFixed(1)}px)`;
}, { passive: true });
$('#rclose').addEventListener('click', closePiece);

/* ------------------------------------------------ reveals + parallax */
const rvIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: .12 });
$$('.rv').forEach(x => rvIO.observe(x));
const pars = $$('[data-par]'), zooms = $$('[data-zoom]');
function onScroll() {
  const vh = VH();
  // photos breathe: a little bigger near the middle of the screen, a little smaller toward the edges
  zooms.forEach(t => {
    const b = t.getBoundingClientRect();
    if (b.bottom < -300 || b.top > vh + 300) return;
    const d = Math.min(1, Math.abs((b.top + b.height / 2 - vh / 2) / (vh * .7)));
    const k = 1 - d * d * (3 - 2 * d), amp = parseFloat(t.dataset.zoom);
    t.style.scale = (1 - amp * .55 + amp * 1.1 * k).toFixed(3);
  });
  pars.forEach(t => {
    if (VW() < 900 && t.classList.contains('at')) { t.style.translate = ''; t._ty = 0; return; }   // keep the About photos still on small screens
    const b = t.getBoundingClientRect();
    if (b.bottom < -200 || b.top > vh + 200) return;
    const base = b.top - (t._ty || 0) + b.height / 2;                     // position without our own offset, so it never feeds back
    t._ty = (base - vh / 2) * parseFloat(t.dataset.par);
    t.style.translate = `0 ${t._ty.toFixed(1)}px`;
  });
  const r = para.getBoundingClientRect();
  const k = clamp((vh * .88 - r.top) / (vh * .5), 0, 1), lit = Math.round(k * words.length);
  words.forEach((w, i) => w.classList.toggle('lit', i < lit));
}
addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
onScroll();

/* ------------------------------------------------ cursor */
const cur$ = $('#cur'), curLabel = $('#curLabel');
let tx = 0, ty = 0, cx = 0, cy = 0;
addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur$.classList.add('on'); }, { passive: true });
(function curLoop() { cx += (tx - cx) * .22; cy += (ty - cy) * .22; cur$.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(curLoop); })();
document.addEventListener('pointerover', e => {
  const t = e.target; let label = '';
  if (t.closest('.ctl, .close, a, .vclose, .pill, .po, .lbbtn, #contactModal')) label = '';
  else if (t.closest('.dnext')) label = 'Next';
  else if (t.closest('.slide[data-d="0"]')) label = 'Open';
  else if (t.closest('.wprev, .widx li')) label = 'Read';
  else if (t.closest('.orb')) label = 'Say hello';
  else if (t.closest('.mt')) label = 'View';
  else if (t.closest('.vid')) label = 'Play';
  cur$.classList.toggle('big', !!label); curLabel.textContent = label;
});

/* ------------------------------------------------ lightbox */
const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
let lbList = [], lbI = 0;
function lbShow(i) {
  lbI = (i + lbList.length) % lbList.length;
  const it = lbList[lbI];
  lbImg.classList.remove('in'); lbImg.src = A(it.src);
  lbCap.innerHTML = `<b>${pad(lbI + 1)} / ${pad(lbList.length)}</b>${it.cap ? '<span>' + it.cap + '</span>' : ''}`;
  lbImg.onload = () => lbImg.classList.add('in');
}
function lbOpen(list, i) { lbList = list; lb.classList.add('show'); lbShow(i); }
function lbClose() { lb.classList.remove('show'); }
$('#lbPrev').addEventListener('click', e => { e.stopPropagation(); lbShow(lbI - 1); });
$('#lbNext').addEventListener('click', e => { e.stopPropagation(); lbShow(lbI + 1); });
$('#lbClose').addEventListener('click', lbClose);
swipe($('#lb'), () => lbShow(lbI - 1), () => lbShow(lbI + 1));
lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lbstage')) lbClose(); });

/* ------------------------------------------------ detail: tight mosaic, falling in like water */
let state = { open: null }, busy = false, raf = 0, st = 0, upd = null, io = null;

function titleHTML(t) {
  let k = 0;
  return t.split(' ').map(w => `<span class="wd">${[...w].map(c => `<span class="ch" style="--k:${k++}">${c}</span>`).join('')}</span>`).join(' ');
}
const W = [1.3, .86, 1.1, .8, 1.22, .95, 1.15, .82, 1.0, .9];
function buildMosaic(p) {
  const imgs = imgsOf(p), colsN = VW() > 1000 ? 3 : 2;
  const pat = colsN === 3 ? [3, 2, 3] : [3, 3], per = pat.reduce((a, b) => a + b, 0);
  const root = h('section', 'mosaic');
  // block sizes: full blocks of `per`, never leaving a lonely 1-2 photo block at the end
  const sizes = []; let rem = imgs.length;
  while (rem > 0) {
    if (rem <= per) { sizes.push(rem); rem = 0; }
    else if (rem - per < colsN) { sizes.push(rem - colsN); rem = colsN; }
    else { sizes.push(per); rem -= per; }
  }
  let k = 0, b = 0;
  for (const size of sizes) {
    const chunk = imgs.slice(b, b + size);
    const cn = Math.min(colsN, chunk.length);
    const counts = chunk.length === per ? pat : Array.from({ length: cn }, (_, c) => Math.floor(chunk.length / cn) + (c < chunk.length % cn ? 1 : 0));
    const block = h('div', 'mblock'); block.style.setProperty('--cols', counts.length); block.style.setProperty('--rows', Math.max(...counts));
    let at = 0;
    counts.forEach((cnt, c) => {
      const col = h('div', 'mcol'); col.style.setProperty('--c', c);
      for (let j = 0; j < cnt; j++, at++) {
        const it = chunk[at], gi = b + at;
        const fig = h('figure', 'fig mt');
        fig.style.flexGrow = ((1 / ratio(it.src)) * W[k % W.length]).toFixed(3); k++;
        fig.innerHTML = `<div class="m"><img src="${A(mid(it.src))}" alt="${it.cap || ''}" loading="lazy" decoding="async"></div><figcaption><b>${pad(gi + 1)}</b>${it.cap ? '<span>' + it.cap + '</span>' : ''}</figcaption>`;
        fig.addEventListener('click', () => lbOpen(imgs, gi));
        col.append(fig);
      }
      block.append(col);
    });
    root.append(block);
    b += size;
  }
  return root;
}

function buildDetail(idx) {
  const p = P[idx];
  if (io) io.disconnect();
  wrap.innerHTML = ''; upd = null;
  const head = h('section', 'dhead', `<div class="hbg" style="background-image:url(${A(p.cover)})"></div><div class="hin"><span class="hnum">${p.n} / ${pad(P.length)} · Photography</span><h2 class="htitle">${titleHTML(p.title)}</h2><span class="hsub">${p.sub}</span><p class="hmeta">${p.year} · ${imgsOf(p).length} photographs</p><p class="hblurb">${p.blurb}</p></div><div class="dscrollhint"><span></span>Scroll</div>`);
  const body = buildMosaic(p);
  const nx = P[(idx + 1) % P.length];
  const next = h('button', 'dnext', `<small>Next project · ${nx.n}</small><b>${nx.title} <span style="color:var(--acc)">${nx.sub}</span></b>`);
  next.type = 'button'; next.addEventListener('click', goNext);
  wrap.append(head, body, next);
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { root: detail, threshold: .08, rootMargin: '0px 0px -4% 0px' });
  $$('.fig', wrap).forEach(x => io.observe(x));
  const hb = $('.hbg', head);
  upd = s => { hb.style.transform = `translateY(${(s * .3).toFixed(1)}px) scale(${1 + Math.min(s / 3000, .12)})`; };
}

function loop() {
  const t = detail.scrollTop;
  st += (t - st) * (reduce ? 1 : .12); if (Math.abs(t - st) < .05) st = t;
  upd && upd(st);
  const max = detail.scrollHeight - VH();
  prog.style.transform = `scaleX(${max > 0 ? clamp(t / max, 0, 1) : 0})`;
  raf = requestAnimationFrame(loop);
}

async function openProject(idx) {
  if (busy || state.open != null) return;
  busy = true; paused = true; stop();
  const p = P[idx], r = slides[idx].getBoundingClientRect();
  const m = h('div', 'morph');
  m.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:0;background-image:url(${A(mid(p.cover))})`;
  document.body.append(m);
  new Image().src = A(p.cover);                                   // the big header image starts downloading right away
  detail.scrollTop = 0; st = 0; buildDetail(idx);
  document.documentElement.classList.add('lock');
  void m.offsetWidth;
  Object.assign(m.style, { left: '0px', top: '0px', width: '100vw', height: '100vh', borderRadius: '0px' });
  await wait(reduce ? 60 : 900);
  detail.classList.add('show'); state.open = idx;
  cancelAnimationFrame(raf); loop();
  await wait(520); m.classList.add('fade'); await wait(650); m.remove(); busy = false;
}

async function closeProject() {
  if (busy || state.open == null) return;
  if (lb.classList.contains('show')) { lbClose(); return; }
  busy = true;
  const idx = state.open, p = P[idx];
  const m = h('div', 'morph');
  m.style.cssText = `left:0;top:0;width:100vw;height:100vh;border-radius:0;background-image:url(${A(p.cover)})`;
  document.body.append(m);
  detail.classList.remove('show');
  await wait(450);
  document.documentElement.classList.remove('lock');
  go(idx);
  let rr = slides[idx].getBoundingClientRect();
  if (rr.bottom < 80 || rr.top > VH() - 80) { scrollTo({ top: scrollY + rr.top - VH() * .25, behavior: 'instant' }); }
  rr = slides[idx].getBoundingClientRect();
  void m.offsetWidth;
  Object.assign(m.style, { left: rr.left + 'px', top: rr.top + 'px', width: rr.width + 'px', height: rr.height + 'px', borderRadius: '0px' });
  await wait(reduce ? 60 : 920);
  m.classList.add('fade'); state.open = null; paused = false;
  cancelAnimationFrame(raf); upd = null;
  if (pfVis) start();
  await wait(600); m.remove(); wrap.innerHTML = ''; busy = false;
}

async function goNext() {
  if (busy || state.open == null) return;
  busy = true;
  const idx = (state.open + 1) % P.length;
  detail.classList.remove('show'); await wait(520);
  detail.scrollTop = 0; st = 0; buildDetail(idx); state.open = idx; cur = idx;
  void detail.offsetWidth; detail.classList.add('show'); busy = false;
}

$('#close').addEventListener('click', closeProject);
addEventListener('keydown', e => {
  if (lb.classList.contains('show')) {
    if (e.key === 'Escape') lbClose(); else if (e.key === 'ArrowRight') lbShow(lbI + 1); else if (e.key === 'ArrowLeft') lbShow(lbI - 1);
    return;
  }
  if (e.key === 'Escape') { if (cOpen) closeContact(); else if (vmodal.classList.contains('show')) closeV(); else if (rOpen) closePiece(); else closeProject(); }
});

/* ------------------------------------------------ the same footer inside the project and reading views */
const mainFoot = $('#contact');
function addFooter(host) {
  const f = h('footer', 'sec talk subfoot', mainFoot.innerHTML);
  host.append(f);
  $$('[data-contact]', f).forEach(bindContact);
  $$('a[href^="#"]:not([data-contact])', f).forEach(a => a.addEventListener('click', async e => {
    e.preventDefault();
    if (busy || cBusy) return;
    const id = a.getAttribute('href').slice(1), target = id === 'top' ? null : document.getElementById(id);
    if (rOpen) await closePiece(); else if (state.open != null) await closeProject();
    scrollTo({ top: target ? target.getBoundingClientRect().top + scrollY : 0, behavior: reduce ? 'auto' : 'smooth' });
  }));
}
addFooter(detail); addFooter(reader);

/* ------------------------------------------------ back to the top, with a ring that fills as you read */
const totop = $('#totop');
const scroller = () => reader.classList.contains('show') ? reader : detail.classList.contains('show') ? detail : null;
function topState() {
  const s = scroller(), y = s ? s.scrollTop : scrollY;
  const max = (s ? s.scrollHeight : document.documentElement.scrollHeight) - VH();
  const on = y > VH() * .6;
  totop.classList.toggle('on', on); totop.tabIndex = on ? 0 : -1;
  totop.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1).toFixed(3) : '0');
}
addEventListener('scroll', topState, { passive: true });
detail.addEventListener('scroll', topState, { passive: true });
reader.addEventListener('scroll', topState, { passive: true });
addEventListener('resize', topState);
[detail, reader].forEach(el => new MutationObserver(topState).observe(el, { attributes: true, attributeFilter: ['class'] }));
let toTopRaf = 0;
function glideTop(s) {                                         // fixed-duration ease to the top, however long the page is
  cancelAnimationFrame(toTopRaf);
  const from = s ? s.scrollTop : scrollY, t0 = performance.now(), ms = reduce ? 0 : clamp(500 + from * .12, 600, 1100);
  const to = y => s ? (s.scrollTop = y) : scrollTo({ top: y, behavior: 'instant' });
  const step = now => {
    const k = ms ? Math.min(1, (now - t0) / ms) : 1, e = 1 - Math.pow(1 - k, 3);
    to(from * (1 - e));
    if (k < 1) toTopRaf = requestAnimationFrame(step);
  };
  toTopRaf = requestAnimationFrame(step);
}
totop.addEventListener('click', () => glideTop(scroller()));
topState();
})();
