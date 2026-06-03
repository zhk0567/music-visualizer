import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const index = join(process.cwd(), 'dist', 'index.html');
const fallback = join(process.cwd(), 'dist', '404.html');

if (existsSync(index)) {
  copyFileSync(index, fallback);
  console.log('Wrote dist/404.html for GitHub Pages SPA fallback');
}
