import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const cssPath = 'public/style.css';
const css = readFileSync(cssPath, 'utf8');

// Dark evergreen is the agreed design. Only a deliberate redesign should bypass this.
if (!process.env.GIFTMAS_ALLOW_THEME_CHANGE) {
  if (!css.includes('linear-gradient(135deg, #061a14') || css.includes('--bg-cream')) {
    console.error('Theme guard failed: public/style.css must keep the dark evergreen gradient and no --bg-cream. Set GIFTMAS_ALLOW_THEME_CHANGE=1 only for an intentional redesign.');
    process.exit(1);
  }
}

// ponytail: hash-based cache-bust keeps old CSS/JS from surviving an edit; no manual version bumps.
const token = (p) => createHash('sha1').update(readFileSync(p)).digest('hex').slice(0, 8);
const cssToken = token(cssPath);
const jsToken = token('public/app.js');
for (const [file, rules] of [
  ['src/layouts/Layout.astro', [[/\/style\.css\?v=[0-9a-f]+/g, `/style.css?v=${cssToken}`]]],
  ['src/pages/gifts-for-girlfriend.astro', [[/\/app\.js\?v=[0-9a-f]+/g, `/app.js?v=${jsToken}`]]],
  ['src/pages/secret-santa.astro', [[/\/app\.js\?v=[0-9a-f]+/g, `/app.js?v=${jsToken}`]]],
]) {
  const old = readFileSync(file, 'utf8');
  const next = rules.reduce((s, [re, value]) => s.replace(re, value), old);
  if (next !== old) writeFileSync(file, next);
}
