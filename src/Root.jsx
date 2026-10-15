import React from 'react';
import { Composition } from 'remotion';
import { Promo, SLIDE, INTRO, OUTRO } from './Promo';
import { Clip, CLIP } from './Clip';

const demo = {
  shop: '19號舖子',
  sub: '日・韓・泰・港 連線代購',
  line: '@131zlfyx',
  slides: [
    { img: 'logo.png', title: '日本連線好物', price: '$350', tag: '連線' },
    { img: 'logo.png', title: '韓國人氣小物', price: '$780', tag: '預購', note: '第2件起 $750' },
  ],
};

export const Root = () => (
  <>
    {/* IG 輪播：一張照片一支 3 秒影片 */}
    <Composition id="Clip" component={Clip} width={1080} height={1350} fps={30} durationInFrames={CLIP}
      defaultProps={{ s: demo.slides[0], i: 0, n: 3, line: demo.line }} />
    {/* 舊的一整支直式影片（保留，Reels 用） */}
    <Composition id="Promo" component={Promo} width={1080} height={1920} fps={30}
      durationInFrames={INTRO + SLIDE * demo.slides.length + OUTRO} defaultProps={demo}
      calculateMetadata={({ props }) => ({ durationInFrames: INTRO + SLIDE * Math.max(1, (props.slides || []).length) + OUTRO })} />
  </>
);
