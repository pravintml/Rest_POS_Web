# SoftVinz Rest POS — Session 1 Handoff

**Date:** 2026-06-15  
**GitHub:** https://github.com/pravintml/Rest_POS_Web.git  
**Working directory:** `E:\Projects\GIT\REST\Web_version\Rest_POS_Web`  
**Legacy source (read-only):** `E:\Projects\GIT\REST\Web_version\Rest_POS`

---

## What Was Built (Phases 0 + 1 — COMPLETE)

### Git History
```
0284142  Branding: SoftVinz Rest POS
667ccde  Fix NG0908: remove provideZoneChangeDetection (Angular 21 is zoneless)
0bb8034  Phase 1: Angular PWA frontend — login, POS shell, core services
74e3aed  Phase 1: domain entities, Dapper data layer, auth + JWT
5eb4268  Phase 0: fix credential handling, add connection string template
ef8b3f4  Phase 0: scaffold Rest_POS_Web project
```

---

## Stack

| Layer | Technology |
|---|---|
| Backend | .NET 9 ASP.NET Core Web API |
| Data access | Dapper + Microsoft.Data.SqlClient |
| Database | SQL Server 2014 (existing schema + stored procs, NO changes) |
| Frontend | Angular 21 PWA, PrimeNG 21.1.9 (Aura theme), SCSS |
| Auth | JWT Bearer — claims carry `locationId`, `unitNo`, `cashierId`, `cashierType` |
| Change detection | Angular 21 **zoneless** (signals-based, no zone.js) |

---

## Repository Structure

```
Rest_POS_Web/
  backend/
    RestPos.sln
    src/
      RestPos.Api/           ← ASP.NET Core controllers, JWT, Swagger, DI
      RestPos.Application/   ← AuthService, JwtTokenService
      RestPos.Data/          ← Dapper factories, repositories
      RestPos.Domain/        ← Entity classes (ported from SVPOS.Domain)
      RestPos.Infrastructure/ ← (stub, for Serilog/mail/ERP later)
  frontend/
    src/app/
      core/
        guards/auth.guard.ts
        interceptors/jwt.interceptor.ts
        models/auth.models.ts, config.models.ts, product.models.ts
        services/auth.service.ts, config.service.ts, product.service.ts
      features/
        login/   ← login.component.ts/html/scss
        pos/     ← pos.component.ts/html/scss (Phase 1 shell)
      app.config.ts, app.routes.ts, app.ts
    src/environments/environment.ts (apiUrl: http://localhost:5000)
  Agentdocs/
    Rest_POS_Web_Plan.md   ← Full architecture plan (living doc)
    Session1_Handoff.md    ← This file
  .gitignore
```

---

## Key Architecture Decisions

### Config (3-tier)
1. **Site config** → `backend/src/RestPos.Api/appsettings.json` (DB connection string, JWT key) — out of git
2. **Terminal identity** → device registers `locationId` + `unitNo` → saved in browser localStorage (`rp_terminal`) → embedded in JWT at login
3. **Device UI prefs** → browser localStorage only

### Security
- `appsettings.Development.json` (real `sa` password `svs@2018`) is **gitignored**
- Only `appsettings.Development.template.json` (placeholder) is committed
- DB: `Server=.\\SQL2014;Database=SVPOS_TEST;User Id=sa;Password=svs@2018`

### Angular 21 gotcha
- Angular 21 is **zoneless by default** — do NOT add `provideZoneChangeDetection()` — it crashes with `NG0908`
- Use `provideBrowserGlobalErrorListeners()` only (already in `app.config.ts`)

### Printing
- Browser `window.print()` → HTML/CSS receipt → OS default printer (AirPrint/Mopria on mobile)
- KOT/BOT: existing `SoftVinzOrderPrinter` DB-polling service kept unchanged
- Local print agent: DEFERRED

---

## Backend API — What Exists

| Endpoint | Auth | Description |
|---|---|---|
| `POST /api/auth/signin` | No | Cashier login → JWT |
| `GET /api/config/session` | JWT | SysConfig for this terminal |
| `GET /api/config/print-header` | JWT | Print header lines |
| `GET /api/config/print-footer` | JWT | Print footer lines |
| `GET /api/product/by-code/{code}` | JWT | Product lookup by PLU |
| `GET /api/product/by-barcode/{barcode}` | JWT | Product lookup by barcode |
| `GET /api/product/by-category/{categoryId}` | JWT | Products in category |
| `GET /health` | No | API health check |

### Repositories (RestPos.Data)
- `CashierRepository` — `GetByPasswordAsync`, `GetByEncodeAsync`
- `SysConfigRepository` — `GetOnLoadAsync`, `GetPrintHeaderAsync`, `GetPrintFooterAsync`
- `ProductRepository` — `GetByCodeAsync`, `GetByBarcodeAsync`, `GetByCategoryAsync`

### Domain entities (RestPos.Domain)
`Cashier`, `TempItemDet` (70+ props), `ProductMaster`, `SysConfig` (130+ props), `Paytype`, `SuspendHed`

---

## Frontend — What Exists

### Login screen (`/login`)
- First visit → Terminal Setup form (LocationId + UnitNo → localStorage)
- Subsequent visits → PIN pad (numeric 3×3 keypad + dot indicators)
- POST `/api/auth/signin` → JWT → localStorage (`rp_session`) → redirect `/pos`

### POS screen (`/pos`) — Phase 1 shell
- **Header:** SoftVinz Rest POS brand, clock, cashier name, unit no, sign-out
- **Left panel:** Live order list, subtotal/total, VOID button, PAYMENT button (stub)
- **Right panel:** Barcode/PLU input field, qty numpad, function buttons (DISCOUNT/SUSPEND/RECALL/REFUND/PAY-IN/PAY-OUT — all stubs)
- **Session strip:** Receipt#, Z#, KOT flag from SysConfig
- Product lookup wired: enter code → `GET /api/product/by-code` → adds to order list (local state, no DB write yet)
- Responsive: stacks vertically on mobile/tablet

### Auth flow
`AuthService` → signal-based session → `jwtInterceptor` adds `Bearer` header to all API calls → `authGuard` on `/pos` route

---

## Branding
- **Company:** SoftVinz
- **Product:** SoftVinz Rest POS
- Code namespaces (`RestPos.*`) stay as internal identifiers

---

## Dev Servers

```bash
# API (run from backend/src/RestPos.Api)
dotnet run --urls http://localhost:5000
# Swagger: http://localhost:5000/swagger

# Angular (run from frontend/)
npx ng serve --port 4200
# App: http://localhost:4200
```

---

## What Is NOT Done (Next Phases)

### Phase 2 — Full POS parity (NEXT)
Core transaction flow — everything between "item added" and "invoice saved":

1. **Order persistence** — `spTempItemUpdate` to write TempItemDet rows to DB
2. **Item-level discounts** — 5 discount levels + subtotal discount (`StDisc1`, `StDisc2`)
3. **Promotions** — `IsPromotion` flag on products, promo price lookup
4. **Void / Error correct** — void single line or whole bill
5. **Suspend / Recall** — `spSuspendInvoice`, `SuspendHed` recall by bill/table
6. **Table management** — table select, move, merge
7. **Loyalty** — earn/redeem points, loyalty card scan
8. **Vouchers / Gift cards** — validation + redemption
9. **Multi-tender payment** — cash, card, cheque, loyalty, voucher combinations + change calculation
10. **Tax + rounding** — decimal precision from `SysConfig.DecimalPointsCurrency`
11. **`spSaveInvoice`** — final invoice write with all payment details
12. **Browser receipt printing** — HTML/CSS receipt → `window.print()`
13. **KOT send** — write to KOT table for `SoftVinzOrderPrinter` to pick up
14. **Price override** — cashier permission check
15. **Quantity split / decrease**
16. **Paid-in / Paid-out** — `spPayIn`, `spPayOut`
17. **Refund** — `spRefund`
18. **Transaction types** — Dine-In, Take-Away, Delivery, Room Service

### Phase 3 — Day/Shift management + Reports
- Day start/end, Shift start/end, Z-number sequencing
- Reports: Daybook, Sales register, Z-report, Invoice reprint (HTML, not Crystal)

### Deferred
- Phase 4: Master/admin screens, CashierPermission, SysConfig CRUD
- Phase 5: Reservation, ERP sync, email receipts
- Local print agent (ESC/POS, cash drawer kick) — only if a site needs it

---

## Legacy Reference Files (read-only, for porting)

| File | Purpose |
|---|---|
| `Rest_POS\SVPOS.Service\TransactionService.cs` | ~364 KB — main POS business logic |
| `Rest_POS\SVPOS.Service\PaymentService.cs` | Payment + tender logic |
| `Rest_POS\SVPOS.Service\ProductService.cs` | Product lookup, promotions |
| `Rest_POS\SVPOS.Service\MasterFileService.cs` | Cashier, table, master data |
| `Rest_POS\SVPOS.Service\SysConfigService.cs` | Config loading |
| `Rest_POS\SVPOS.Service\DayStartAndShiftService.cs` | Day/shift management |
| `Rest_POS\SVPOS.Service\ReportService.cs` | Report queries |
| `Rest_POS\SVPOS.SVPOS\Transaction\FrmPOS.cs` | WinForms POS screen — flow reference |
| `Rest_POS\SVPOS.Data\CommonDataAccess.cs` | Legacy stored proc calls |
