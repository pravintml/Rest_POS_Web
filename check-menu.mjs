import { chromium } from 'playwright';

const BASE  = 'http://localhost:4200';
const PIN   = '1026';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page    = await browser.newPage();
page.on('pageerror', e => console.error('[pageerror]', e.message));

async function shot(name) { await page.screenshot({ path: `ss_${name}.png` }); }
async function clickText(text, timeout = 6000) {
  await page.locator(`button:has-text("${text}")`).first().click({ timeout });
}

try {
  // ── 1. Load app ───────────────────────────────────────────────────────────
  console.log('1. Loading app…');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await shot('01_start');

  // ── 2. Terminal setup (only if shown) ─────────────────────────────────────
  const setupVisible = await page.locator('text=Terminal Setup').isVisible({ timeout: 2000 }).catch(() => false);
  if (setupVisible) {
    console.log('2a. Terminal setup needed — entering Location 1, Unit 1…');
    // Location ID spinner: first p-inputnumber input
    const locInput = page.locator('.p-inputnumber-input').nth(0);
    await locInput.triple_click?.() ?? await locInput.click({ clickCount: 3 });
    await locInput.fill('1');
    const unitInput = page.locator('.p-inputnumber-input').nth(1);
    await unitInput.click({ clickCount: 3 });
    await unitInput.fill('1');
    await clickText('Save Terminal Config');
    await sleep(1500);
    await shot('02_after_setup');
  }

  // ── 3. PIN login ──────────────────────────────────────────────────────────
  console.log('3. Entering PIN', PIN);
  await page.waitForSelector('.num-btn', { timeout: 8000 });
  for (const digit of PIN) {
    await page.locator(`.num-btn:has-text("${digit}")`).first().click();
    await sleep(80);
  }
  await shot('03_pin_entered');
  await clickText('SIGN IN');
  await sleep(2500);
  await shot('04_after_login');

  // ── 4. Location selection ─────────────────────────────────────────────────
  const locOverlay = await page.locator('.sel-overlay, .location-overlay, [class*="location"]').first()
    .isVisible({ timeout: 3000 }).catch(() => false);
  console.log('4. Location overlay visible:', locOverlay);
  await shot('05_location');

  // Click any visible location button
  const anyLocBtn = page.locator('button').filter({ hasText: /RESTAURANT|TAKE AWAY|FAMILY|VIP|ROOMS/i }).first();
  if (await anyLocBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    const locName = await anyLocBtn.innerText();
    console.log(`   Selecting location: ${locName.trim()}`);
    await anyLocBtn.click();
    await sleep(1500);
  }
  await shot('06_after_location');

  // ── 5. Table selection ────────────────────────────────────────────────────
  const anyTableBtn = page.locator('button[class*="table"], .table-btn, button').filter({ hasText: /^T|TW-|TABLE/i }).first();
  if (await anyTableBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    const tName = await anyTableBtn.innerText();
    console.log(`5. Selecting table: ${tName.trim()}`);
    await anyTableBtn.click();
    await sleep(2000);
  }
  await shot('07_after_table');

  // ── 6. Steward (if shown) ─────────────────────────────────────────────────
  const stewardBtn = page.locator('button').filter({ hasText: /^[A-Z][A-Z\s]+$/ }).first();
  const stewardVisible = await stewardBtn.isVisible({ timeout: 2000 }).catch(() => false);
  if (stewardVisible && await page.locator('text=/steward/i').isVisible({ timeout: 500 }).catch(() => false)) {
    const sName = await stewardBtn.innerText();
    console.log(`6. Selecting steward: ${sName.trim()}`);
    await stewardBtn.click();
    await sleep(1000);
  }
  await shot('08_pos');

  // ── 7. Click MORE ─────────────────────────────────────────────────────────
  console.log('7. Opening MORE panel…');
  const moreBtn = page.locator('button:has-text("MORE")').first();
  await moreBtn.waitFor({ state: 'visible', timeout: 5000 });
  await moreBtn.click();
  await sleep(800);
  await shot('09_more_panel');

  // ── 8. Check MENU button ──────────────────────────────────────────────────
  const menuBtn    = page.locator('button:has-text("MENU")').first();
  const menuVis    = await menuBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const menuEna    = menuVis ? await menuBtn.isEnabled() : false;
  const menuIsDim  = menuVis ? await menuBtn.evaluate(el => el.classList.contains('dim')) : true;
  console.log(`8. MENU button — visible: ${menuVis}, enabled: ${menuEna}, .dim: ${menuIsDim}`);

  if (!menuVis)   { console.error('FAIL: MENU button not visible'); process.exit(1); }
  if (!menuEna)   { console.error('FAIL: MENU button is disabled'); process.exit(1); }
  if (menuIsDim)  { console.error('FAIL: MENU button still has .dim class'); process.exit(1); }

  // ── 9. Click MENU ─────────────────────────────────────────────────────────
  console.log('9. Clicking MENU…');
  await menuBtn.click();
  await sleep(2500);
  await shot('10_menu_dialog');

  const dialog = page.locator('.mr-overlay');
  const dialogVis = await dialog.isVisible({ timeout: 4000 }).catch(() => false);
  console.log(`   Report dialog visible: ${dialogVis}`);
  if (!dialogVis) { console.error('FAIL: Report dialog did not open'); process.exit(1); }

  // ── 10. Read menu items & click a report ─────────────────────────────────
  const menuItems = await page.locator('.mr-menu-btn').allInnerTexts();
  console.log('   Report menu items:', menuItems.map(t => t.trim().replace(/\n/g, ' ')));

  const firstSupported = page.locator('.mr-menu-btn.supported').first();
  if (await firstSupported.isVisible({ timeout: 2000 }).catch(() => false)) {
    const rptName = await firstSupported.innerText();
    console.log(`10. Clicking report: ${rptName.trim()}`);
    await firstSupported.click();
    await sleep(3000);
    await shot('11_report_content');

    const content = await page.locator('.mr-content').innerText().catch(() => '(empty)');
    console.log('    Content preview:', content.slice(0, 300).replace(/\n/g, ' | '));
  }

  // ── 11. Close dialog ──────────────────────────────────────────────────────
  await page.locator('.mr-close-btn').click();
  await sleep(600);
  await shot('12_closed');
  console.log('\nPASS: MENU dialog opened, loaded reports, and closed successfully.');

} catch (e) {
  console.error('ERROR:', e.message);
  await shot('error');
  process.exit(1);
} finally {
  await sleep(2000);
  await browser.close();
}
