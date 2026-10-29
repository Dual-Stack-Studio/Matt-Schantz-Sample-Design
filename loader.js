/* Loading screen: holds the page until the fonts, the hero photo and the project covers are ready, then lifts like a curtain.
   window.siteReady resolves at that moment; the music and the preloading of the heavy files wait for it. */
(() => {
  const root = document.documentElement, el = document.getElementById('loader');
  let finish;
  window.siteReady = new Promise(r => { finish = r; });
  if (!el) { root.classList.remove('is-loading'); window.__ready = true; finish(); return; }

  const bar = el.querySelector('.lbar i'), pct = el.querySelector('.lpct');
  const mid = src => 'assets/mid/' + src.replace(/^matt\//, '').replace('/', '-');
  const list = ['assets/matt/home/hero.jpg'].concat((window.PROJECTS || []).map(p => mid(p.cover)));
  const total = list.length + 1;                                   // the images plus the fonts
  const t0 = performance.now(), MIN = 1100, MAX = 9000;
  let done = 0, shown = 0, over = false;
  const one = () => { done++; };

  list.forEach(src => {
    const im = new Image(); im.src = src;
    (im.decode ? im.decode() : new Promise(r => { im.onload = r; })).catch(() => {}).then(one);
  });
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 4000))]).then(one);

  function lift() {
    if (over) return; over = true;
    clearInterval(timer);
    bar.style.transform = 'scaleX(1)'; pct.textContent = '100';
    setTimeout(() => {
      root.classList.remove('is-loading');                           // the hero animations start now, as the curtain rises
      el.classList.add('out');
      window.__ready = true; finish();
      setTimeout(() => el.remove(), 1400);
    }, 260);
  }
  const timer = setInterval(() => {                                  // a timer, not rAF, so it also runs in a throttled tab
    const now = performance.now() - t0, goal = done / total * 100;
    shown += (goal - shown) * .14; if (goal - shown < .4) shown = goal;
    bar.style.transform = `scaleX(${(shown / 100).toFixed(3)})`; pct.textContent = String(Math.round(shown)).padStart(2, '0');
    if ((done >= total && shown >= 99.5 && now > MIN) || now > MAX) lift();
  }, 33);
})();
