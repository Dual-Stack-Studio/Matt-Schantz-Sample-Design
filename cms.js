/* Reads the content from Sanity (when cms-config.js has a project id) and puts it in the same shape the site already uses,
   then starts the site (loader.js and app.js). If Sanity cannot be reached, the content built into the files is used. */
(() => {
  const VER = '20261030k';
  const CFG = window.SANITY || {};
  const load = src => new Promise(res => {
    const s = document.createElement('script'); s.src = src + '?v=' + VER; s.async = false; s.onload = s.onerror = res; document.body.append(s);
  });
  const start = () => load('loader.js').then(() => load('app.js'));
  if (!CFG.projectId) { start(); return; }

  const dims = '{"url":url,"w":metadata.dimensions.width,"h":metadata.dimensions.height}';
  const QUERY = `{
    "settings": *[_id=="siteSettings"][0]{heroTagline,aboutHeading,aboutText,subjects,places,email,formEndpoint,instagramUrl,youtubeUrl,"hero":heroImage.asset->${dims}},
    "projects": *[_type=="project" && defined(cover.asset)] | order(date desc, _createdAt desc){_id,title,subtitle,date,blurb,"cover":cover.asset->${dims},"photos":photos[defined(image.asset)]{caption,"a":image.asset->${dims}}},
    "videos": *[_type=="video" && defined(youtubeUrl)] | order(coalesce(date,"0000") desc, _createdAt desc){_id,title,youtubeUrl},
    "writings": *[_type=="writing"] | order(date desc){_id,title,date,tag,excerpt,"cover":cover{"url":asset->url,caption},body[]{..., _type=="image" => {"url":asset->url}}}
  }`;
  const host = CFG.apiHost || `https://${CFG.projectId}.apicdn.sanity.io`;      // apiHost is only for local tests
  const url = `${host}/v2025-01-01/data/query/${CFG.dataset || 'production'}?query=${encodeURIComponent(QUERY)}`;

  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lines = s => esc(s).replace(/\r?\n/g, '<br>');                 // new lines typed in the dashboard become line breaks
  const one = s => String(s || '').replace(/\s+/g, ' ').trim();
  const $ = (s, r = document) => r.querySelector(s);
  const man = window.MAN = window.MAN || {};

  function projects(list) {
    const out = list.filter(p => p.cover && p.cover.url && p.photos && p.photos.length).map((p, i) => {
      man[p.cover.url] = [p.cover.w, p.cover.h];
      const items = p.photos.filter(x => x.a && x.a.url).map(x => { man[x.a.url] = [x.a.w, x.a.h]; return { t: 'img', src: x.a.url, cap: x.caption || '' }; });
      const ar = p.cover.w / p.cover.h, dow = ['cascade', 'river', 'zigzag'][i % 3];
      return {
        id: p._id, n: pad(i + 1), title: p.title || 'Untitled', sub: p.subtitle || '', year: p.date ? p.date.slice(0, 4) : '', layout: dow,
        flow: { ar: ar.toFixed(2).replace(/\.?0+$/, ''), sh: '62%', step: .72, rot: 20, depth: 170 },
        cover: p.cover.url, card: [],
        blurb: p.blurb || `${p.title}${p.subtitle ? ', ' + p.subtitle : ''}. ${items.length} photograph${items.length === 1 ? '' : 's'}.`,
        items,
      };
    });
    return out;
  }

  const known = new Set((window.VIDEOS || []).map(v => v.id));          // the sample videos keep their sharp local frames
  const ytId = u => { const m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; };
  function videos(list) {
    return list.map(v => ({ id: ytId(v.youtubeUrl), title: v.title || 'Video' })).filter(v => v.id).map(v => (
      { ...v, frames: known.has(v.id) ? [0, 1, 2, 3].map(n => `matt/videos/${v.id}-${n}.jpg`) : [`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`] }));
  }

  // Sanity's text editor (Portable Text) becomes the small markdown the Writing section already reads.
  function marked(span) {
    const t = span.text || '', m = span.marks || [];
    if (!t.trim()) return t;
    return t.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, a, b, c) => a + (m.includes('em') ? '*' : '') + (m.includes('strong') ? '**' : '') + b + (m.includes('strong') ? '**' : '') + (m.includes('em') ? '*' : '') + c);
  }
  function writings(list) {
    return list.map(w => {
      const body = (w.body || []).map(b => {
        if (b._type === 'image') return b.url ? `![${one(b.caption)}](${b.url})` : '';
        if (b._type !== 'block') return '';
        const text = (b.children || []).map(marked).join('').trim();
        if (!text) return '';
        if (b.style === 'blockquote') return text.split(/\n+/).map(l => '> ' + l).join('\n');
        if (/^h\d$/.test(b.style || '')) return '## ' + one(text);
        return text.replace(/\s*\n+\s*/g, ' ');
      }).filter(Boolean).join('\n\n');
      const head = ['---', 'title: ' + one(w.title), 'date: ' + (w.date || ''), 'tag: ' + one(w.tag), w.excerpt ? 'excerpt: ' + one(w.excerpt) : null, w.cover && w.cover.url ? 'cover: ' + w.cover.url : null, w.cover && w.cover.url && w.cover.caption ? 'coverCaption: ' + one(w.cover.caption) : null, '---', ''].filter(x => x !== null).join('\n');
      return { slug: w._id, text: head + body };
    });
  }

  function texts(s) {
    if (!s) return;
    if (s.heroTagline && $('.hero-foot p')) $('.hero-foot p').innerHTML = lines(s.heroTagline);
    if (s.aboutHeading && $('.big')) $('.big').innerHTML = lines(s.aboutHeading);
    if (s.aboutText && $('#para')) $('#para').textContent = s.aboutText.replace(/\s+/g, ' ').trim();
    if (s.places && s.places.length && $('.pg')) $('.pg').innerHTML = s.places.map(x => `<span>${esc(x)}</span>`).join('');
    if (s.subjects && s.subjects.length) subjects(s.subjects.map(one).filter(Boolean));
    if (s.hero && s.hero.url) {
      const img = $('.hero-photo img'); if (img) img.src = s.hero.url + '?w=1920&q=80&auto=format';
      const pre = $('link[rel="preload"][as="image"]'); if (pre) pre.remove();       // the built-in hero is not the one to load now
    }
    window.CONTACT = { endpoint: s.formEndpoint || '', email: s.email || 'hello@example.com' };
    if (s.instagramUrl) document.querySelectorAll('#contact a[href*="instagram"]').forEach(a => { a.href = s.instagramUrl; });
    if (s.youtubeUrl) document.querySelectorAll('#contact a[href*="youtube"]').forEach(a => { a.href = s.youtubeUrl; });
  }
  function subjects(list) {                                                  // the moving words: up to four rows, each one a loop of two identical halves
    const rows = [...document.querySelectorAll('.mq .row')]; if (!rows.length) return;
    const n = Math.min(rows.length, list.length), sep = ' &nbsp;&ndash;&nbsp; ', speed = [140, 130, 160, 124];
    rows.forEach((row, r) => {
      if (r >= n) { row.remove(); return; }
      let part = list.slice(Math.floor(r * list.length / n), Math.floor((r + 1) * list.length / n));
      let half = part.slice(); while (half.join('').length < 70) half = half.concat(part);
      const html = half.map(esc).join(sep) + sep;
      row.querySelector('.trk').innerHTML = html + html;
      row.querySelector('.trk').style.setProperty('--s', speed[r % 4] + 's');
      row.className = 'row ' + (r === (n > 1 ? 1 : 0) ? 'on' : 'dim');
    });
  }

  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 6000);
  fetch(url, { signal: ctrl.signal })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
    .then(({ result: R }) => {
      const P = projects(R.projects || []);
      texts(R.settings);
      if (P.length) window.PROJECTS = P;                                      // an empty dashboard keeps the built-in sample projects
      window.VIDEOS = videos(R.videos || []);
      window.CMS_WRITINGS = writings(R.writings || []);
      window.CMS_ON = true;
    })
    .catch(e => console.warn('Sanity could not be reached, using the content built into the files.', e))
    .then(() => { clearTimeout(timer); return start(); });
})();
