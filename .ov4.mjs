import { chromium } from 'playwright';
const BASE='http://localhost:3000';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:844} });
await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
const p = await ctx.newPage();
await p.goto(BASE+'/clinic/login',{waitUntil:'networkidle'});
await p.fill('input[name=email]','clinic@demo.suay.store'); await p.fill('input[name=password]','Demo1234');
await p.click('button[type=submit]');
const dl=Date.now()+25000; while(Date.now()<dl && p.url().includes('login')) await p.waitForTimeout(200);
await p.goto(BASE+'/clinic/dashboard',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1) continue;
    // Leaf-most offenders: no overflowing element children
    const childOverflows = [...el.children].some(c => c.getBoundingClientRect().right > vw + 1);
    if (childOverflows) continue;
    out.push(`<${el.tagName.toLowerCase()}> w=${Math.round(r.width)} right=${Math.round(r.right)} text="${(el.textContent||'').trim().slice(0,45)}" :: ${String(el.className).slice(0,80)}`);
  }
  return out.slice(0, 8).join('\n');
}));
await b.close();
