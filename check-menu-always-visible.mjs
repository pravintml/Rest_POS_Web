import { chromium } from 'playwright';

const BASE  = 'http://localhost:4200';
const PIN   = '1026';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, slowMo: 120 });
const page    = await browser.newPage();
page.on('pageerror', e => console.error('[pageerror]', e.message));

async function shot(name) { await page.screenshot({ path: `ss_mv_${name}.png` }); }

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });

  const setupVisible = await page.locator('text=Terminal Setup').isVisible({ timeout: 2000 }).catch(() => false);
  if (setupVisible) {
    await page.locator('.p-inputnumber-input').nth(0).fill('1');
    await page.locator('.p-inputnumber-input').nth(1).fill('1');
    await page.locator('button:has-text("Save Terminal Config")').click();
    await sleep(1500);
  }

  const hasPinPad = await page.locator('.num-btn').first().isVisible({ timeout: 4000 }).catch(() => false);
  if (hasPinPad) {
    for (const digit of PIN) {
      await page.locator(`.num-btn:has-text("${digit}")`).first().click();
      await sleep(80);
    }
    await page.locator('button:has-text("SIGN IN")').first().click();
    await sleep(2500);
  }

  const locBtn = page.locator('button').filter({ hasText: /TAKE AWAY|RESTAURANT/i }).first();
  if (await locBtn.isVisible({ timeout: 4000 }).catch(() => false)) { await locBtn.click(); await sleep(2000); }

  const tableBtn = page.locator('.sel-btn').first();
  if (await tableBtn.isVisible({ timeout: 5000 }).catch(() => false)) { await tableBtn.click(); await sleep(2500); }

  const ticketBtn = page.locator('.ticket-btn').first();
  if (await ticketBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await ticketBtn.click(); await sleep(2000); }

  const stewardBtn = page.locator('.steward-btn').first();
  if (await stewardBtn.isVisible({ timeout: 3000 }).catch(() => false)) { await stewardBtn.click(); await sleep(1500); }

  // Open MORE then MENU
  await page.locator('button:has-text("MORE")').first().waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('button:has-text("MORE")').first().click();
  await sleep(600);
  await page.locator('button:has-text("MENU")').first().click();
  await sleep(2000);
  await shot('01_dialog_open');

  // Verify menu is visible
  const menuVis = await page.locator('.mr-menu').isVisible({ timeout: 2000 });
  console.log(`Menu panel visible: ${menuVis}`);

  // Click Bill Wise
  const billWise = page.locator('.mr-menu-btn.supported').first();
  await billWise.click();

  // While loading, check menu is still visible
  await sleep(200);
  const menuDuringLoad = await page.locator('.mr-menu').isVisible();
  console.log(`Menu visible during load: ${menuDuringLoad}`);
  await sleep(3000);
  await shot('02_bill_wise_loaded');

  // Now click a second report WITHOUT clicking Back
  const secondReport = page.locator('.mr-menu-btn.supported').nth(1);
  const secName = await secondReport.innerText();
  console.log(`Clicking second report directly: ${secName.trim()}`);
  await secondReport.click();
  await sleep(3000);
  await shot('03_second_report');

  // Menu should still be visible
  const menuAfterSwitch = await page.locator('.mr-menu').isVisible();
  console.log(`Menu visible after switching report: ${menuAfterSwitch}`);

  const content = await page.locator('.mr-content').innerText().catch(() => '(empty)');
  console.log('Content preview:', content.slice(0, 200).replace(/\n/g, ' | '));

  if (!menuVis || !menuDuringLoad || !menuAfterSwitch) {
    console.error('FAIL: menu was hidden at some point'); process.exit(1);
  }

  await page.locator('.mr-close-btn').click();
  console.log('\nPASS: menu stays visible while switching reports.');

} catch (e) {
  console.error('ERROR:', e.message);
  await shot('error');
  process.exit(1);
} finally {
  await sleep(1500);
  await browser.close();
}
