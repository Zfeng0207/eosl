// Regenerates estate.json by running the prototype's seeded generator in Chrome.
// The generator sorts with a random comparator, so only Chrome reproduces the prototype's numbers.
// Usage: node extract_estate.mjs reference/eosl-app-lead.js estate.json   (needs playwright-core + Google Chrome)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [jsPath, out] = process.argv.slice(2);
const js = fs.readFileSync(jsPath, 'utf8');
const body = js.slice(js.indexOf('const TODAY='), js.indexOf('/* state */')) + ';return {D,H,DB};';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const estate = await (await browser.newPage()).evaluate((b) => new Function(b)(), body);
fs.writeFileSync(out, JSON.stringify(estate));
await browser.close();
