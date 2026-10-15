// 19號舖子：自動做 IG Reels 影片
// 1. 跟網站後台拿「待製作」的影片工作（只有公開的商品照片、名稱、售價）
// 2. 用 Remotion 做成直式影片 → 放到 site/v/<編號>.mp4（GitHub Pages）
// 3. 19號小幫手巡邏時看到影片做好了，就發到 IG Reels（掛熱門音樂）
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

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
const done = (j) => j.slides.slice(0, 10).every((_, i) => fs.existsSync(clipPath(j.id, i)));
const jobs = (data.jobs || []).filter((j) => /^v\w{4,20}$/.test(j.id) && (j.slides || []).length && !done(j));
console.log('待製作：', jobs.map((j) => j.id).join(', ') || '（沒有）');

if (jobs.length) {
  const pub = path.resolve('public', 'jobs');
  fs.mkdirSync(pub, { recursive: true });
  // 先把照片下載下來（避免做影片時讀不到雲端圖片）
  for (const j of jobs) {
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
  const serveUrl = await bundle({ entryPoint: path.resolve('src/index.js') });
  // IG 輪播：一張照片做一支 3 秒影片 → v/<編號>-<第幾張>.mp4
  for (const j of jobs) {
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
