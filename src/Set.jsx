import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Easing } from 'remotion';

// v7：一天的新品輪播（3:4，1080×1440）
//   封面（人物圖＋大標題）→ 商品頁（人物照片＋去背商品，像她拿著／開箱）→ 感謝卡
export const W = 1080, H = 1440;
export const COVER_LEN = 120;   // 4 秒
export const ITEM_LEN = 120;    // 4 秒
export const THANKS_LEN = 100;  // 3.3 秒

const C = { cream: '#FFF8F1', bg: '#FDF1EC', pink: '#F08CA6', pink2: '#FFD3DE', rose: '#E2577C', deep: '#4A3530', soft: '#8A7268', white: '#FFFFFF', gold: '#F6C453', mint: '#BFE8DA', line: '#06C755', sky: '#CFE6FF' };
const FONT = '"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const src = (s) => (!s ? staticFile('logo.png') : /^https?:/.test(s) ? s : staticFile(s));

/* ---------- 可愛小元素（SVG，任何字型都畫得出來） ---------- */
const Heart = ({ size = 40, color = C.pink, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 29" style={style}><path d="M16 28.5 13.7 26.4C5.4 18.9 0 14 0 8.1 0 3.6 3.5 0 8 0c2.5 0 5 1.2 6.6 3.1L16 4.6l1.4-1.5C19 1.2 21.5 0 24 0c4.5 0 8 3.6 8 8.1 0 5.9-5.4 10.8-13.7 18.3z" fill={color} /></svg>
);
const Star = ({ size = 40, color = C.gold, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}><path d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6 5.6 21.1 7 14l-5.3-5 7.2-.9z" fill={color} /></svg>
);
const Sparkle = ({ size = 36, color = C.white, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}><path d="M12 0c.8 6.2 5.8 11.2 12 12-6.2.8-11.2 5.8-12 12-.8-6.2-5.8-11.2-12-12C6.2 11.2 11.2 6.2 12 0z" fill={color} /></svg>
);
const Bow = ({ size = 90, color = C.pink, style }) => (
  <svg width={size} height={size * 0.62} viewBox="0 0 100 62" style={style}>
    <path d="M50 31C38 14 14 2 6 10s4 34 14 38c8 3 22-6 30-17z" fill={color} /><path d="M50 31c12-17 36-29 44-21s-4 34-14 38c-8 3-22-6-30-17z" fill={color} />
    <path d="M44 31c-6 12-12 22-16 30h10l12-24 12 24h10c-4-8-10-18-16-30z" fill={color} opacity=".85" /><circle cx="50" cy="31" r="8" fill={C.rose} />
  </svg>
);
const Cloud = ({ w = 220, color = C.white, style }) => (
  <svg width={w} height={w * 0.5} viewBox="0 0 200 100" style={style}><path d="M40 90a30 30 0 0 1 0-60 40 40 0 0 1 75-12 32 32 0 0 1 55 22 26 26 0 0 1 0 50z" fill={color} /></svg>
);
const Tape = ({ w = 160, color = 'rgba(255,211,222,.85)', rot = -8, style }) => (
  <div style={{ width: w, height: 42, background: `repeating-linear-gradient(90deg, ${color} 0 14px, rgba(255,255,255,.55) 14px 20px)`, transform: `rotate(${rot}deg)`, boxShadow: '0 2px 6px rgba(0,0,0,.08)', ...style }} />
);

/** 固定背景：粉色格紋＋飄動的愛心、星星、雲朵、亮片（每一張都一樣，滑起來是同一套） */
export const CuteBg = ({ seed = 0, tint = C.bg }) => {
  const f = useCurrentFrame();
  const float = (i, amp = 10, sp = 24) => Math.sin((f + i * 17) / sp) * amp;
  const items = [
    { t: 'h', x: 70, y: 210, s: 46, c: C.pink }, { t: 's', x: 930, y: 170, s: 50, c: C.gold }, { t: 'k', x: 980, y: 520, s: 40, c: C.white },
    { t: 'h', x: 960, y: 1180, s: 38, c: C.rose }, { t: 's', x: 60, y: 1250, s: 42, c: C.gold }, { t: 'k', x: 120, y: 760, s: 34, c: C.white },
    { t: 'h', x: 520, y: 1370, s: 30, c: C.pink2 }, { t: 'k', x: 820, y: 90, s: 30, c: C.white }, { t: 's', x: 330, y: 70, s: 28, c: C.mint },
  ];
  return (
    <AbsoluteFill style={{ background: tint }}>
      {/* 格紋 */}
      <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(240,140,166,.10) 0 36px, transparent 36px 72px), repeating-linear-gradient(90deg, rgba(240,140,166,.10) 0 36px, transparent 36px 72px)` }} />
      {/* 點點 */}
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 3px, transparent 4px)', backgroundSize: '72px 72px', backgroundPosition: '36px 36px' }} />
      <Cloud w={260} style={{ position: 'absolute', left: -40 + float(1, 14, 60), top: 40, opacity: 0.9 }} />
      <Cloud w={200} style={{ position: 'absolute', right: -30 + float(2, 12, 55), top: 1290, opacity: 0.85 }} />
      {items.map((it, i) => {
        const st = { position: 'absolute', left: it.x - it.s / 2, top: it.y - it.s / 2 + float(i + seed), transform: `rotate(${float(i, 12, 30)}deg) scale(${1 + Math.sin((f + i * 9) / 14) * 0.08})`, filter: 'drop-shadow(0 3px 4px rgba(226,87,124,.18))' };
        return it.t === 'h' ? <Heart key={i} size={it.s} color={it.c} style={st} /> : it.t === 's' ? <Star key={i} size={it.s} color={it.c} style={st} /> : <Sparkle key={i} size={it.s} color={it.c} style={st} />;
      })}
    </AbsoluteFill>
  );
};

const Brand = ({ style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 24px 10px 14px', borderRadius: 40, background: 'rgba(255,255,255,.92)', boxShadow: '0 6px 16px rgba(74,53,48,.15)', fontFamily: FONT, ...style }}>
    <Img src={staticFile('logo.png')} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
    <span style={{ fontSize: 34, fontWeight: 900, color: C.deep, letterSpacing: 3 }}>19號舖子</span>
  </div>
);

const Pill = ({ children, bg = C.deep, color = C.white, size = 34, style }) => (
  <span style={{ display: 'inline-block', padding: '10px 30px', borderRadius: 40, background: bg, color, fontSize: size, fontWeight: 900, fontFamily: FONT, boxShadow: '0 6px 14px rgba(0,0,0,.12)', ...style }}>{children}</span>
);

/* ---------- 封面：人物圖滿版（慢慢放大）＋標題蹦出來；3 種相似版型 ---------- */
export const Cover = ({ img, title = '🇯🇵 日本連線', title2 = '本日新品', sub = '', variant = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(f, [0, COVER_LEN], [1.0, 1.09]);
  const pop = spring({ frame: f - 6, fps, config: { damping: 9, stiffness: 120 } });
  const pop2 = spring({ frame: f - 16, fps, config: { damping: 10, stiffness: 120 } });
  const sw = spring({ frame: f - 30, fps, config: { damping: 14 } });
  const nudge = Math.sin(f / 5) * 10;
  const tw = (s) => (s.length > 8 ? 74 : 86);
  const titleBox = (
    <div style={{ display: 'inline-block', transform: `scale(${pop}) rotate(${variant === 0 ? -3 : variant === 2 ? 2 : 0}deg)`, transformOrigin: variant === 1 ? '50% 100%' : '0% 50%' }}>
      <div style={{ fontSize: tw(title), fontWeight: 900, color: C.deep, lineHeight: 1.12, letterSpacing: 2, textShadow: '0 4px 0 rgba(255,255,255,.9)' }}>{title}</div>
      <div style={{ marginTop: 10, transform: `scale(${pop2})`, transformOrigin: '0 50%', display: 'inline-block', padding: '6px 26px 12px', borderRadius: 24, background: C.rose, color: C.white, fontSize: 76, fontWeight: 900, letterSpacing: 4, boxShadow: '0 10px 24px rgba(226,87,124,.4)' }}>{title2}</div>
      {sub ? <div style={{ marginTop: 12, fontSize: 32, fontWeight: 800, color: C.soft, opacity: pop2 }}>{sub}</div> : null}
    </div>
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT, background: C.cream, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Img src={src(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      {/* 讓字看得清楚的漸層 */}
      <AbsoluteFill style={{ background: variant === 1 ? 'linear-gradient(0deg, rgba(255,248,241,.95) 0%, rgba(255,248,241,.7) 28%, rgba(255,248,241,0) 50%)' : 'linear-gradient(180deg, rgba(255,248,241,.92) 0%, rgba(255,248,241,.65) 24%, rgba(255,248,241,0) 46%)' }} />
      <Brand style={{ position: 'absolute', top: 36, left: 36 }} />
      <Star size={58} style={{ position: 'absolute', top: 40, right: 60, transform: `rotate(${f * 2}deg)` }} />
      <Heart size={44} style={{ position: 'absolute', top: 120, right: 140, transform: `scale(${1 + Math.sin(f / 6) * 0.12})` }} />
      {variant === 0 ? (
        <div style={{ position: 'absolute', top: 140, left: 44 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.88)', borderRadius: 40, padding: '28px 40px 30px', border: `6px dashed ${C.pink}`, boxShadow: '0 14px 30px rgba(74,53,48,.18)', transform: `scale(${0.9 + pop * 0.1})` }}>{titleBox}</div>
          <Bow size={110} style={{ position: 'absolute', top: -38, left: 20 }} />
        </div>
      ) : variant === 1 ? (
        <div style={{ position: 'absolute', bottom: 150, left: 56, right: 40 }}>{titleBox}<Tape w={180} rot={8} style={{ position: 'absolute', top: -30, right: 60 }} /></div>
      ) : (
        <div style={{ position: 'absolute', top: 140, left: 44 }}>
          <div style={{ display: 'inline-block', textAlign: 'left', background: C.white, borderRadius: 60, padding: '30px 48px 34px', boxShadow: '0 14px 30px rgba(74,53,48,.18)', position: 'relative', transform: `scale(${0.9 + pop * 0.1})` }}>
            {titleBox}
            <div style={{ position: 'absolute', bottom: -34, left: 120, width: 0, height: 0, borderLeft: '26px solid transparent', borderRight: '26px solid transparent', borderTop: `40px solid ${C.white}` }} />
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, textAlign: variant === 1 ? 'right' : 'center', paddingRight: variant === 1 ? 50 : 0, opacity: sw }}>
        <Pill bg={C.pink} style={{ transform: `translateX(${nudge}px)` }}>往右滑看看 👉</Pill>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 商品頁：人物照片（拍立得）＋去背商品浮在她旁邊，像她拿著／開箱 ---------- */
export const Item = ({ person, products = [], names = [], desc = '', tag = '', i = 0, n = 1, side = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame: f, fps, config: { damping: 14, stiffness: 110 } });
  const tIn = spring({ frame: f - 10, fps, config: { damping: 15 } });
  const left = side === 0;
  const k = products.length || 1;
  const pw = k === 1 ? (products[0] && products[0].cut ? 640 : 520) : k === 2 ? 440 : 360;
  const float = (j) => Math.sin((f + j * 20) / 16) * 12;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, overflow: 'hidden' }}>
      <CuteBg seed={i * 3} />
      {/* 人物拍立得 */}
      <div style={{ position: 'absolute', top: 360, [left ? 'left' : 'right']: 40, width: 560, transform: `rotate(${left ? -6 : 6}deg) translateY(${(1 - inP) * 120}px)`, opacity: inP }}>
        <div style={{ background: C.white, padding: '18px 18px 70px', borderRadius: 14, boxShadow: '0 18px 40px rgba(74,53,48,.22)' }}>
          <div style={{ width: '100%', aspectRatio: '3 / 4', overflow: 'hidden', borderRadius: 6 }}>
            <Img src={src(person)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${interpolate(f, [0, ITEM_LEN], [1.02, 1.1])})` }} />
          </div>
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', fontSize: 34, fontWeight: 900, color: C.rose }}>今天幫你買到了 💕</div>
        </div>
        <Tape w={170} rot={left ? -12 : 10} style={{ position: 'absolute', top: -16, left: 190 }} />
      </div>
      {/* 去背商品（有白色貼紙邊），一個一個蹦出來 */}
      <div style={{ position: 'absolute', top: 330, [left ? 'right' : 'left']: k === 1 ? -10 : 10, width: k === 1 ? 700 : 760, height: 900 }}>
        {products.map((p, j) => {
          const pp = spring({ frame: f - 8 - j * 7, fps, config: { damping: 8, stiffness: 120 } });
          const pos = k === 1 ? { left: products[0].cut ? 30 : 150, top: products[0].cut ? 140 : 300 } : k === 2 ? [{ left: 10, top: 40 }, { left: 260, top: 420 }][j] : [{ left: 0, top: 10 }, { left: 360, top: 250 }, { left: 40, top: 520 }][j] || { left: 200, top: 300 };
          return (
            <div key={j} style={{ position: 'absolute', ...pos, width: pw, height: pw, transform: `translateY(${float(j)}px) scale(${pp}) rotate(${(j % 2 ? 6 : -5) * (1 - pp * 0.4)}deg)` }}>
              {p.cut ? (
                <Img src={src(p.src)} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 18px 22px rgba(74,53,48,.28))' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: C.white, padding: 16, borderRadius: 36, boxSizing: 'border-box', boxShadow: '0 18px 36px rgba(74,53,48,.22)' }}>
                  <Img src={src(p.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 24 }} />
                </div>
              )}
              {j === 0 ? <Sparkle size={64} color={C.gold} style={{ position: 'absolute', top: -20, right: 10, transform: `rotate(${f * 3}deg) scale(${0.8 + Math.sin(f / 5) * 0.2})` }} /> : null}
            </div>
          );
        })}
      </div>
      {/* 上方：標籤＋名稱＋一句說明 */}
      <div style={{ position: 'absolute', top: 40, left: 50, right: 50, transform: `translateY(${(1 - tIn) * -40}px)`, opacity: tIn }}>
        {tag ? <Pill bg={/即時/.test(tag) ? C.rose : C.deep} size={32}>{tag}</Pill> : null}
        <div style={{ marginTop: 14, fontSize: names.join('').length > 16 ? 56 : 68, fontWeight: 900, color: C.deep, lineHeight: 1.18, textShadow: '0 3px 0 #fff' }}>{names.slice(0, 3).join('・')}</div>
        {desc ? <div style={{ marginTop: 8, fontSize: 36, fontWeight: 700, color: C.soft, lineHeight: 1.3 }}>{desc}</div> : null}
      </div>
      {/* 下方：留言想買＋第幾頁 */}
      <div style={{ position: 'absolute', bottom: 40, left: 50, right: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: tIn }}>
        <Pill bg={C.white} color={C.rose} size={32}>💬 喜歡就留言「想買」</Pill>
        <div style={{ display: 'flex', gap: 10 }}>{Array.from({ length: Math.min(n, 9) }).map((_, j) => <div key={j} style={{ width: j === i ? 34 : 14, height: 14, borderRadius: 8, background: j === i ? C.rose : 'rgba(226,87,124,.3)' }} />)}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 最後一張：感謝卡 ---------- */
export const Thanks = ({ img }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 12 } });
  const t = spring({ frame: f - 18, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <CuteBg seed={7} />
      <div style={{ position: 'absolute', top: 70, left: 70, right: 70, bottom: 300, transform: `scale(${0.85 + p * 0.15}) rotate(${(1 - p) * -4}deg)`, opacity: p }}>
        <div style={{ width: '100%', height: '100%', background: C.white, borderRadius: 40, padding: 22, boxSizing: 'border-box', boxShadow: '0 20px 44px rgba(74,53,48,.22)' }}>
          <Img src={src(img)} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 26 }} />
        </div>
        <Bow size={140} style={{ position: 'absolute', top: -50, left: '50%', marginLeft: -70 }} />
      </div>
      <div style={{ position: 'absolute', bottom: 90, left: 40, right: 40, textAlign: 'center', transform: `translateY(${(1 - t) * 60}px)`, opacity: t }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: C.deep }}>謝謝你的支持 <Heart size={54} color={C.rose} style={{ verticalAlign: -6 }} /></div>
        <div style={{ marginTop: 18 }}><Pill bg={C.rose} size={44}>留言「想買」拿連結 💌</Pill></div>
      </div>
    </AbsoluteFill>
  );
};
