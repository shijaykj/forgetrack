/**
 * Rasterizes the ForgeTrack mark into every PNG the web app and iOS app need.
 * Run after changing the logo:  npm run icons
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB067"/><stop offset=".55" stop-color="#FF5B1F"/><stop offset="1" stop-color="#C2300A"/></linearGradient>`;
const GLYPH = `<path d="M10 23.5V8.5h13" stroke="#1A0800" stroke-width="3.4" stroke-linecap="square" fill="none"/><path d="M10 15.5h9" stroke="#1A0800" stroke-width="3.4" stroke-linecap="square"/><circle cx="22.5" cy="22" r="2.3" fill="#1A0800"/>`;

/** Full-bleed square (iOS and maskable icons get their corners from the OS). */
const square = (inset = 1) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs>${GRAD}</defs><rect width="32" height="32" fill="url(#g)"/>` +
  `<g transform="translate(16 16) scale(${inset}) translate(-16.5 -16)">${GLYPH}</g></svg>`;
/** Rounded tile, for the splash screen. */
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs>${GRAD}</defs><rect x="1" y="1" width="30" height="30" rx="9" fill="url(#g)"/>${GLYPH}</svg>`;

const png = (svg, size, out, opts = {}) =>
  sharp(Buffer.from(svg), { density: 2400 })
    .resize(size, size)
    .flatten(opts.flatten ? { background: '#08090b' } : false)
    .png()
    .toFile(out);

mkdirSync('public/icons', { recursive: true });
await Promise.all([
  png(square(0.74), 180, 'public/icons/apple-touch-icon.png', { flatten: true }),
  png(square(0.74), 192, 'public/icons/icon-192.png', { flatten: true }),
  png(square(0.74), 512, 'public/icons/icon-512.png', { flatten: true }),
  png(square(0.62), 512, 'public/icons/maskable-512.png', { flatten: true }),
  png(square(0.74), 1024, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', { flatten: true }),
]);

// Splash: brand tile centred on the app background.
const logo = await sharp(Buffer.from(tile), { density: 2400 }).resize(360, 360).png().toBuffer();
const splash = await sharp({ create: { width: 2732, height: 2732, channels: 3, background: '#08090b' } })
  .composite([{ input: logo, gravity: 'centre' }])
  .png()
  .toBuffer();
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  await sharp(splash).toFile(`ios/App/App/Assets.xcassets/Splash.imageset/${f}`);

console.log('icons written');
