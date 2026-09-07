// Run with: node scripts/generate-share-image.mjs
// Local fonts make regeneration independent of external services.
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og.js';
import { readFile, writeFile } from 'node:fs/promises';

const font = await readFile(new URL('../assets/share/RethinkSans.ttf', import.meta.url));
const box = (style, ...children) => h('div', { style: { display: 'flex', ...style } }, ...children);
const ink = '#111111';
const image = new ImageResponse(
  box({ width: '100%', height: '100%', background: '#fafafa', color: ink, fontFamily: 'Rethink', padding: '44px 52px', flexDirection: 'column' },
    box({ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #999', paddingBottom: 20 },
      box({ fontSize: 30, fontWeight: 800, letterSpacing: -1 }, 'Animaxxing'),
      box({ fontSize: 16, letterSpacing: 3 }, 'ANIMATE EVERYTHING'),
    ),
    box({ flexDirection: 'column', marginTop: 35, fontSize: 132, fontWeight: 800, letterSpacing: -4, lineHeight: 0.98 },
      box({}, 'Motion to'),
      box({ alignItems: 'center' }, 'the Max',
        box({ marginLeft: 40, position: 'relative', width: 250, height: 130 },
          ...[0, 1, 2].map((i) => box({ position: 'absolute', left: i * 63, top: 7 - i * 9, fontSize: 126, transform: `rotate(${i * -9}deg)`, color: ['#111111', '#777777', '#cccccc'][i] }, '×')),
        ),
      ),
    ),
    box({ marginTop: 'auto', borderTop: '1px solid #999', paddingTop: 22, justifyContent: 'space-between', alignItems: 'center' },
      box({ fontSize: 23 }, 'Make your website move.'),
      box({ fontSize: 20 }, 'animaxxing.com'),
    ),
  ),
  { width: 1200, height: 630, fonts: [{ name: 'Rethink', data: font, weight: 800, style: 'normal' }] },
);
await writeFile(new URL('../app/opengraph-image.png', import.meta.url), Buffer.from(await image.arrayBuffer()));
