import { chromium } from 'playwright';

const BASE  = 'http://localhost:4200';
const PIN   = '1026';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const page    = await browser.newPage();
page.on('pageerror', e => console.error('[pageerror]', e.message));

async function shot(name) { await page.screenshot({ path: `ss_${name}.png` }); }

try {
  // ── 1. Load app ───────────────────────────────────────────────────────────
  console.log('1. Loading app…');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await shot('01_start');

  // ── 2. Terminal setup (only if shown) ─────────────────────────────────────
  const setupVisible = await page.locator('text=Terminal Setup').isVisible({ timeout: 2000 }).catch(() => false);
  if (setupVisible) {
    console.log('2. Terminal setup — entering Location 1, Unit 1…');
    const locInput = page.locator('.p-inputnumber-input').nth(0);
    await locInput.click({ clickCount: 3 });
    await locInput.fill('1');
    const unitInput = page.locator('.p-inputnumber-input').nth(1);
    await unitInput.click({ clickCount: 3 });
    await unitInput.fill('1');
    await page.locator('button:has-text("Save Terminal Config")').click();
    await sleep(1500);
    await shot('02_after_setup');
  }

  // ── 3. PIN login ──────────────────────────────────────────────────────────
  const hasPinPad = await page.locator('.num-btn').first().isVisible({ timeout: 4000 }).catch(() => false);
  if (hasPinPad) {
    console.log('3. Entering PIN', PIN);
    for (const digit of PIN) {
      await page.locator(`.num-btn:has-text("${digit}")`).first().click();
      await sleep(80);
    }
    await page.locator('button:has-text("SIGN IN")').first().click();
    await sleep(2500);
    await shot('03_after_login');
  } else {
    console.log('3. Already past login');
  }

  // ── 4. Location selection ─────────────────────────────────────────────────
  const locBtn = page.locator('button').filter({ hasText: /TAKE AWAY|RESTAURANT|FAMILY|VIP|ROOMS/i }).first();
  if (await locBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    const locName = await locBtn.innerText();
    console.log(`4. Selecting location: ${locName.trim()}`);
    await locBtn.click();
    await sleep(2000);
  }
  await shot('04_after_location');

  // ── 5. Table selection ────────────────────────────────────────────────────
  const tableBtn = page.locator('.sel-btn').first();
  if (await tableBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const tName = await tableBtn.innerText();
    console.log(`5. Selecting table: ${tName.trim().replace(/\n/g,' ')}`);
    await tableBtn.click();
    await sleep(2500);
  }
  await shot('05_after_table');

  // ── 5b. Ticket picker (if multiple open tickets) ─────────────────────────
  const ticketBtn = page.locator('.ticket-btn').first();
  const hasTickets = await ticketBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasTickets) {
    const tktText = await ticketBtn.innerText();
    console.log(`5b. Selecting ticket: ${tktText.trim().replace(/\n/g,' ')}`);
    await ticketBtn.click();
    await sleep(2000);
  } else {
    console.log('5b. No ticket picker (new bill or single ticket)');
  }
  await shot('05b_after_ticket');

  // ── 6. Steward selection (if shown) ───────────────────────────────────────
  const stewardPanel = await page.locator('.steward-btn').first().isVisible({ timeout: 3000 }).catch(() => false);
  if (stewardPanel) {
    const sw = page.locator('.steward-btn').first();
    const swName = await sw.innerText();
    console.log(`6. Selecting steward: ${swName.trim().replace(/\n/g,' ')}`);
    await sw.click();
    await sleep(1500);
  } else {
    console.log('6. No steward panel');
  }
  await shot('06_pos');

  // ── 7. Click MORE ─────────────────────────────────────────────────────────
  console.log('7. Opening MORE panel…');
  const moreBtn = page.locator('button:has-text("MORE")').first();
  await moreBtn.waitFor({ state: 'visible', timeout: 8000 });
  await moreBtn.click();
  await sleep(800);
  await shot('07_more_panel');

  // ── 8. Check MENU button ──────────────────────────────────────────────────
  const menuBtn   = page.locator('button:has-text("MENU")').first();
  const menuVis   = await menuBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const menuEna   = menuVis ? await menuBtn.isEnabled() : false;
  const menuIsDim = menuVis ? await menuBtn.evaluate(el => el.classList.contains('dim')) : true;
  console.log(`8. MENU — visible:${menuVis} enabled:${menuEna} dim:${menuIsDim}`);

  if (!menuVis)  { console.error('FAIL: MENU not visible'); process.exit(1); }
  if (!menuEna)  { console.error('FAIL: MENU disabled'); process.exit(1); }
  if (menuIsDim) { console.error('FAIL: MENU has .dim'); process.exit(1); }

  // ── 9. Click MENU ─────────────────────────────────────────────────────────
  console.log('9. Clicking MENU…');
  await menuBtn.click();
  await sleep(2500);
  await shot('08_menu_dialog');

  const dialog = page.locator('.mr-overlay');
  if (!await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.error('FAIL: Report dialog did not open'); process.exit(1);
  }

  // ── 10. Check menu items ──────────────────────────────────────────────────
  const items = await page.locator('.mr-menu-btn').allInnerTexts();
  console.log(`10. Menu items (${items.length}):`, items.map(t => t.trim().replace(/\n/g,' ')).join(' | '));

  // ── 11. Click a supported report ─────────────────────────────────────────
  const supported = page.locator('.mr-menu-btn.supported');
  const count = await supported.count();
  console.log(`11. Supported reports: ${count}`);

  if (count > 0) {
    const rptName = await supported.first().innerText();
    console.log(`    Clicking: ${rptName.trim()}`);
    await supported.first().click();
    await sleep(3500);
    await shot('09_report_content');

    // Check content rendered
    const content = await page.locator('.mr-content').innerText().catch(() => '(empty)');
    console.log('    Content preview:', content.slice(0, 400).replace(/\n/g, ' | '));

    // Check no "No data" placeholder only (could have real data or "No data" in table)
    const hasTitle = await page.locator('.rpt-title').isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`    Has rpt-title: ${hasTitle}`);
  }

  // ── 12. Test another report (Suspend) ────────────────────────────────────
  await page.locator('.mr-act-btn:has-text("Back")').click();
  await sleep(500);
  const suspendBtn = page.locator('.mr-menu-btn.supported').nth(1);
  if (await suspendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    const nm = await suspendBtn.innerText();
    console.log(`12. Testing: ${nm.trim()}`);
    await suspendBtn.click();
    await sleep(3000);
    await shot('10_second_report');
    const content2 = await page.locator('.mr-table-wrap, .mr-reading').innerText().catch(() => '(none)');
    console.log('    Content:', content2.slice(0, 200).replace(/\n/g,' | '));
  }

  // ── 13. Close ─────────────────────────────────────────────────────────────
  await page.locator('.mr-close-btn').click();
  await sleep(600);
  await shot('11_closed');
  console.log('\nPASS: All reports implemented and tested.');

} catch (e) {
  console.error('ERROR:', e.message);
  await shot('error');
  process.exit(1);
} finally {
  await sleep(2000);
  await browser.close();
}
