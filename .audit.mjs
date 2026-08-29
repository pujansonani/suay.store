import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const SHOT = process.env.SHOT_DIR;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function ctxFor(email, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  // Keep the audit offline and fast: only same-origin requests are served.
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('data:')) return route.continue();
    return route.abort();
  });
  const page = await ctx.newPage();
  if (email) {
    const path = email.includes('admin') ? '/admin/login' : email.includes('clinic') ? '/clinic/login' : '/login';
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.fill('input[name=email]', email);
    await page.fill('input[name=password]', 'Demo1234');
    await page.click('button[type=submit]');
    const dl = Date.now() + 25000;
    while (Date.now() < dl && page.url().includes('login')) await page.waitForTimeout(200);
    await page.waitForLoadState('networkidle');
  }
  return { ctx, page };
}

const problems = [];
async function audit(page, path, label) {
  const errors = [];
  const onErr = e => errors.push('pageerror: ' + String(e).slice(0,160));
  const onMsg = m => { if (m.type()==='error' && !m.text().includes('Failed to load resource')) errors.push(m.text().slice(0,160)); };
  page.on('pageerror', onErr); page.on('console', onMsg);

  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const status = res?.status() ?? 0;
  // body.scrollWidth, not documentElement.scrollWidth: the latter reports the
  // unclipped extent of descendants that legitimately scroll inside their own
  // container (wide tables), which is a false positive.
  const overflow = await page.evaluate(() =>
    document.body.scrollWidth - document.documentElement.clientWidth);
  const a11y = await page.evaluate(() => {
    const noAlt = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
    const unlabelled = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')]
      .filter(el => {
        if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
        if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
        return !el.closest('label');
      }).map(el => el.tagName + (el.name ? `[name=${el.name}]` : '') + (el.type ? `[type=${el.type}]` : ''));
    return { noAlt, unlabelled, h1: document.querySelectorAll('h1').length };
  });

  page.off('pageerror', onErr); page.off('console', onMsg);

  const issues = [];
  if (status >= 400) issues.push(`HTTP ${status}`);
  if (overflow > 1) issues.push(`h-overflow ${overflow}px`);
  if (a11y.noAlt > 0) issues.push(`${a11y.noAlt} img without alt`);
  if (a11y.unlabelled.length > 0) issues.push(`unlabelled: ${a11y.unlabelled.join(',')}`);
  if (a11y.h1 !== 1) issues.push(`${a11y.h1} h1`);
  if (errors.length) issues.push(`console: ${errors[0]}`);

  const width = page.viewportSize().width;
  console.log(`${issues.length ? 'ISSUE' : '  ok '} ${String(width).padEnd(5)} ${label.padEnd(24)} ${issues.join('; ')}`);
  if (issues.length) problems.push({ label, width, issues });
  if (SHOT && width === 1440) await page.screenshot({ path: `${SHOT}/a-${label.replace(/\W+/g,'-')}.png`, fullPage: true });
}

const PUBLIC = [
  ['/', 'home'], ['/clinics', 'clinics'], ['/clinics/aster-medical-clinic', 'clinic profile'],
  ['/treatments', 'treatments'], ['/how-it-works', 'how it works'], ['/for-clinics', 'for clinics'],
  ['/login', 'login'], ['/register', 'register'], ['/clinic/login', 'clinic login'],
  ['/clinic/register', 'clinic register'], ['/admin/login', 'admin login'], ['/forbidden', 'forbidden'],
];
const CUSTOMER = [['/account/appointments', 'my appointments'], ['/account/profile', 'my profile']];
const CLINIC = [
  ['/clinic/dashboard','clinic dashboard'], ['/clinic/bookings','clinic bookings'],
  ['/clinic/calendar','clinic calendar'], ['/clinic/treatments','clinic treatments'],
  ['/clinic/practitioners','clinic practitioners'], ['/clinic/resources','clinic resources'],
  ['/clinic/customers','clinic customers'], ['/clinic/payments','clinic payments'],
  ['/clinic/reviews','clinic reviews'], ['/clinic/settings','clinic hours'],
  ['/clinic/profile','clinic profile'],
];
const ADMIN = [
  ['/admin','admin overview'], ['/admin/clinics','admin clinics'], ['/admin/verification','admin verification'],
  ['/admin/users','admin users'], ['/admin/bookings','admin bookings'], ['/admin/payments','admin payments'],
  ['/admin/services','admin services'], ['/admin/reviews','admin reviews'],
  ['/admin/notifications','admin notifications'], ['/admin/audit','admin audit'], ['/admin/settings','admin settings'],
];

for (const width of [390]) {
  console.log(`\n===== ${width === 390 ? 'MOBILE 390px' : 'DESKTOP 1440px'} =====`);
  { const { ctx, page } = await ctxFor(null, width);
    for (const [p, l] of PUBLIC) await audit(page, p, l); await ctx.close(); }
  { const { ctx, page } = await ctxFor('customer@demo.suay.store', width);
    for (const [p, l] of CUSTOMER) await audit(page, p, l); await ctx.close(); }
  { const { ctx, page } = await ctxFor('clinic@demo.suay.store', width);
    for (const [p, l] of CLINIC) await audit(page, p, l); await ctx.close(); }
  { const { ctx, page } = await ctxFor('admin@demo.suay.store', width);
    for (const [p, l] of ADMIN) await audit(page, p, l); await ctx.close(); }
}

await browser.close();
console.log(`\n${problems.length} page/width combinations with issues`);
