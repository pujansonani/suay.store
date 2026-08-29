import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route('**/*', r => r.request().url().startsWith('http://localhost:3000') ? r.continue() : r.abort());
const p = await ctx.newPage();
await p.goto('http://localhost:3000/clinics/aster-medical-clinic', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: process.env.OUT, fullPage: false });
await b.close();
