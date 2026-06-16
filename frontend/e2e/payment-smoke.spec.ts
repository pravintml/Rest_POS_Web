import { test, expect } from 'playwright/test';

// PIN for cashier KUSAL
const CASHIER_PIN = '1026';

test('payment flow: login → table → add item → CASH payment → receipt → back to tables', async ({ page }) => {

  // Pre-seed terminal config so we skip the setup screen
  await page.addInitScript(() => {
    localStorage.setItem('rp_terminal', JSON.stringify({ locationId: 1, unitNo: 1 }));
  });

  await page.goto('/');

  // ── 1. Login via PIN numpad ─────────────────────────────────────────────
  await page.waitForSelector('.num-btn', { timeout: 10_000 });

  for (const digit of CASHIER_PIN.split('')) {
    // The zero button has class 'num-btn zero'; others are just 'num-btn'
    await page.locator('button.num-btn').filter({ hasText: new RegExp(`^${digit}$`) }).click();
  }

  await page.getByRole('button', { name: 'SIGN IN' }).click();

  // ── 2. Wait for POS to load (past login) ───────────────────────────────
  // Could land on location, tables, or directly on POS if already a session
  await page.waitForSelector('.sel-btn, .pb-tab, .order-empty', { timeout: 15_000 });

  // ── 3. Location selection (if shown) ──────────────────────────────────
  if (await page.locator('.location-btn').first().isVisible().catch(() => false)) {
    await page.locator('.location-btn').first().click();
  }

  // ── 4. Table selection ─────────────────────────────────────────────────
  await page.waitForSelector('.table-btn', { timeout: 8_000 });
  await page.locator('.table-btn').first().click();

  // ── 5. Ticket selection (if multiple tickets on table) ─────────────────
  const ticketStage = page.locator('.sel-tickets');
  if (await ticketStage.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await page.locator('.new-ticket-btn').click();
  }

  // ── 6. Steward selection (if required for new ticket) ──────────────────
  const stewardBtn = page.locator('.steward-btn').first();
  if (await stewardBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await stewardBtn.click();
  }

  // ── 7. POS stage — add a menu item via product browser ─────────────────
  await page.waitForSelector('.pb-tab', { timeout: 10_000 });

  // Select first layer-1 tab
  await page.locator('.pb-tab').first().click();

  // Select first layer-2 category (may already be selected)
  const firstCat = page.locator('.pb-cat').first();
  if (await firstCat.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await firstCat.click();
  }

  // Wait for and click the first product button
  await page.waitForSelector('.pb-item', { timeout: 6_000 });
  await page.locator('.pb-item').first().click();

  // ── 8. Verify item appears in order list ───────────────────────────────
  await page.waitForSelector('.order-item', { timeout: 8_000 });
  await expect(page.locator('.order-item').first()).toBeVisible();

  // ── 9. Open payment dialog ─────────────────────────────────────────────
  await page.locator('.ob-payment').click();
  await page.waitForSelector('.tender-type-btn', { timeout: 5_000 });

  // ── 10. Select CASH pay type ───────────────────────────────────────────
  const cashBtn = page.locator('.tender-type-btn').filter({ hasText: /cash/i });
  if (await cashBtn.count() > 0) {
    await cashBtn.first().click();
  } else {
    // Fall back to first available pay type
    await page.locator('.tender-type-btn').first().click();
  }

  // ── 11. Set amount (Exact button for cash, or auto-filled for others) ──
  const exactBtn = page.locator('.quick-btn.exact');
  if (await exactBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await exactBtn.click();
  }
  // If no exact button, the amount was pre-filled for non-cash pay types

  // ── 12. Click Add tender ───────────────────────────────────────────────
  await page.getByRole('button', { name: 'Add' }).click();

  // Wait for tender line to appear
  await page.waitForSelector('.pay-line', { timeout: 5_000 });

  // ── 13. Wait for Complete Sale to enable ──────────────────────────────
  const completeSaleBtn = page.getByRole('button', { name: 'Complete Sale' });
  await expect(completeSaleBtn).toBeEnabled({ timeout: 6_000 });
  await completeSaleBtn.click();

  // ── 14. Receipt overlay should appear ─────────────────────────────────
  await page.waitForSelector('.receipt-overlay', { timeout: 10_000 });
  await expect(page.locator('.receipt-overlay')).toBeVisible();

  // ── 15. Close receipt → back to table selection ────────────────────────
  await page.locator('.rcp-btn.close').click();

  // Should be back at table selection
  await page.waitForSelector('.table-btn', { timeout: 8_000 });
  await expect(page.locator('.sel-title').filter({ hasText: /Select Table/i })).toBeVisible();
});
