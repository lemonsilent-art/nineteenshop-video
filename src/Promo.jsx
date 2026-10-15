import React from 'react';
import { AbsoluteFill, Sequence, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Easing } from 'remotion';

export const INTRO = 24;   // 開頭：店名
export const SLIDE = 84;   // 每件商品 2.8 秒
export const OUTRO = 54;   // 結尾：截圖到官方 LINE 下單

const C = { bg: '#F7F1EA', bg2: '#FBE3E8', pink: '#E8829A', deep: '#3A2F2A', soft: '#8A7D74', white: '#FFFFFF', gold: '#F2C14E' };
const FONT = '"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const src = (s) => (/^https?:/.test(s) ? s : staticFile(s));

/** 固定背景：奶油米色＋粉色圓點，慢慢飄（不會搶商品的戲） */
const Background = () => {
  const f = useCurrentFrame();
  const dots = [];
  for (let i = 0; i < 14; i++) {
    const x = (i * 173) % 1080, y0 = (i * 311) % 1920;
    const y = (y0 - f * (0.6 + (i % 4) * 0.25) + 1920 * 4) % 1920;
    const r = 10 + (i % 5) * 9;
    dots.push(<div key={i} style={{ position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: '50%', background: i % 3 ? C.bg2 : '#F6D5C8', opacity: 0.9 }} />);
  }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 20% 15%, #FFF8F1 0%, ${C.bg} 55%, #F3E6DA 100%)` }}>
      {dots}
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: FONT }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: C.deep, letterSpacing: 6 }}>🍞 19號舖子</div>
        <div style={{ display: 'inline-block', marginTop: 14, padding: '8px 26px', borderRadius: 40, background: C.pink, color: C.white, fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>日・韓・泰・港 連線代購</div>
      </div>
    </AbsoluteFill>
  );
};

/** 一件商品：卡片從「平躺」立起來變成正方形 → 名稱滑上來 → 價格蹦出來 */
const Slide = ({ s, i, n }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = spring({ frame: f, fps, config: { damping: 14, stiffness: 90, mass: 0.9 } });
  const rot = interpolate(up, [0, 1], [78, 0]);
  const lift = interpolate(up, [0, 1], [160, 0]);
  const shW = interpolate(up, [0, 1], [1.25, 0.82]);
  const shO = interpolate(up, [0, 1], [0.12, 0.28]);
  const out = interpolate(f, [SLIDE - 12, SLIDE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const tIn = spring({ frame: f - 14, fps, config: { damping: 16 } });
  const pIn = spring({ frame: f - 24, fps, config: { damping: 9, stiffness: 140 } });
  const sway = Math.sin(f / 14) * 1.2 * up;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, transform: `translateX(${-out * 1100}px) rotate(${-out * 6}deg)`, opacity: 1 - out * 0.3 }}>
      {/* 卡片影子 */}
      <div style={{ position: 'absolute', left: 540 - 430 * shW, top: 1178, width: 860 * shW, height: 70, borderRadius: '50%', background: '#5A3A2A', opacity: shO, filter: 'blur(26px)' }} />
      {/* 商品框 */}
      <div style={{ position: 'absolute', left: 110, top: 300, width: 860, height: 860, perspective: 1700 }}>
        <div style={{ width: '100%', height: '100%', transformOrigin: '50% 100%', transform: `translateY(${lift}px) rotateX(${rot}deg) rotateZ(${sway}deg)`,
          borderRadius: 44, background: C.white, padding: 22, boxSizing: 'border-box', boxShadow: '0 30px 60px rgba(90,58,42,.18)', border: `6px solid ${C.white}` }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', background: '#F2ECE6' }}>
            <Img src={src(s.img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {s.tag ? <div style={{ position: 'absolute', top: -26, left: 40, padding: '10px 28px', borderRadius: 30, background: C.deep, color: C.white, fontSize: 34, fontWeight: 800, letterSpacing: 4 }}>{s.tag}</div> : null}
          <div style={{ position: 'absolute', top: -22, right: 36, width: 92, height: 92, borderRadius: '50%', background: C.gold, color: C.deep, fontSize: 30, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}/{n}</div>
        </div>
      </div>
      {/* 商品名稱 */}
      <div style={{ position: 'absolute', top: 1250, left: 70, right: 70, textAlign: 'center', transform: `translateY(${(1 - tIn) * 60}px)`, opacity: tIn }}>
        <div style={{ fontSize: s.title && s.title.length > 14 ? 58 : 70, fontWeight: 900, color: C.deep, lineHeight: 1.18 }}>{s.title}</div>
      </div>
      {/* 價格 */}
      {s.price ? (
        <div style={{ position: 'absolute', top: 1420, left: 0, right: 0, textAlign: 'center', transform: `scale(${pIn})` }}>
          <span style={{ display: 'inline-block', padding: '14px 46px', borderRadius: 60, background: C.pink, color: C.white, fontSize: 64, fontWeight: 900, boxShadow: '0 12px 26px rgba(232,130,154,.45)' }}>{s.price}</span>
          {s.note ? <div style={{ marginTop: 14, fontSize: 36, fontWeight: 700, color: C.pink }}>🎁 {s.note}</div> : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Intro = ({ shop }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 12 } });
  const o = interpolate(f, [INTRO - 8, INTRO], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, justifyContent: 'center', alignItems: 'center', opacity: o }}>
      <div style={{ transform: `scale(${p})`, fontSize: 92, fontWeight: 900, color: C.pink, textAlign: 'center', lineHeight: 1.3 }}>新品到貨啦～<br /><span style={{ color: C.deep, fontSize: 64 }}>往右滑看看 👉</span></div>
    </AbsoluteFill>
  );
};

const Outro = ({ line }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 11 } });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${p})`, textAlign: 'center' }}>
        <div style={{ fontSize: 76, fontWeight: 900, color: C.deep, lineHeight: 1.35 }}>喜歡的請「截圖」<br />到官方 LINE 下單 📲</div>
        <div style={{ display: 'inline-block', marginTop: 40, padding: '18px 54px', borderRadius: 60, background: '#06C755', color: C.white, fontSize: 56, fontWeight: 900 }}>LINE {line}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Promo = ({ slides = [], shop, line }) => {
  const n = slides.length;
  return (
    <AbsoluteFill>
      <Background />
      <Sequence durationInFrames={INTRO}><Intro shop={shop} /></Sequence>
      {slides.map((s, i) => (
        <Sequence key={i} from={INTRO + i * SLIDE} durationInFrames={SLIDE}><Slide s={s} i={i} n={n} /></Sequence>
      ))}
      <Sequence from={INTRO + n * SLIDE}><Outro line={line} /></Sequence>
    </AbsoluteFill>
  );
};
