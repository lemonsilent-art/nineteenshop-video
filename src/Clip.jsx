import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

// IG 輪播用：一張照片＝一支 3 秒多的小影片（1080×1350，4:5）
export const CLIP = 100;   // 3.3 秒（IG 輪播影片最短 3 秒）

const C = { bg: '#F7F1EA', bg2: '#FBE3E8', pink: '#E8829A', deep: '#3A2F2A', soft: '#8A7D74', white: '#FFFFFF', gold: '#F2C14E', line: '#06C755' };
const FONT = '"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const src = (s) => (/^https?:/.test(s) ? s : staticFile(s));
const W = 1080, H = 1350;

/** 固定背景（每支都一樣，滑過去才像同一套）：奶油米色＋粉色圓點慢慢飄 */
const Background = () => {
  const f = useCurrentFrame();
  const dots = [];
  for (let i = 0; i < 12; i++) {
    const x = (i * 173) % W, y0 = (i * 311) % H;
    const y = (y0 - f * (0.5 + (i % 4) * 0.2) + H * 4) % H;
    const r = 10 + (i % 5) * 8;
    dots.push(<div key={i} style={{ position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: '50%', background: i % 3 ? C.bg2 : '#F6D5C8' }} />);
  }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 20% 15%, #FFF8F1 0%, ${C.bg} 55%, #F3E6DA 100%)` }}>
      {dots}
      <div style={{ position: 'absolute', top: 34, left: 0, right: 0, textAlign: 'center', fontFamily: FONT }}>
        <span style={{ fontSize: 44, fontWeight: 900, color: C.deep, letterSpacing: 4 }}>🍞 19號舖子</span>
        <span style={{ display: 'inline-block', marginLeft: 18, padding: '6px 20px', borderRadius: 30, background: C.pink, color: C.white, fontSize: 24, fontWeight: 700, letterSpacing: 3, verticalAlign: 6 }}>日・韓・泰・港 連線代購</span>
      </div>
    </AbsoluteFill>
  );
};

/** 一張照片：商品框從「平躺」立起來變正方形 → 名稱滑上來 → 價格蹦出來；第一支提示往右滑、最後一支放 CTA */
export const Clip = ({ s = {}, i = 0, n = 1, line = '@131zlfyx' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = spring({ frame: f, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
  const rot = interpolate(up, [0, 1], [80, 0]);
  const lift = interpolate(up, [0, 1], [120, 0]);
  const shW = interpolate(up, [0, 1], [1.25, 0.82]);
  const shO = interpolate(up, [0, 1], [0.1, 0.28]);
  const tIn = spring({ frame: f - 10, fps, config: { damping: 16 } });
  const pIn = spring({ frame: f - 18, fps, config: { damping: 9, stiffness: 150 } });
  const cIn = spring({ frame: f - 34, fps, config: { damping: 14 } });
  const sway = Math.sin(f / 12) * 1.1 * up;
  const zoom = interpolate(f, [0, CLIP], [1.0, 1.06]);
  const last = i === n - 1, first = i === 0 && n > 1;
  const nudge = Math.sin(f / 5) * 10;
  const S = 720, L = (W - S) / 2, T = 130;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background />
      <div style={{ position: 'absolute', left: W / 2 - 330 * shW, top: T + S + 16, width: 660 * shW, height: 56, borderRadius: '50%', background: '#5A3A2A', opacity: shO, filter: 'blur(24px)' }} />
      <div style={{ position: 'absolute', left: L, top: T, width: S, height: S, perspective: 1500 }}>
        <div style={{ width: '100%', height: '100%', transformOrigin: '50% 100%', transform: `translateY(${lift}px) rotateX(${rot}deg) rotateZ(${sway}deg)`,
          borderRadius: 38, background: C.white, padding: 18, boxSizing: 'border-box', boxShadow: '0 26px 50px rgba(90,58,42,.18)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 26, overflow: 'hidden', background: '#F2ECE6' }}>
            <Img src={src(s.img || 'logo.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />
          </div>
          {s.tag ? <div style={{ position: 'absolute', top: -22, left: 34, padding: '8px 24px', borderRadius: 26, background: C.deep, color: C.white, fontSize: 30, fontWeight: 800, letterSpacing: 3 }}>{s.tag}</div> : null}
          {n > 1 ? <div style={{ position: 'absolute', top: -20, right: 30, width: 82, height: 82, borderRadius: '50%', background: C.gold, color: C.deep, fontSize: 28, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}/{n}</div> : null}
        </div>
      </div>
      <div style={{ position: 'absolute', top: T + S + 70, left: 60, right: 60, textAlign: 'center', transform: `translateY(${(1 - tIn) * 50}px)`, opacity: tIn }}>
        <div style={{ fontSize: s.title && s.title.length > 14 ? 50 : 60, fontWeight: 900, color: C.deep, lineHeight: 1.18 }}>{s.title}</div>
      </div>
      {s.price ? (
        <div style={{ position: 'absolute', top: T + S + 170, left: 0, right: 0, textAlign: 'center', transform: `scale(${pIn})` }}>
          <span style={{ display: 'inline-block', padding: '10px 40px', borderRadius: 50, background: C.pink, color: C.white, fontSize: 54, fontWeight: 900, boxShadow: '0 10px 22px rgba(232,130,154,.45)' }}>{s.price}</span>
          {s.note ? <span style={{ display: 'inline-block', marginLeft: 16, fontSize: 32, fontWeight: 800, color: C.pink, verticalAlign: 8 }}>🎁 {s.note}</span> : null}
        </div>
      ) : null}
      {first && !last ? (
        <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, textAlign: 'center', opacity: cIn }}>
          <span style={{ display: 'inline-block', padding: '12px 34px', borderRadius: 40, background: C.deep, color: C.white, fontSize: 34, fontWeight: 800, transform: `translateX(${nudge}px)` }}>往右滑看更多 👉</span>
        </div>
      ) : null}
      {last ? (
        <div style={{ position: 'absolute', bottom: 36, left: 40, right: 40, textAlign: 'center', transform: `translateY(${(1 - cIn) * 80}px)`, opacity: cIn }}>
          <div style={{ display: 'inline-block', padding: '12px 30px', borderRadius: 40, background: C.white, color: C.deep, fontSize: 32, fontWeight: 900, boxShadow: '0 8px 20px rgba(90,58,42,.12)' }}>喜歡哪一個？留言 <span style={{ color: C.pink }}>+1</span>・截圖到 <span style={{ color: C.line }}>LINE {line}</span> 下單</div>
        </div>
      ) : (!first && n > 1 ? (
        <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, textAlign: 'center', opacity: cIn }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: C.soft }}>還有 {n - i - 1} 款 👉</span>
        </div>
      ) : null)}
    </AbsoluteFill>
  );
};
