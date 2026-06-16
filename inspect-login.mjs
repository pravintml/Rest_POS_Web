import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'ss_login.png' });
const inputs = await page.locator('input, button').evaluateAll(els =>
  els.map(e => `${e.tagName} type="${e.type}" id="${e.id}" name="${e.name}" placeholder="${e.placeholder}" class="${e.className.slice(0,60)}"`)
);
console.log('Form elements:\n' + inputs.join('\n'));
await browser.close();
