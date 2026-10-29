// Loads the content that is built into the site (projects, videos, writing, texts) into the Sanity dashboard.
// Run it once from the studio folder, after "npx sanity login":   npm run import
// It uses fixed document ids, so running it again updates the same documents instead of duplicating them.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import {fileURLToPath} from 'node:url'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-01-01'})
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const key = () => Math.random().toString(36).slice(2, 12)

// data.js and manifest.js assign to window.*, so run them in a small sandbox
const win = {}
vm.runInNewContext(fs.readFileSync(path.join(SITE, 'data.js'), 'utf8'), {window: win})
const {PROJECTS, VIDEOS} = win

const cache = new Map()
async function upload(rel) {                                  // rel is like "matt/steamboat-springs/01.jpg"
  if (cache.has(rel)) return cache.get(rel)
  const file = path.join(SITE, 'assets', rel)
  const asset = await client.assets.upload('image', fs.createReadStream(file), {filename: path.basename(rel)})
  const ref = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
  cache.set(rel, ref)
  return ref
}
async function pool(items, size, fn) {                        // a few uploads at the same time
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({length: size}, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i) }
  }))
  return out
}

// markdown (the sample writing files) to Sanity's text format
function spans(text) {
  const children = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) children.push({_type: 'span', _key: key(), text: text.slice(last, m.index), marks: []})
    const strong = m[0].startsWith('**')
    children.push({_type: 'span', _key: key(), text: m[0].slice(strong ? 2 : 1, strong ? -2 : -1), marks: [strong ? 'strong' : 'em']})
    last = m.index + m[0].length
  }
  if (last < text.length) children.push({_type: 'span', _key: key(), text: text.slice(last), marks: []})
  return children.length ? children : [{_type: 'span', _key: key(), text: '', marks: []}]
}
function parseWriting(md) {
  const m = md.replace(/\r/g, '').match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  const meta = {}
  m[1].split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim() })
  const body = m[2].trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).filter((b) => !/^!\[/.test(b)).map((b) => {
    let style = 'normal', text = b.replace(/\n/g, ' ')
    if (b.startsWith('>')) { style = 'blockquote'; text = b.replace(/^>\s?/gm, '').replace(/\n/g, ' ') }
    else if (b.startsWith('## ')) { style = 'h2'; text = b.slice(3) }
    return {_type: 'block', _key: key(), style, markDefs: [], children: spans(text)}
  })
  return {meta, body}
}

// the small line is a date like 10/28/24 for most projects; otherwise use the middle of the year
function dateOf(p) {
  const m = /^(\d\d)\/(\d\d)\/(\d\d)$/.exec(p.sub || '')
  return m ? `20${m[3]}-${m[1]}-${m[2]}` : `${p.year}-01-15`
}

async function main() {
  console.log(`Importing into project ${client.config().projectId}, dataset ${client.config().dataset}`)

  // projects
  for (const p of PROJECTS) {
    console.log('Project:', p.title, p.sub)
    const photos = await pool(p.items.filter((i) => i.t === 'img'), 4, async (it) => ({
      _type: 'photo', _key: key(), image: await upload(it.src), caption: it.cap || '',
    }))
    await client.createOrReplace({
      _id: `project-${p.id}`, _type: 'project', title: p.title, subtitle: p.sub, date: dateOf(p),
      blurb: '', cover: await upload(p.cover), photos,
    })
  }

  // videos
  // videos have no date in the sample: they are created last-to-first so the newest-created one (the first in the list) comes first on the site
  for (const v of [...VIDEOS].reverse()) {
    console.log('Video:', v.title)
    await client.delete(`video-${v.id.replace(/[^\w-]/g, '')}`).catch(() => {})
    await new Promise((r) => setTimeout(r, 1100))
    await client.createOrReplace({_id: `video-${v.id.replace(/[^\w-]/g, '')}`, _type: 'video', title: v.title, youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`})
  }

  // writing
  const dir = path.join(SITE, 'assets', 'writings')
  for (const slug of JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))) {
    const {meta, body} = parseWriting(fs.readFileSync(path.join(dir, `${slug}.md`), 'utf8'))
    console.log('Writing:', meta.title)
    await client.createOrReplace({_id: `writing-${slug}`, _type: 'writing', title: meta.title, date: meta.date, tag: meta.tag || '', excerpt: meta.excerpt || '', body})
  }

  // site texts (the ones written in index.html)
  console.log('Site texts')
  await client.createOrReplace({
    _id: 'siteSettings', _type: 'siteSettings',
    heroImage: await upload('matt/home/hero.jpg'),
    heroTagline: 'Where the road meets the light. —\nNational parks, wildlife and quiet places, photographed and filmed on the way.',
    aboutHeading: 'I follow the light\nand wait for it.',
    aboutText: 'Hey there, my name is Matt. This is a home for some of the pictures and videos I have taken and worked on over the past five or so years. Most of it happens outside: long drives, early alarms, cold hands and a camera that gets heavier by the hour. The mission is simple: bring back the place the way it felt.',
    subjects: ['Landscape', 'Wildlife', 'Road trips', 'Short films', 'Landscape Photography', 'Wildlife Photography', 'National Parks', 'Winter', 'Mountains', 'Hot springs', 'Interviews', 'Documentary', 'Editing'],
    places: ['Yellowstone', 'Grand Teton', 'Steamboat Springs', 'Lamar Valley', 'Old Faithful', 'Grassy Lake Road', 'Mammoth Hot Springs', 'Norris Geyser Basin', 'Colorado', 'Wyoming', 'West Thumb', 'Riddle Lake'],
    email: 'hello@example.com',
    instagramUrl: 'https://www.instagram.com/matshants7',
    youtubeUrl: 'https://www.youtube.com/@matshants7',
  })
  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
