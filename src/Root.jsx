import React from 'react';
import { Composition } from 'remotion';
import { Promo, SLIDE, INTRO, OUTRO } from './Promo';
import { Clip, CLIP } from './Clip';
import { Cover, Item, Thanks, W, H, COVER_LEN, ITEM_LEN, THANKS_LEN } from './Set';

const demo = {
  shop: '19號舖子', sub: '日・韓・泰・港 連線代購', line: '@131zlfyx',
  slides: [{ img: 'logo.png', title: '日本連線好物', price: '$350', tag: '連線' }, { img: 'logo.png', title: '韓國人氣小物', price: '$780', tag: '預購', note: '第2件起 $750' }],
};

export const Root = () => (
  <>
    {/* v7：一天的新品輪播（3:4） */}
    <Composition id="Cover" component={Cover} width={W} height={H} fps={30} durationInFrames={COVER_LEN} defaultProps={{ img: 'logo.png', title: '🇯🇵 日本連線', title2: '本日新品', sub: '美妝・零食・生活小物', variant: 0 }} />
    <Composition id="Item" component={Item} width={W} height={H} fps={30} durationInFrames={ITEM_LEN} defaultProps={{ person: 'logo.png', products: [{ src: 'logo.png', cut: false }], names: ['示範商品'], desc: '超可愛的小物', tag: '🇯🇵 日本連線', i: 0, n: 3 }} />
    <Composition id="Thanks" component={Thanks} width={W} height={H} fps={30} durationInFrames={THANKS_LEN} defaultProps={{ img: 'logo.png' }} />
    {/* 舊的（保留） */}
    <Composition id="Clip" component={Clip} width={1080} height={1350} fps={30} durationInFrames={CLIP} defaultProps={{ s: demo.slides[0], i: 0, n: 3, line: demo.line }} />
    <Composition id="Promo" component={Promo} width={1080} height={1920} fps={30}
      durationInFrames={INTRO + SLIDE * demo.slides.length + OUTRO} defaultProps={demo}
      calculateMetadata={({ props }) => ({ durationInFrames: INTRO + SLIDE * Math.max(1, (props.slides || []).length) + OUTRO })} />
  </>
);
