import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
async function look(email, path) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  const p = await ctx.newPage();
  const loginPath = email.includes('admin') ? '/admin/login' : '/clinic/login';
  await p.goto(BASE + loginPath, { waitUntil: 'networkidle' });
  await p.fill('input[name=email]', email);
  await p.fill('input[name=password]', 'Demo1234');
  await p.click('button[type=submit]');
  const dl = Date.now()+25000; while (Date.now()<dl && p.url().includes('login')) await p.waitForTimeout(200);
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const out = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > vw + 1) {
        const style = getComputedStyle(el);
        bad.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className).slice(0, 90)) || '',
          right: Math.round(r.right), width: Math.round(r.width),
          overflowX: style.overflowX,
          parentCls: (el.parentElement?.className && String(el.parentElement.className).slice(0,70)) || '',
        });
      }
    }
    return { vw, bad: bad.slice(0, 6), total: bad.length };
  });
  console.log(`\n### ${path}  (viewport ${out.vw}px, ${out.total} overflowing elements)`);
  for (const e of out.bad) console.log(`  <${e.tag}> right=${e.right} w=${e.width} overflowX=${e.overflowX}\n     class: ${e.cls}\n     parent: ${e.parentCls}`);
  await ctx.close();
}
await look('clinic@demo.suay.store', '/clinic/bookings');
await look('admin@demo.suay.store', '/admin');
await look('admin@demo.suay.store', '/admin/users');
await b.close();
