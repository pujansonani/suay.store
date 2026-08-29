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
    const sw = document.documentElement.scrollWidth;
    const vw = document.documentElement.clientWidth;
    // The chain of ancestors of the element that reaches furthest right.
    // Ignore anything already inside a horizontal scroll container: that
    // content is meant to scroll and does not push the page wide.
    const escapes = (el) => {
      let cur = el.parentElement;
      while (cur && cur !== document.documentElement) {
        const ox = getComputedStyle(cur).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return false;
        cur = cur.parentElement;
      }
      return true;
    };
    let widest = null;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || !escapes(el)) continue;
      if (!widest || r.right > widest.right) widest = { el, right: r.right, width: r.width };
    }
    if (!widest) return { sw, vw, chain: ['(nothing escapes a scroll container)'] };
    const chain = [];
    let cur = widest.el;
    while (cur && cur !== document.body) {
      const s = getComputedStyle(cur);
      const r = cur.getBoundingClientRect();
      chain.push(`<${cur.tagName.toLowerCase()}> w=${Math.round(r.width)} right=${Math.round(r.right)} ovx=${s.overflowX} minW=${s.minWidth} :: ${String(cur.className).slice(0,70)}`);
      cur = cur.parentElement;
    }
    return { sw, vw, chain: chain.reverse() };
  });
  console.log(`\n### ${path}  scrollWidth=${out.sw} clientWidth=${out.vw}  (overflow ${out.sw-out.vw}px)`);
  out.chain.forEach((l,i) => console.log('  '.repeat(1) + ' '.repeat(i) + l));
  await ctx.close();
}
await look('clinic@demo.suay.store', '/clinic/bookings');
await look('admin@demo.suay.store', '/admin');
await b.close();
