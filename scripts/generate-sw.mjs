import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const htmlPath = resolve(root, 'dist/client/index.html');
const sourcePath = resolve(root, 'public/sw.js');
const outputPath = resolve(root, 'dist/client/sw.js');
const html = await readFile(htmlPath, 'utf8');
if (!html.includes('/assets/')) throw new Error('Built application assets were not found in index.html.');
const assetFiles = await readdir(resolve(root, 'dist/client/assets'));
const assets = assetFiles.filter((name) => /\.(?:js|css|woff2?|png|svg|webp)$/i.test(name))
  .map((name) => `/assets/${name}`);
if (!assets.some((asset) => asset.endsWith('.js'))) throw new Error('No compiled app JavaScript assets were found.');
const precache = [...new Set([
  '/', '/manifest.webmanifest', '/aifews-icon.svg',
  '/icons/aifews-192.png', '/icons/aifews-512.png', ...assets,
])];
const source = await readFile(sourcePath, 'utf8');
const marker = '/*__AIFEWS_PRECACHE__*/[]';
if (!source.includes(marker)) throw new Error('Expected service-worker precache marker was not found.');
await writeFile(outputPath, source.replace(marker, JSON.stringify(precache)), 'utf8');
console.info(`Prepared offline shell and ${assets.length} versioned app assets.`);
