import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Easing } from 'remotion';

// v8：單品輪播（同一件商品的每張照片一支影片）
//   A＝照片滿版　B＝滿版模糊背景＋正方形從躺著立起來　C＝封面：人物去背＋商品貼紙
//   顏色跟著商品變：h1＝商品主色、h2＝商品副色（palette.py 算的）
export const SW = 1080, SH = 1440;
export const LEN = { hook: 120, point: 100, scene: 115, cta: 120 };
const FONT = '"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const src = (s) => (!s ? staticFile('logo.png') : /^https?:/.test(s) ? s : staticFile(s));
const hsl = (h, s, l, a = 1) => `hsla(${Math.round(h)},${s}%,${l}%,${a})`;

export const theme = (h1 = 340, h2) => {
  if (h2 == null) h2 = (h1 + 150) % 360;
  const light = h1 > 35 && h1 < 75;   // 黃色系本身很亮 → 描邊要更深
  return {
    stroke: hsl(h1, 85, light ? 30 : 36), shadow: hsl(h1, 55, 12), ribbonBg: hsl(h1, 100, 94), ribbonText: hsl(h1, 55, 16),
    dash: hsl(h2, 80, 52), stamp: hsl(h2, 85, 52), stampText: '#fff', tag: hsl(h2, 80, 50), badge: hsl(h1, 95, light ? 55 : 60), badgeText: hsl(h1, 60, 12),
    glow: hsl(h1, 100, 70, 0.55), tint: hsl(h1, 60, 18, 0.55),
  };
};

const Sparkle = ({ size = 40, color = '#fff', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}><path d="M12 0c.8 6.2 5.8 11.2 12 12-6.2.8-11.2 5.8-12 12-.8-6.2-5.8-11.2-12-12C6.2 11.2 11.2 6.2 12 0z" fill={color} /></svg>
);
const Sparkles = ({ t }) => {
  const f = useCurrentFrame();
  return [[110, 860, 46, 0], [960, 760, 38, 7], [880, 980, 30, 14], [70, 600, 28, 20], [520, 120, 34, 26], [990, 420, 26, 33]].map(([x, y, s, d], k) => {
    const p = ((f + d * 3) % 45) / 45, a = Math.sin(p * Math.PI);
    return <Sparkle key={k} size={s} color={k % 3 ? '#fff' : t.badge} style={{ position: 'absolute', left: x, top: y - p * 40, opacity: a, transform: `scale(${0.6 + a * 0.6}) rotate(${p * 90}deg)` }} />;
  });
};

/** 大標：一字一字彈上來（白字＋商品色粗描邊＋深色落影） */
/** v9：標題自動縮字，一行放得下就一行；太長才平均分兩行（不會剩一個字） */
const cw = (ch) => (/[\u0000-\u00ff]/.test(ch) ? 0.62 : /\p{Extended_Pictographic}/u.test(ch) ? 1.25 : 1.0);
export const fitTitle = (text, maxW, maxSize, minSize) => {
  const chars = Array.from(String(text || ''));
  const units = (a) => a.reduce((s, c) => s + cw(c), 0) * 1.06 + a.length * 0.03;
  const one = Math.floor(maxW / Math.max(1, units(chars)));
  if (one >= minSize || chars.length < 6) return { size: Math.min(maxSize, Math.max(one, 40)), lines: [chars] };
  // 兩行：找最平均的斷點，優先在標點、空白後面斷
  let best = null;
  for (let k = 2; k <= chars.length - 2; k++) {
    const a = chars.slice(0, k), b = chars.slice(k);
    const w = Math.max(units(a), units(b));
    const punct = /[，,、。！!？?～~ ｜|]/.test(chars[k - 1]) ? -0.8 : 0;
    const score = w + punct;
    if (!best || score < best.score) best = { score, a, b, w };
  }
  const a = best.a.filter((c, i) => !(i === best.a.length - 1 && /[ ｜|]/.test(c)));
  return { size: Math.min(maxSize, Math.floor(maxW / best.w)), lines: [a, best.b] };
};
const PopTitle = ({ text, t, start = 8, size = 100, maxW = 960, minSize }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fit = fitTitle(text, maxW, size, minSize || Math.round(size * 0.72));
  const sz = fit.size;
  let idx = 0;
  return (
    <div style={{ fontSize: sz, fontWeight: 900, lineHeight: 1.16, letterSpacing: 2, textAlign: 'center' }}>
      {fit.lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {line.map((ch) => {
            const i = idx++;
            const p = spring({ frame: f - start - i * 1.6, fps, config: { damping: 9, stiffness: 180, mass: 0.6 } });
            return <span key={i} style={{ display: 'inline-block', color: '#fff', WebkitTextStroke: `${Math.round(sz / 7)}px ${t.stroke}`, paintOrder: 'stroke fill', textShadow: `0 ${sz / 12}px 0 ${t.shadow}`,
              transform: `translateY(${(1 - p) * 60}px) scale(${0.4 + p * 0.6}) rotate(${(1 - p) * (i % 2 ? 12 : -12)}deg)`, opacity: Math.min(1, p * 1.5), whiteSpace: 'pre' }}>{ch}</span>;
          })}
        </div>
      ))}
    </div>
  );
};
/** 副標緞帶：從左邊刷出來 */
const Ribbon = ({ text, t, start = 24, size = 46 }) => {
  const f = useCurrentFrame();
  const wipe = interpolate(f, [start, start + 14], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ display: 'inline-block', transform: 'rotate(-2deg)', clipPath: `inset(-20px ${100 - wipe}% -20px -20px)` }}>
      <div style={{ background: t.ribbonBg, color: t.ribbonText, fontSize: size, fontWeight: 900, padding: '14px 40px 16px', borderRadius: 14, letterSpacing: 2, boxShadow: `0 10px 0 ${t.shadow}`, outline: `3px dashed ${t.dash}`, outlineOffset: -12 }}>{text}</div>
    </div>
  );
};
/** 價格印章（v8：不露價格）：星星章蓋下來，中間「$ ? ? ?」一個一個跳，下面「LINE 問價」 */
/* v114：價格印章延到第 2.5 秒才蓋下來（30fps × 2.5 = 75），前面先讓商品細節留住人 */
const Stamp = ({ t, start = 75, top = 150, right = 46, size = 230, price = '' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - start, fps, config: { damping: 10, stiffness: 140 } });
  const wob = Math.sin((f - start) / 7) * 3 * Math.min(1, Math.max(0, p));
  const shine = ((f - start) % 60) / 60;
  return (
    <div style={{ position: 'absolute', top, right, width: size, height: size, transform: `scale(${1.8 - p * 0.8}) rotate(${(1 - p) * -180 + 10 + wob}deg)`, opacity: Math.min(1, p * 2) }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 8px 0 ${t.shadow})` }}>
        <defs><clipPath id="stc"><circle cx="50" cy="50" r="50" /></clipPath></defs>
        <path d={Array.from({ length: 24 }).map((_, k) => { const a = (k / 24) * Math.PI * 2, r = k % 2 ? 44 : 50; return (k ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1); }).join(' ') + 'Z'} fill={t.stamp} />
        <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="3 3" />
        <rect x={-40 + shine * 180} y="-10" width="14" height="120" fill="rgba(255,255,255,.35)" transform="rotate(25 50 50)" clipPath="url(#stc)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.stampText, fontWeight: 900 }}>
        {price ? (<>
        <div style={{ fontSize: size * 0.11, letterSpacing: 2 }}>NT$</div>
        <div style={{ fontSize: size * (String(price).length > 4 ? 0.2 : 0.25), lineHeight: 1 }}>{price}</div>
        <div style={{ marginTop: size * 0.02, padding: `${size * 0.012}px ${size * 0.05}px`, borderRadius: 30, background: '#fff', color: t.stamp, fontSize: size * 0.085, letterSpacing: 1 }}>起</div>
        </>) : (<>
        <div style={{ fontSize: size * 0.12, letterSpacing: 3 }}>神秘價</div>
        <div style={{ fontSize: size * 0.27, lineHeight: 1, display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: size * 0.2, marginRight: 2 }}>$</span>
          {[0, 1, 2].map((k) => {
            const b = Math.max(0, Math.sin((f - start - k * 6) / 6));
            return <span key={k} style={{ display: 'inline-block', transform: `translateY(${-b * size * 0.05}px) rotate(${(k - 1) * 8}deg)` }}>?</span>;
          })}
        </div>
        <div style={{ marginTop: size * 0.02, padding: `${size * 0.012}px ${size * 0.05}px`, borderRadius: 30, background: '#fff', color: t.stamp, fontSize: size * 0.085, letterSpacing: 1 }}>LINE 問價</div>
        </>)}
      </div>
    </div>
  );
};
/** 會飄的浮水印：logo＋19號舖子，半透明，在畫面中間慢慢繞（截圖裁不掉） */
const Watermark = () => {
  const f = useCurrentFrame();
  const x = 540 + Math.sin(f / 47) * 300 - 170, y = 640 + Math.sin(f / 31 + 1) * 260;
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.32, transform: `rotate(${-12 + Math.sin(f / 40) * 4}deg)`, pointerEvents: 'none' }}>
      <Img src={staticFile('logo.png')} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' }} />
      <span style={{ fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: 4, WebkitTextStroke: '2px rgba(0,0,0,.35)', paintOrder: 'stroke fill' }}>19號舖子</span>
    </div>
  );
};
const TopBar = ({ tag, t }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - 4, fps, config: { damping: 14 } });
  return (
    <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex', gap: 14, alignItems: 'center', transform: `translateY(${(1 - p) * -80}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 22px 8px 10px', borderRadius: 40, background: 'rgba(255,255,255,.92)' }}>
        <Img src={staticFile('logo.png')} style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
        <span style={{ fontSize: 30, fontWeight: 900, color: '#3B2420', letterSpacing: 2 }}>19號舖子</span>
      </div>
      {tag ? <div style={{ padding: '10px 24px', borderRadius: 40, background: t.tag, color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: 2 }}>{tag}</div> : null}
    </div>
  );
};
/** 文字區（三種版型共用）：hook＝大標＋緞帶＋印章；point＝POINT 標籤＋中標＋緞帶；cta＝留言想買 */
const Words = ({ mode, title, sub, point, t, i, n, bottom = 170, big = 104 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hint = spring({ frame: f - 50, fps, config: { damping: 14 } });
  const b = spring({ frame: f - 4, fps, config: { damping: 11, stiffness: 160 } });
  const long = Array.from(title || '').length;
  return (
    <>
      <div style={{ position: 'absolute', left: 40, right: 40, bottom, textAlign: 'center' }}>
        {mode === 'point' ? (
          <div style={{ display: 'inline-block', marginBottom: 14, padding: '8px 26px', borderRadius: 30, background: t.badge, color: t.badgeText, fontSize: 32, fontWeight: 900, letterSpacing: 4, transform: `scale(${b}) rotate(-4deg)`, boxShadow: `0 6px 0 ${t.shadow}` }}>POINT {point}</div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {mode !== 'point' ? <Sparkle size={56} color={t.badge} style={{ transform: `rotate(${f * 3}deg) scale(${0.85 + Math.sin(f / 5) * 0.15})` }} /> : null}
          <PopTitle text={title} t={t} size={mode === 'point' ? 88 : big} maxW={mode === 'point' ? 960 : 900} minSize={mode === 'point' ? 64 : 76} start={mode === 'point' ? 6 : 8} />
        </div>
        {sub ? <div style={{ marginTop: 24 }}><Ribbon text={sub} t={t} start={mode === 'point' ? 18 : 24} size={sub.length > 16 ? 40 : 46} /></div> : null}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52, textAlign: 'center', opacity: hint, transform: `translateY(${(1 - hint) * 30}px)` }}>
        <span style={{ display: 'inline-block', padding: '12px 34px', borderRadius: 40, background: 'rgba(255,255,255,.95)', color: t.stroke, fontSize: 34, fontWeight: 900 }}>
          {mode === 'cta' ? '📲 截圖到官方 LINE 下單' : mode === 'scene' ? '情境示意（實品以照片為準）' : mode === 'hook' ? <>細節看下去 <span style={{ display: 'inline-block', transform: `translateY(${Math.sin(f / 5) * 6}px)` }}>👀</span></> : `${i + 1} / ${n}`}
        </span>
      </div>
      {null /* v113：拿掉飄浮浮水印，左上角固定 Logo 即可 */}
    </>
  );
};
const len = (mode) => LEN[mode] || 100;
const Shade = () => <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(30,16,14,.8) 0%, rgba(30,16,14,.45) 28%, rgba(30,16,14,0) 48%), linear-gradient(180deg, rgba(30,16,14,.35) 0%, rgba(30,16,14,0) 16%)' }} />;

/* ---------- A：照片滿版 ---------- */
export const SlideA = ({ img, mode = 'hook', title = '', sub = '', stamp = true, tag = '', point = 1, i = 0, n = 1, h1, h2, cut, price = '' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme(h1, h2), L = len(mode);
  const zoom = interpolate(f, [0, L], [1.18, 1.04], { easing: Easing.out(Easing.quad) });
  const panX = interpolate(f, [0, L], [i % 2 ? -30 : 30, 0]);
  const blur = interpolate(f, [0, 8], [10, 0], { extrapolateRight: 'clamp' });
  const flash = interpolate(f, [0, 3, 12], [0.9, 0.6, 0], { extrapolateRight: 'clamp' });
  const sweep = interpolate(f, [20, 60], [-60, 160], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pop = spring({ frame: f - 10, fps, config: { damping: 8, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translateX(${panX}px) scale(${zoom})`, filter: `blur(${mode === 'cta' ? 18 : blur}px)` }}>
        <Img src={src(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      {mode === 'cta' ? <AbsoluteFill style={{ background: t.tint }} /> : null}
      <AbsoluteFill style={{ background: `linear-gradient(115deg, transparent ${sweep - 18}%, rgba(255,255,255,.28) ${sweep}%, transparent ${sweep + 18}%)`, mixBlendMode: 'screen' }} />
      <Shade />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      {mode === 'cta' && cut ? (
        <div style={{ position: 'absolute', left: 240, top: 230, width: 600, height: 700, transform: `scale(${pop}) rotate(${Math.sin(f / 10) * 4}deg) translateY(${Math.sin(f / 12) * 14}px)` }}>
          <Img src={src(cut)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(0 24px 26px rgba(0,0,0,.4))' }} />
        </div>
      ) : null}
      <Sparkles t={t} />
      <TopBar tag={tag} t={t} />
      {stamp && (mode === 'hook' || mode === 'cta') ? <Stamp t={t} price={price} /> : null}
      <Words mode={mode} title={title} sub={sub} point={point} t={t} i={i} n={n} />
    </AbsoluteFill>
  );
};

/* ---------- B：滿版模糊背景＋正方形從「平躺」立起來 ---------- */
export const SlideB = ({ img, mode = 'hook', title = '', sub = '', stamp = true, tag = '', point = 1, i = 0, n = 1, h1, h2, cut, price = '' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme(h1, h2), L = len(mode);
  const up = spring({ frame: f, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
  const rot = interpolate(up, [0, 1], [80, 0]);
  const lift = interpolate(up, [0, 1], [140, 0]);
  const sway = Math.sin(f / 12) * 1.1 * up;
  const zoom = interpolate(f, [0, L], [1.0, 1.07]);
  const S = 800, X = (SW - S) / 2, Y = 150;
  const showImg = mode === 'cta' && cut ? cut : img;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: '#000', overflow: 'hidden' }}>
      {/* 滿版：同一張照片放大模糊當背景 */}
      <AbsoluteFill style={{ transform: `scale(${1.25 + f * 0.0008})`, filter: 'blur(26px) saturate(1.2)' }}>
        <Img src={src(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: t.tint }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, ${t.glow} 0%, rgba(0,0,0,0) 55%)`, opacity: up }} />
      <Sparkles t={t} />
      <div style={{ position: 'absolute', left: SW / 2 - 330, top: Y + S + 18, width: 660, height: 60, borderRadius: '50%', background: '#000', opacity: 0.35 * up, filter: 'blur(26px)' }} />
      <div style={{ position: 'absolute', left: X, top: Y, width: S, height: S, perspective: 1600 }}>
        <div style={{ width: '100%', height: '100%', transformOrigin: '50% 100%', transform: `translateY(${lift}px) rotateX(${rot}deg) rotateZ(${sway}deg)`,
          borderRadius: 40, background: '#fff', padding: 18, boxSizing: 'border-box', boxShadow: `0 30px 60px rgba(0,0,0,.35), 0 0 0 6px ${t.badge}` }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', background: mode === 'cta' ? t.ribbonBg : '#eee' }}>
            <Img src={src(showImg)} style={{ width: '100%', height: '100%', objectFit: mode === 'cta' && cut ? 'contain' : 'cover', transform: `scale(${zoom})` }} />
          </div>
        </div>
      </div>
      <TopBar tag={tag} t={t} />
      {stamp && mode !== 'point' ? <Stamp t={t} top={110} right={30} size={210} price={price} /> : null}
      <Words mode={mode} title={title} sub={sub} point={point} t={t} i={i} n={n} bottom={150} big={92} />
    </AbsoluteFill>
  );
};

/* ---------- C：封面＝人物場景滿版＋人物去背浮出來＋商品去背貼紙飛進她手邊 ---------- */
export const CoverC = ({ scene, person, cut, title = '', sub = '', stamp = true, tag = '', h1, h2, price = '' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme(h1, h2);
  const zoom = interpolate(f, [0, LEN.hook], [1.12, 1.02]);
  const pin = spring({ frame: f - 2, fps, config: { damping: 14, stiffness: 100 } });
  const stk = spring({ frame: f - 14, fps, config: { damping: 7, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, filter: 'blur(18px) brightness(.8) saturate(1.2)' }}>
        <Img src={src(scene)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 45% 40%, ${t.glow} 0%, rgba(0,0,0,0) 60%)` }} />
      <Sparkles t={t} />
      {/* 人物去背（白色貼紙邊） */}
      <div style={{ position: 'absolute', left: -40, top: 170, width: 760, height: 1200, transform: `translateX(${(1 - pin) * -300}px) rotate(${(1 - pin) * -8}deg)`, opacity: pin }}>
        <Img src={src(person)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom',
          filter: 'drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(0 26px 30px rgba(0,0,0,.4))' }} />
      </div>
      {/* 商品貼紙飛進來，在她手邊晃 */}
      <div style={{ position: 'absolute', left: 560, top: 330, width: 470, height: 620, transform: `translate(${(1 - stk) * 500}px, ${(1 - stk) * -300}px) scale(${0.5 + stk * 0.5}) rotate(${(1 - stk) * 40 + Math.sin(f / 9) * 5}deg)`, transformOrigin: '50% 0%' }}>
        <Img src={src(cut)} style={{ width: '100%', height: '100%', objectFit: 'contain',
          filter: 'drop-shadow(8px 0 0 #fff) drop-shadow(-8px 0 0 #fff) drop-shadow(0 8px 0 #fff) drop-shadow(0 -8px 0 #fff) drop-shadow(0 26px 30px rgba(0,0,0,.45))' }} />
        <Sparkle size={70} color={t.badge} style={{ position: 'absolute', top: -10, right: 0, transform: `rotate(${f * 4}deg) scale(${0.8 + Math.sin(f / 4) * 0.2})` }} />
      </div>
      <Shade />
      <TopBar tag={tag} t={t} />
      {stamp ? <Stamp t={t} top={140} right={40} price={price} /> : null}
      <Words mode="hook" title={title} sub={sub} t={t} i={0} n={1} />
    </AbsoluteFill>
  );
};

/* ---------- 連線合輯：每個國家「大圖一頁＋九宮格」 ---------- */
export const LIVE_LEN = { hero: 120, grid: 150 };
const LiveBanner = ({ text, t, start = 6 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - start, fps, config: { damping: 10, stiffness: 140 } });
  const blink = 0.75 + Math.abs(Math.sin(f / 6)) * 0.25;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 34px', borderRadius: 60, background: '#E53935', color: '#fff', fontSize: 52, fontWeight: 900, letterSpacing: 4,
      boxShadow: `0 10px 0 ${t.shadow}`, transform: `scale(${p}) rotate(-3deg)` }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', opacity: blink, display: 'inline-block' }} />{text}
    </div>
  );
};
const Countdown = ({ close, t }) => {
  const f = useCurrentFrame();
  if (!close) return null;
  const wob = Math.sin(f / 5) * 2;
  return (
    <div style={{ display: 'inline-block', padding: '12px 30px', borderRadius: 40, background: 'rgba(255,255,255,.95)', color: '#D32F2F', fontSize: 38, fontWeight: 900, transform: `rotate(${wob}deg)` }}>
      ⏰ 收單倒數｜{close} 截止，錯過要等下一團
    </div>
  );
};
export const LiveHero = ({ img, name = '', country = '', flag = '', city = '', close = '', h1 = 0, h2 = 200 }) => {
  const f = useCurrentFrame();
  const t = theme(h1, h2);
  const zoom = interpolate(f, [0, LIVE_LEN.hero], [1.2, 1.04], { easing: Easing.out(Easing.quad) });
  const flash = interpolate(f, [0, 3, 12], [0.9, 0.6, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}><Img src={src(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></AbsoluteFill>
      <Shade />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      <Sparkles t={t} />
      <TopBar tag={flag + ' ' + country + (city ? '・' + city : '')} t={t} />
      <div style={{ position: 'absolute', left: 40, right: 40, top: 170, textAlign: 'center' }}><LiveBanner text={`${flag} ${country}連線中`} t={t} /></div>
      <div style={{ position: 'absolute', left: 40, right: 40, bottom: 210, textAlign: 'center' }}>
        <PopTitle text={name || '現場好物'} t={t} size={Array.from(name).length > 10 ? 76 : 96} />
        <div style={{ marginTop: 26 }}><Ribbon text="現場連線・買到才算數" t={t} size={44} /></div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 60, textAlign: 'center' }}><Countdown close={close} t={t} /></div>
      {null /* v113：拿掉飄浮浮水印，左上角固定 Logo 即可 */}
    </AbsoluteFill>
  );
};
export const LiveGrid = ({ items = [], country = '', flag = '', page = 1, pages = 1, close = '', start = 1, h1 = 0, h2 = 200 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme(h1, h2);
  const G = 300, gap = 16, X0 = (SW - G * 3 - gap * 2) / 2, Y0 = 285;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: `linear-gradient(160deg, ${t.ribbonBg}, #fff 60%, ${t.ribbonBg})`, overflow: 'hidden' }}>
      <Sparkles t={t} />
      <TopBar tag={`${flag} ${country}連線`} t={t} />
      <div style={{ position: 'absolute', left: 40, right: 40, top: 150, textAlign: 'center' }}>
        <LiveBanner text={`${flag} ${country}連線中${pages > 1 ? `　${page}/${pages}` : ''}`} t={t} />
      </div>
      {items.slice(0, 9).map((it, k) => {
        const p = spring({ frame: f - 10 - k * 5, fps, config: { damping: 11, stiffness: 150 } });
        const x = X0 + (k % 3) * (G + gap), y = Y0 + Math.floor(k / 3) * (G + gap);
        const breathe = 1 + Math.sin((f + k * 9) / 14) * 0.03;
        return (
          <div key={k} style={{ position: 'absolute', left: x, top: y, width: G, height: G, borderRadius: 26, overflow: 'hidden', background: '#fff',
            boxShadow: `0 8px 0 ${t.shadow}, 0 0 0 5px #fff`, transform: `scale(${p}) rotate(${(1 - p) * (k % 2 ? 10 : -10)}deg)`, opacity: Math.min(1, p * 1.4) }}>
            <Img src={src(it.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${breathe})` }} />
            <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 14px', borderRadius: 20, background: t.stamp, color: '#fff', fontSize: 30, fontWeight: 900 }}>#{start + k}</div>
            {it.name ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '22px 10px 8px', background: 'linear-gradient(0deg, rgba(0,0,0,.65), rgba(0,0,0,0))', color: '#fff', fontSize: 26, fontWeight: 900, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div> : null}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 118, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', padding: '12px 34px', borderRadius: 40, background: '#fff', color: t.stroke, fontSize: 34, fontWeight: 900, boxShadow: `0 6px 0 ${t.shadow}` }}>💬 截圖「#編號」私訊官方 LINE 問價</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center' }}><Countdown close={close} t={t} /></div>
      {null /* v113：拿掉飄浮浮水印，左上角固定 Logo 即可 */}
    </AbsoluteFill>
  );
};
