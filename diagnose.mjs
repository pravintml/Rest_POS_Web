import { chromium } from 'playwright';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, slowMo: 100 });
const page = await browser.newPage();

try {
  await page.goto('http://localhost:4200', { waitUntil: 'networkidle', timeout: 20000 });
  const hasPinPad = await page.locator('.num-btn').first().isVisible({ timeout: 4000 }).catch(() => false);
  if (hasPinPad) {
    for (const digit of '1026') {
      await page.locator(`.num-btn:has-text("${digit}")`).first().click();
      await sleep(80);
    }
    await page.locator('button:has-text("SIGN IN")').first().click();
    await sleep(2500);
  } else {
    console.log('No PIN pad - already past login');
    await sleep(500);
  }

  // Pick location
  const locBtn = page.locator('button').filter({ hasText: /TAKE AWAY|RESTAURANT/i }).first();
  if (await locBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await locBtn.click(); await sleep(1500);
  }

  // Pick table
  const tableBtn = page.locator('button').filter({ hasText: /TW-MR 1/ }).first();
  if (await tableBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tableBtn.click(); await sleep(2500);
  }

  await page.screenshot({ path: 'ss_diagnose.png' });

  const btns = await page.locator('button:visible').allInnerTexts();
  console.log('Visible buttons:', JSON.stringify(btns.slice(0, 30).map(t => t.trim().replace(/\n/g,' '))));

  const allText = await page.locator('body').innerText();
  console.log('Page text (first 500):', allText.slice(0, 500).replace(/\n/g, ' | '));

} finally {
  await sleep(2000);
  await browser.close();
}
