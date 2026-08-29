import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
async function look(email, path) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  const p = await ctx.newPage();
  await p.goto(BASE + (email.includes('admin') ? '/admin/login' : '/clinic/login'), { waitUntil: 'networkidle' });
  await p.fill('input[name=email]', email); await p.fill('input[name=password]', 'Demo1234');
  await p.click('button[type=submit]');
  const dl = Date.now()+25000; while (Date.now()<dl && p.url().includes('login')) await p.waitForTimeout(200);
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    window.scrollTo(5000, 0);
    const scrolled = window.scrollX;
    window.scrollTo(0, 0);
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      actuallyScrolledX: scrolled,
    };
  });
  console.log(`${path}\n  doc.scrollWidth=${r.docScrollWidth} body.scrollWidth=${r.bodyScrollWidth} client=${r.clientWidth}  ACTUAL horizontal scroll = ${r.actuallyScrolledX}px`);
  await ctx.close();
}
await look('clinic@demo.suay.store', '/clinic/bookings');
await look('admin@demo.suay.store', '/admin');
await look('admin@demo.suay.store', '/admin/users');
await b.close();
