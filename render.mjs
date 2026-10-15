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
  for (const j of jobs.filter((x) => x.kind !== 'set')) {
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
  const serveUrl = await bundle({ entryPoint: path.resolve('src/index.js') });
  // v7：一天的新品輪播（封面＋商品頁＋感謝卡）
  for (const j of jobs.filter((x) => x.kind === 'set' && x._prep)) {
    try { await renderSet(j, serveUrl, j._prep); idx[j.id] = Date.now(); console.log('✅ 做好了', j.id, clipCount(j) + ' 支'); }
    catch (e) { console.log('❌ 失敗', j.id, e.message); }
  }
  // IG 輪播：一張照片做一支 3 秒影片 → v/<編號>-<第幾張>.mp4
  for (const j of jobs.filter((x) => x.kind !== 'set')) {
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
  for (let i = 0; i < clips.length; i++) {
    const out = clipPath(j.id, i);
    if (fs.existsSync(out)) continue;
    const c = clips[i];
    const composition = await selectComposition({ serveUrl, id: c.id, inputProps: c.props, browserExecutable: process.env.BROWSER || null });
    await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: out + '.tmp.mp4', inputProps: c.props, concurrency: 2, crf: 20, pixelFormat: 'yuv420p', enforceAudioTrack: true, browserExecutable: process.env.BROWSER || null });
    await renderStill({ composition, serveUrl, output: path.join(VDIR, `${j.id}-${i}.jpg`), inputProps: c.props, frame: c.id === 'Thanks' ? 50 : 70, imageFormat: 'jpeg', jpegQuality: 88, browserExecutable: process.env.BROWSER || null });
    fs.renameSync(out + '.tmp.mp4', out);
  }
  // FB 用：整組小影片接成一部完整影片 v/<編號>-full.mp4（FB 不能左右滑影片）
  const full = path.join(VDIR, `${j.id}-full.mp4`);
  if (!fs.existsSync(full)) {
    const list = path.join(VDIR, `${j.id}-list.txt`);
    fs.writeFileSync(list, clips.map((_, i) => `file '${clipPath(j.id, i)}'`).join('\n'));
    const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', full + '.tmp.mp4'];
    try { execFileSync('ffmpeg', args, { stdio: 'inherit' }); }
    catch (e) { try { execFileSync('npx', ['remotion', 'ffmpeg', ...args], { stdio: 'inherit' }); } catch (e2) { console.error('⚠️ 完整影片接不起來', e2.message); } }
    if (fs.existsSync(full + '.tmp.mp4')) fs.renameSync(full + '.tmp.mp4', full);
    try { fs.unlinkSync(list); } catch (e) {}
  }
  // 預覽頁（19號小幫手的「▶️ 看輪播」）
  const vids = clips.map((_, i) => `<div class="c"><video src="${j.id}-${i}.mp4" poster="${j.id}-${i}.jpg" controls muted loop playsinline preload="none"></video><p>${i + 1}/${clips.length}</p></div>`).join('');
  fs.writeFileSync(path.join(VDIR, j.id + '.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>19號舖子 輪播預覽</title><style>body{margin:0;background:#FDF1EC;font-family:sans-serif}h1{font-size:18px;padding:12px 16px;margin:0;color:#4A3530}.r{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 16px 16px}.c{flex:0 0 82%;scroll-snap-align:center}video{width:100%;border-radius:16px;background:#fff;aspect-ratio:3/4}p{text-align:center;color:#8A7268;margin:4px}pre{white-space:pre-wrap;padding:0 16px 32px;color:#4A3530;font-size:15px}</style><h1>${(j.title || '') + ' ' + (j.title2 || '')}（左右滑）</h1><div class="r">${vids}</div><pre>${String(j.caption || '').replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</pre>`);
}
