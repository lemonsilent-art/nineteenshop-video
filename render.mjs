// 19號舖子：自動做 IG Reels 影片
// 1. 跟網站後台拿「待製作」的影片工作（只有公開的商品照片、名稱、售價）
// 2. 用 Remotion 做成直式影片 → 放到 site/v/<編號>.mp4（GitHub Pages）
// 3. 19號小幫手巡邏時看到影片做好了，就發到 IG Reels（掛熱門音樂）
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const SITE = path.resolve('site');
const VDIR = path.join(SITE, 'v');
fs.mkdirSync(VDIR, { recursive: true });
// Pixabay 免版權音樂（Pixabay Content License：可商用、不用標示）；第一次用時下載到 public/bgm
const BGM_URLS = [
  'https://cdn.pixabay.com/download/audio/2025/03/03/audio_dd229d9ddd.mp3',   // Fashion Pop - Kulakovka
  'https://cdn.pixabay.com/download/audio/2026/07/06/audio_cbe1a27af7.mp3',   // Fashion Pop - JonasBlakewood
  'https://cdn.pixabay.com/download/audio/2025/09/29/audio_77a36612dd.mp3',   // Escape Your Love - FASSounds
  'https://cdn.pixabay.com/download/audio/2025/02/09/audio_a9cb3e9786.mp3',   // Summer Pop - Kulakovka
  'https://cdn.pixabay.com/download/audio/2026/10/01/audio_d0a162bffd.mp3',   // Cute Lofi - ZephiraMusic
  'https://cdn.pixabay.com/download/audio/2026/08/14/audio_a5f2abd4d3.mp3',   // Chill Lofi - ZephiraMusic
  'https://cdn.pixabay.com/download/audio/2026/09/28/audio_e5f88d6b9d.mp3',   // Vlog - No-Copyright-Music-2026
];
async function getBgms() {
fs.mkdirSync(path.resolve('public', 'bgm'), { recursive: true });
for (const u of BGM_URLS) {
  const f = path.resolve('public', 'bgm', 'px_' + path.basename(u));
  if (fs.existsSync(f)) continue;
  try {
    const r = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', Referer: 'https://pixabay.com/' } });
    const b = Buffer.from(await r.arrayBuffer());
    if (r.ok && b.length > 100000) fs.writeFileSync(f, b); else console.log('音樂下載失敗', r.status, b.length, u);
  } catch (e) { console.log('音樂下載失敗', e.message, u); }
}
}
let BGMS = [];
const listBgms = () => { try { return fs.readdirSync(path.resolve('public', 'bgm')).filter((f) => /\.(mp3|m4a)$/i.test(f)).sort().map((f) => path.resolve('public', 'bgm', f)); } catch (e) { return []; } };   // 免版權配樂放 public/bgm（沒有就無聲；IG Reels 另外掛 IG 熱門音樂）
const bgmFor = (id) => BGMS.length ? BGMS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % BGMS.length] : null;
const ff = (args) => { try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); } catch (e) { execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); } };
const dur = (f) => { try { return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' })) || 0; } catch (e) { return 0; } };
const idxFile = path.join(SITE, 'index.json');
let idx = {};
try { idx = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch (e) {}

// 太舊的影片刪掉（IG 已經發完了，不用一直佔空間）
const keep = Date.now() - (cfg.KEEP_DAYS || 7) * 864e5;
for (const [id, t] of Object.entries(idx)) {
  if (t < keep) { for (const f of fs.readdirSync(VDIR)) if (f.startsWith(id + '-') || f === id + '.mp4') fs.unlinkSync(path.join(VDIR, f)); delete idx[id]; }
}

const res = await fetch(cfg.API_URL + '?action=videojobs', { redirect: 'follow' });
const data = await res.json();
const clipPath = (id, i) => path.join(VDIR, `${id}-${i}.mp4`);
const clipCount = (j) => (j.kind === 'set' ? Math.min(10, (j.slides || []).length + 2) : Math.min(10, (j.slides || []).length));
const done = (j) => Array.from({ length: clipCount(j) }).every((_, i) => fs.existsSync(clipPath(j.id, i)));
const jobs = (data.jobs || []).filter((j) => /^v\w{4,20}$/.test(j.id) && (j.slides || []).length && !done(j));
console.log('待製作：', jobs.map((j) => j.id).join(', ') || '（沒有）');

if (jobs.length) {
  const pub = path.resolve('public', 'jobs');
  fs.mkdirSync(pub, { recursive: true });
  // 先把照片下載下來（避免做影片時讀不到雲端圖片）
  const OLD = (x) => !['set', 'single', 'live'].includes(x.kind);
  for (const j of jobs.filter(OLD)) {
    for (let i = 0; i < j.slides.length; i++) {
      const s = j.slides[i];
      try {
        const r = await fetch(s.img, { redirect: 'follow' });
        if (!r.ok) throw new Error('http ' + r.status);
        if (!/^image\//.test(r.headers.get('content-type') || '')) throw new Error('不是圖片：' + r.headers.get('content-type'));
        const f = `${j.id}-${i}.jpg`;
        fs.writeFileSync(path.join(pub, f), Buffer.from(await r.arrayBuffer()));
        s.img = 'jobs/' + f;
      } catch (e) { console.log('照片下載失敗', j.id, i, e.message); s.img = 'logo.png'; }
    }
  }
  // v7：先下載、去背（要在 bundle 之前，圖片才會被打包進去）
  for (const j of jobs.filter((x) => x.kind === 'set')) {
    try { j._prep = await prepareSet(j, pub); } catch (e) { console.log('❌ 準備失敗', j.id, e.message); }
  }
  // v8：單品輪播、連線合輯
  for (const j of jobs.filter((x) => x.kind === 'single' || x.kind === 'live')) {
    try { j._clips = j.kind === 'single' ? await prepareSingle(j, pub) : await prepareLive(j, pub); } catch (e) { console.log('❌ 準備失敗', j.id, e.message); }
  }
  await getBgms(); BGMS = listBgms(); console.log('配樂：' + BGMS.length + ' 首');
  const serveUrl = await bundle({ entryPoint: path.resolve('src/index.js') });
  // v7：一天的新品輪播（封面＋商品頁＋感謝卡）
  for (const j of jobs.filter((x) => x.kind === 'set' && x._prep)) {
    try { await renderSet(j, serveUrl, j._prep); idx[j.id] = Date.now(); console.log('✅ 做好了', j.id, clipCount(j) + ' 支'); }
    catch (e) { console.log('❌ 失敗', j.id, e.message); }
  }
  for (const j of jobs.filter((x) => (x.kind === 'single' || x.kind === 'live') && x._clips)) {
    try { await renderClips(j, serveUrl, j._clips); idx[j.id] = Date.now(); console.log('✅ 做好了', j.id, j._clips.length + ' 支'); }
    catch (e) { console.log('❌ 失敗', j.id, e.message); }
  }
  // IG 輪播：一張照片做一支 3 秒影片 → v/<編號>-<第幾張>.mp4
  for (const j of jobs.filter(OLD)) {
    const slides = j.slides.slice(0, 10), n = slides.length;
    let ok = true;
    for (let i = 0; i < n; i++) {
      const out = clipPath(j.id, i);
      if (fs.existsSync(out)) continue;
      const inputProps = { s: slides[i], i, n, line: j.line || '@131zlfyx' };
      try {
        const composition = await selectComposition({ serveUrl, id: 'Clip', inputProps, browserExecutable: process.env.BROWSER || null });
        await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: out + '.tmp.mp4', inputProps, concurrency: 2, crf: 20, pixelFormat: 'yuv420p',
          enforceAudioTrack: true, browserExecutable: process.env.BROWSER || null });   // 加無聲音軌（IG 比較不會拒收）
        fs.renameSync(out + '.tmp.mp4', out);
      } catch (e) { ok = false; console.log('❌ 失敗', j.id, i, e.message); }
    }
    if (ok) { idx[j.id] = Date.now(); console.log('✅ 做好了', j.id, n + ' 支'); }
  }
}
fs.writeFileSync(idxFile, JSON.stringify(idx));
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
fs.writeFileSync(path.join(SITE, 'index.html'), '<meta charset="utf-8"><title>19號舖子影片</title><p>19號舖子 IG 影片暫存區</p>');

/* ---------- v7：下載圖片 → 商品去背 → 一張一張做影片＋靜態圖＋預覽頁 ---------- */
async function download(url, file) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('http ' + r.status);
  if (!/^image\//.test(r.headers.get('content-type') || '')) throw new Error('不是圖片');
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
async function prepareSet(j, pub) {
  const local = async (url, name) => {
    if (!url) return 'logo.png';
    const f = `${j.id}-${name}.jpg`;
    try { await download(url, path.join(pub, f)); return 'jobs/' + f; } catch (e) { console.log('圖片下載失敗', name, e.message); return 'logo.png'; }
  };
  const cover = await local(j.cover, 'cover');
  const thanks = await local(j.thanks, 'thanks');
  const slides = [];
  const cutArgs = [];
  for (let i = 0; i < Math.min(8, (j.slides || []).length); i++) {
    const s = j.slides[i];
    const person = await local(s.person, 'p' + i);
    const prods = [];
    for (let k = 0; k < Math.min(3, (s.products || []).length); k++) {
      const p = await local(s.products[k], `s${i}-${k}`);
      const cutName = `jobs/${j.id}-s${i}-${k}-cut.png`;
      if (p !== 'logo.png') cutArgs.push(path.join('public', p), path.join('public', cutName));
      prods.push({ src: p, cut: false, cutName });
    }
    slides.push({ person, products: prods, names: s.names || [], desc: s.desc || '', tag: s.tag || '' });
  }
  // 去背（失敗就用有白框的原圖）
  if (cutArgs.length) {
    try {
      const out = execFileSync('python3', ['cutout.py', ...cutArgs], { encoding: 'utf8', timeout: 15 * 60e3 });
      const okSet = {};
      out.split('\n').filter(Boolean).forEach((l) => { try { const o = JSON.parse(l); if (o.ok) okSet[o.out] = 1; } catch (e) {} });
      slides.forEach((s) => s.products.forEach((p) => { if (okSet[path.join('public', p.cutName)]) { p.src = p.cutName; p.cut = true; } }));
    } catch (e) { console.log('去背失敗，用原圖', e.message); }
  }
  return { cover, thanks, slides };
}
async function renderSet(j, serveUrl, prep) {
  const { cover, thanks, slides } = prep;
  const n = slides.length + 2;
  const clips = [{ id: 'Cover', props: { img: cover, title: j.title, title2: j.title2 || '本日新品', sub: j.sub || '', variant: j.variant || 0 } }]
    .concat(slides.map((s, i) => ({ id: 'Item', props: { ...s, i: i + 1, n, side: i % 2 } })))
    .concat([{ id: 'Thanks', props: { img: thanks } }]);
  return renderClips(j, serveUrl, clips);
}
/* v9：IG 輪播只收 4:5～16:9 → 每支小影片轉成 1080×1350（左右用模糊底補滿）＋背景音樂；
   FB／IG Reels 完整版做成 9:16（1080×1920，上下模糊底），限動不會切到字 */
function frameIt(src, out, W, H, fgW, fgH, bgm, at, len, fadeIn, fgY) {
  const vf = `[0:v]split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:2,eq=brightness=-0.04:saturation=1.1[bg];` +
    `[b]scale=${fgW}:${fgH}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:${fgY == null ? '(H-h)/2' : fgY},setsar=1,format=yuv420p[v]`;
  const a = bgm && len > 0;
  const args = ['-i', src];
  if (a) args.push('-stream_loop', '-1', '-ss', String(at.toFixed(3)), '-i', bgm);
  else args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');   // 沒配樂也放無聲音軌（IG／FB 比較不會拒收）
  args.push('-filter_complex', vf + (a ? `;[1:a]atrim=0:${len.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=${fadeIn},afade=t=out:st=${Math.max(0, len - 0.5).toFixed(3)}:d=0.5,volume=0.85[au]` : ''),
    '-map', '[v]', '-map', a ? '[au]' : '1:a', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', '30', '-movflags', '+faststart', '-t', (len > 0 ? len : dur(src) || 60).toFixed(3), out);
  ff(args);
}
/** v96：封面停格 T 秒，再 0.3 秒淡入原本的動畫（只動畫面，聲音之後統一配） */
function holdCover(raw, still, T, w, h) {
  const tmp = raw.replace(/\.raw\.mp4$/, '.hold.mp4');
  const X = 0.3;
  ff(['-loop', '1', '-t', String(T + X), '-i', still, '-i', raw, '-filter_complex',
    `[0:v]scale=${w}:${h},fps=30,format=yuv420p,setsar=1[a];[1:v]fps=30,format=yuv420p,setsar=1[b];[a][b]xfade=transition=fade:duration=${X}:offset=${T}[v]`,
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', tmp]);
  fs.renameSync(tmp, raw);
}
/** v96：封面圖：<編號>-cover.jpg（9:16，Reels／FB 縮圖）、<編號>-cover45.jpg（4:5，IG 輪播第一張） */
function coverImages(id, still) {
  const mk = (W, H, fgW, fgH, y, out) => ff(['-i', still, '-filter_complex',
    `[0:v]split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:2,eq=brightness=-0.04:saturation=1.1[bg];[b]scale=${fgW}:${fgH}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:${y}`,
    '-frames:v', '1', '-q:v', '2', path.join(VDIR, out)]);
  mk(1080, 1920, 1000, 1400, 230, `${id}-cover.jpg`);
  mk(1080, 1350, 1080, 1350, '(H-h)/2', `${id}-cover45.jpg`);
}
async function renderClips(j, serveUrl, clips) {
  const bgm = bgmFor(j.id);
  let at = 0;
  for (let i = 0; i < clips.length; i++) {
    const out = clipPath(j.id, i), raw = out.replace(/\.mp4$/, '.raw.mp4');
    if (fs.existsSync(out)) { at += dur(out); continue; }
    const c = clips[i];
    const composition = await selectComposition({ serveUrl, id: c.id, inputProps: c.props, browserExecutable: process.env.BROWSER || null });
    if (!fs.existsSync(raw)) await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: raw, inputProps: c.props, concurrency: 2, crf: 18, pixelFormat: 'yuv420p', enforceAudioTrack: true, browserExecutable: process.env.BROWSER || null });
    const still = path.join(VDIR, `${j.id}-${i}.jpg`);
    await renderStill({ composition, serveUrl, output: still, inputProps: c.props, frame: Math.min(composition.durationInFrames - 1, c.id === 'Thanks' ? 50 : c.id === 'LiveGrid' ? 110 : 80), imageFormat: 'jpeg', jpegQuality: 92, browserExecutable: process.env.BROWSER || null });
    // v96：每支影片第一格就是完整清楚的封面（IG／FB 縮圖不會再霧霧的）→ 封面停一下再淡入動畫
    if (!fs.existsSync(raw + '.c')) { try { holdCover(raw, still, i === 0 ? 1.2 : 0.5, composition.width, composition.height); fs.writeFileSync(raw + '.c', '1'); } catch (e) { console.log('封面停格失敗', e.message); } }
    if (i === 0) { try { coverImages(j.id, still); } catch (e) { console.log('封面圖失敗', e.message); } }
    const len = dur(raw);
    frameIt(raw, out + '.tmp.mp4', 1080, 1350, 1080, 1350, bgm, at, len, i === 0 ? 0.3 : 0.12);
    fs.renameSync(out + '.tmp.mp4', out);
    at += len;
  }
  // FB 用：整組接成一部完整影片 v/<編號>-full.mp4（9:16，上下模糊底，連續音樂）
  const full = path.join(VDIR, `${j.id}-full.mp4`);
  if (!fs.existsSync(full)) {
    const list = path.join(VDIR, `${j.id}-list.txt`), cat = path.join(VDIR, `${j.id}-cat.mp4`);
    const parts = clips.map((_, i) => { const raw = clipPath(j.id, i).replace(/\.mp4$/, '.raw.mp4'); return fs.existsSync(raw) ? raw : clipPath(j.id, i); });
    fs.writeFileSync(list, parts.map((f) => `file '${f}'`).join('\n'));
    try {
      ff(['-f', 'concat', '-safe', '0', '-i', list, '-map', '0:v', '-c', 'copy', cat]);
      frameIt(cat, full + '.tmp.mp4', 1080, 1920, 1000, 1400, bgm, 0, dur(cat), 0.3, 230);   // 偏上放：避開 Reels／限動下方的文字和按鈕
      if (fs.existsSync(full + '.tmp.mp4')) fs.renameSync(full + '.tmp.mp4', full);
    } catch (e) { console.error('⚠️ 完整影片接不起來', e.message); }
    for (const f of [list, cat]) try { fs.unlinkSync(f); } catch (e) {}
  }
  if (fs.existsSync(full)) for (let i = 0; i < clips.length; i++) { const rw = clipPath(j.id, i).replace(/\.mp4$/, '.raw.mp4'); for (const f of [rw, rw + '.c']) try { fs.unlinkSync(f); } catch (e) {} }
  // 預覽頁（19號小幫手的「▶️ 看輪播」）
  const vids = clips.map((_, i) => `<div class="c"><video src="${j.id}-${i}.mp4" poster="${j.id}-${i}.jpg" controls loop playsinline preload="none"></video><p>${i + 1}/${clips.length}</p></div>`).join('');
  fs.writeFileSync(path.join(VDIR, j.id + '.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>19號舖子 輪播預覽</title><style>body{margin:0;background:#FDF1EC;font-family:sans-serif}h1{font-size:18px;padding:12px 16px;margin:0;color:#4A3530}.r{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 16px 16px}.c{flex:0 0 82%;scroll-snap-align:center}video{width:100%;border-radius:16px;background:#fff;aspect-ratio:4/5}p{text-align:center;color:#8A7268;margin:4px}pre{white-space:pre-wrap;padding:0 16px 32px;color:#4A3530;font-size:15px}</style><h1>${(j.title || '') + ' ' + (j.title2 || '')}（左右滑）</h1><div class="r">${vids}</div><pre>${String(j.caption || '').replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</pre>`);
}

/* ---------- v8：單品輪播（封面 C：場景＋人物去背＋商品貼紙；後面每張照片滿版 A） ---------- */
function palette(file) {
  try { return JSON.parse(execFileSync('python3', ['palette.py', file], { encoding: 'utf8', timeout: 60e3 }).trim() || '{}'); } catch (e) { return {}; }
}
async function prepareSingle(j, pub) {
  const local = async (url, name) => {
    if (!url) return 'logo.png';
    const f = `${j.id}-${name}.jpg`;
    try { await download(url, path.join(pub, f)); return 'jobs/' + f; } catch (e) { console.log('圖片下載失敗', name, e.message); return 'logo.png'; }
  };
  const slides = (j.slides || []).slice(0, 10);
  for (let i = 0; i < slides.length; i++) slides[i].local = await local(slides[i].img, 'a' + i);
  const person = await local(j.person, 'person');
  const prod = await local(j.cutSrc || (slides[1] || slides[0] || {}).img, 'prod');
  const cutP = `jobs/${j.id}-person-cut.png`, cutG = `jobs/${j.id}-prod-cut.png`;
  const okSet = {};
  try {
    const out = execFileSync('python3', ['cutout.py', path.join('public', person), path.join('public', cutP), path.join('public', prod), path.join('public', cutG)], { encoding: 'utf8', timeout: 15 * 60e3 });
    out.split('\n').filter(Boolean).forEach((l) => { try { const o = JSON.parse(l); if (o.ok) okSet[o.out] = 1; } catch (e) {} });
  } catch (e) { console.log('去背失敗', e.message); }
  const personCut = okSet[path.join('public', cutP)] ? cutP : person;
  const prodCut = okSet[path.join('public', cutG)] ? cutG : prod;
  const pal = okSet[path.join('public', cutG)] ? palette(path.join('public', cutG)) : {};
  const h1 = pal.h1 != null ? pal.h1 : (j.h1 != null ? j.h1 : 340), h2 = pal.h2 != null ? pal.h2 : j.h2;
  const tag = j.tag || '';
  const n = slides.length;
  return slides.map((s, i) => i === 0
    ? { id: 'CoverC', props: { scene: s.local, person: personCut, cut: prodCut, title: s.title || '', sub: s.sub || '', tag, h1, h2 } }
    : { id: 'SlideA', props: { img: s.local, mode: s.mode || 'point', title: s.title || '', sub: s.sub || '', point: s.point || i, i, n, tag, h1, h2, cut: s.mode === 'cta' ? prodCut : undefined } });
}
/* ---------- v8：連線合輯（每個國家：大圖一頁＋九宮格） ---------- */
async function prepareLive(j, pub) {
  const clips = [];
  const slides = (j.slides || []).slice(0, 10);
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const get = async (url, name) => { if (!url) return 'logo.png'; const f = `${j.id}-${name}.jpg`; try { await download(url, path.join(pub, f)); return 'jobs/' + f; } catch (e) { return 'logo.png'; } };
    if (s.type === 'hero') clips.push({ id: 'LiveHero', props: { img: await get(s.img, 'h' + i), name: s.name || '', country: s.country || '', flag: s.flag || '', city: s.city || '', close: s.close || '', h1: s.h1, h2: s.h2 } });
    else {
      const items = [];
      for (let k = 0; k < Math.min(9, (s.items || []).length); k++) items.push({ img: await get(s.items[k].img, `g${i}-${k}`), name: s.items[k].name || '' });
      clips.push({ id: 'LiveGrid', props: { items, country: s.country || '', flag: s.flag || '', page: s.page || 1, pages: s.pages || 1, start: s.start || 1, close: s.close || '', h1: s.h1, h2: s.h2 } });
    }
  }
  return clips;
}
