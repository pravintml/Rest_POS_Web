# SoftVinz Rest POS — Session 2 Handoff

**Date:** 2026-06-15  
**Commit:** `b902e78` — "Phase 2: Full POS transaction parity"  
**GitHub:** https://github.com/pravintml/Rest_POS_Web.git  
**Working directory:** `E:\Projects\GIT\REST\Web_version\Rest_POS_Web`  
**Legacy source (read-only):** `E:\Projects\GIT\REST\Web_version\Rest_POS`

---

## Status: Phase 2 COMPLETE (built, compiled, committed, pushed)

Both dev servers compile clean:
- `dotnet build` → 0 errors, 0 warnings
- `npx ng build --configuration=development` → 0 errors (bundle at `dist/frontend`)

Integration testing against live SVPOS_TEST DB has **not yet been performed** — that is the first task for the next session.

---

## Git History

```
b902e78  Phase 2: Full POS transaction parity        ← NEW
960195c  Docs: Session 1 handoff
0284142  Branding: SoftVinz Rest POS
667ccde  Fix NG0908: remove provideZoneChangeDetection (Angular 21 is zoneless)
0bb8034  Phase 1: Angular PWA frontend — login, POS shell, core services
74e3aed  Phase 1: domain entities, Dapper data layer, auth + JWT
```

---

## Stack (unchanged)

| Layer | Technology |
|---|---|
| Backend | .NET 9 ASP.NET Core Web API |
| Data access | Dapper + Microsoft.Data.SqlClient |
| Database | SQL Server 2014 (existing schema + stored procs — NO changes) |
| Frontend | Angular 21 **zoneless** PWA |
| UI library | PrimeNG 21.1.9, Aura theme |
| Auth | JWT Bearer — claims: `sub`=cashierID, `name`, `cashierCode`, `locationId`, `unitNo`, `cashierType` |

**Dev servers:**
- API: `dotnet run --urls http://localhost:5000` (from `backend/src/RestPos.Api`)
- Angular: `npx ng serve --port 4200` (from `frontend/`)
- DB: SQL Server 2014, `Server=.\SQL2014`, `Database=SVPOS_TEST` (credentials in gitignored `appsettings.Development.json`)

---

## What Was Built in Phase 2

### Backend — New Files

| File | Purpose |
|---|---|
| `backend/src/RestPos.Domain/Dtos/TransactionDtos.cs` | C# records: AddItemRequest (45 fields), DiscountRequest, VoidItemRequest, ErrorCorrectRequest, VoidBillRequest, ChangePriceRequest, DecreaseQtyRequest, SplitQtyRequest, DiscountRemoveRequest, SuspendRequest, RecallRequest, SaveInvoiceRequest, CancelInvoiceRequest, SendKotRequest, ServiceChargeRequest; Response records: OrderLineDto, BillSummaryDto, SaveInvoiceResult, SuspendResult, RecallResult, SuspendListItem |
| `backend/src/RestPos.Domain/Dtos/PaymentDtos.cs` | AddPaymentRequest (20 fields), PaymentSummaryDto, PaymentLineDto, PayTypeDto, ClearPaymentRequest, PaidInOutRequest |
| `backend/src/RestPos.Data/Repositories/TransactionRepository.cs` | ITransactionRepository + impl; Dapper calls to spTempItemUpdate, spTempDiscountUpdate, spItemVoid, spErrorCorrection, spClearItems+spClearPayment, spSaveInvoice (OUTPUT @ReceiptNoRet), spCancelInvoice, spChangePrice, spDecreaseQty, spSplitQty, spDiscountRemove, spSendKot (inline SQL), spServiceChargeUpdate, spServiceChargeRemove, spSaveTransaction; inline GetBillSummaryAsync and GetBillTotalAsync matching legacy CASE WHEN logic |
| `backend/src/RestPos.Data/Repositories/PaymentRepository.cs` | IPaymentRepository + impl; spTempPaymentUpdate, spClearPayment, inline GetPaidTotalAsync (optional payTypeID filter), GetPaymentLinesAsync, GetPayTypesAsync |
| `backend/src/RestPos.Data/Repositories/SuspendRepository.cs` | ISuspendRepository + impl; spSuspendInvoice (OUTPUT @suspendNo Char 13), spRecallSuspendedInvoice, GetSuspendHedAsync, GetSuspendListAsync |
| `backend/src/RestPos.Application/Transaction/TransactionAppService.cs` | Thin orchestration; SaveInvoiceAsync returns SaveInvoiceResult with error if SP returns empty receipt |
| `backend/src/RestPos.Application/Payment/PaymentAppService.cs` | GetPaymentSummaryAsync computes change = Max(0, totalPaid − billTotal) |
| `backend/src/RestPos.Application/Suspend/SuspendAppService.cs` | RecallAsync validates !hed.IsRecall before calling SP |
| `backend/src/RestPos.Api/Controllers/TransactionController.cs` | [Authorize]; 18 endpoints; JWT claims extracted via ClaimTypes.NameIdentifier (sub→cashierID), name, locationId, unitNo; record with-expressions to inject context |
| `backend/src/RestPos.Api/Controllers/PaymentController.cs` | [Authorize]; 10 endpoints; injects both PaymentAppService and SuspendAppService |

**Modified:**
- `backend/src/RestPos.Api/Program.cs` — added scoped registrations for all new repos and app services

### Frontend — New Files

| File | Purpose |
|---|---|
| `frontend/src/app/core/models/transaction.models.ts` | TypeScript interfaces for all transaction DTOs |
| `frontend/src/app/core/models/payment.models.ts` | TypeScript interfaces for all payment DTOs |
| `frontend/src/app/core/services/transaction.service.ts` | HTTP client; BASE = `{apiUrl}/api/transaction`; all 18 transaction endpoints |
| `frontend/src/app/core/services/payment.service.ts` | HTTP client; BASE = `{apiUrl}/api/payment`; all 10 payment endpoints |
| `frontend/src/app/features/pos/dialogs/discount-dialog.component.ts` | Standalone; 5-level item discount; percentage/amount toggle; emits DiscountResult |
| `frontend/src/app/features/pos/dialogs/payment-dialog.component.ts` | Standalone; multi-tender entry; quick-cash amounts; signals for totalPaid/balance/change; emits tenderAdded/tenderCleared/completed; parent calls updateLines() to refresh |
| `frontend/src/app/features/pos/dialogs/suspend-dialog.component.ts` | Standalone; dual-mode (suspend confirm / recall list + manual entry); PrimeNG TableModule |
| `frontend/src/app/features/pos/receipt/receipt.component.ts` | 302px (80mm) monospace HTML receipt; handles DocumentID 1/3 (sale) and 2/4 (return); `@media print` hides everything except receipt |

**Modified:**
- `frontend/src/app/features/pos/pos.component.ts` — complete rewrite with DB-persisted state, all Phase 2 logic
- `frontend/src/app/features/pos/pos.component.html` — complete rewrite with all dialogs wired
- `frontend/src/app/features/pos/pos.component.scss` — added `.order-item` variants, receipt overlay, print media

---

## Key Architectural Decisions

| Decision | Detail |
|---|---|
| All order state in DB | `loadBill()` calls `GET /api/transaction/bill` after every mutation — single source of truth |
| Void strategy | `IsPrinted=true` → `spItemVoid`; `IsPrinted=false` → `spErrorCorrection` |
| KOT mechanism | Inline SQL sets `IsApp=1, IsReadyForKOT=1` where `IsPrinted=0`; existing `SoftVinzOrderPrinter` polls and picks up |
| OUTPUT params | `DynamicParameters` with `ParameterDirection.Output` for `@ReceiptNoRet` (varchar) and `@suspendNo` (Char, size=13) |
| Receipt format | `${loc.padStart(3,'0')}${unit.padStart(2,'0')}${rcpt.padStart(7,'0')}` — matches legacy convention |
| tableID / ticketID | Hardcoded to 0 — table management deferred to Phase 3 |
| PrimeNG severity | Valid values in PrimeNG 21: "success", "info", "danger", "secondary", "contrast" — NOT "warning" |
| Angular signals | No zone.js; all reactive state via `signal()` and `computed()` |

---

## API Endpoints Summary

### `TransactionController` — `/api/transaction`

| Method | Path | Description |
|---|---|---|
| GET | `/bill` | Load all order lines + bill total (BillSummaryDto) |
| GET | `/bill-total` | Scalar bill total for payment dialog |
| POST | `/add-item` | spTempItemUpdate — persist item to TempItemDet |
| POST | `/discount` | spTempDiscountUpdate — apply 5-level item discount |
| POST | `/void-item` | spItemVoid — void after KOT sent (IsPrinted=true) |
| POST | `/error-correct` | spErrorCorrection — remove before KOT (IsPrinted=false) |
| POST | `/void-bill` | spClearItems + spClearPayment — wipe whole order |
| POST | `/change-price` | spChangePrice |
| POST | `/decrease-qty` | spDecreaseQty |
| POST | `/split-qty` | spSplitQty |
| POST | `/remove-discount` | spDiscountRemove |
| POST | `/save-invoice` | spSaveInvoice — final sale write, returns receiptNo |
| POST | `/cancel-invoice` | spCancelInvoice — void/cancel sale, returns receiptNo |
| POST | `/send-kot` | Inline SQL set IsReadyForKOT=1 |
| POST | `/service-charge` | spServiceChargeUpdate |
| DELETE | `/service-charge` | spServiceChargeRemove |
| POST | `/save-status` | spSaveTransaction — update TransStatus |

### `PaymentController` — `/api/payment`

| Method | Path | Description |
|---|---|---|
| GET | `/types` | PayTypeMaster active list |
| GET | `/summary` | Total paid, balance, change, payment lines |
| GET | `/total-paid` | Scalar total paid (optional payTypeID filter) |
| POST | `/add` | spTempPaymentUpdate |
| POST | `/clear` | spClearPayment |
| GET | `/suspend/list` | SuspendHed list for recall grid |
| POST | `/suspend` | spSuspendInvoice — returns suspendNo |
| POST | `/recall` | spRecallSuspendedInvoice |

---

## DocumentID Semantics

| ID | Meaning |
|---|---|
| 1 | Sale |
| 2 | Return |
| 3 | ExchangeSale |
| 4 | ExchangeReturn |
| 5 | VoidKOT |
| 9 | PaidIn |
| 10 | PaidOut |

---

## What Remains (Phase 3)

### Deferred UI (endpoints + backend exist, no UI trigger yet)
- **Price override dialog** — `POST /api/transaction/change-price` exists; no UI button
- **Qty decrease / split dialogs** — endpoints exist; no UI
- **Discount remove from UI** — `POST /api/transaction/remove-discount` exists; no UI button
- **Service charge dialog** — endpoint exists; no UI
- **Pay-In / Pay-Out** — `PaidInOutRequest` DTO created; buttons show "Phase 3" tooltip in UI
- **Refund mode** — DocumentID=2 flow in AddItemRequest; button shows "Phase 3" tooltip

### Deferred features
- **Table management** — tableID/ticketID hardcoded to 0; full table select/transfer deferred
- **Tax totals display** — TaxPercentage passed through AddItemRequest; tax total line not yet computed/shown on receipt
- **Day/Shift open-close** — no session management UI; Z-report; X-report
- **Reports** — sales summary, item reports, cashier reports
- **Paid-in / Paid-out ledger** — DocumentID 9/10

### Integration testing needed
- Run both dev servers against live SVPOS_TEST DB
- Test golden path: scan item → discount → KOT → payment → receipt
- Test void before/after KOT send
- Test suspend + recall round-trip
- Test multi-tender with change calculation

---

## Files to Read Before Making Changes

**Legacy reference (DO NOT MODIFY):**
- `E:\Projects\GIT\REST\Web_version\Rest_POS\SVPOS.Service\TransactionService.cs` — SP call signatures, business logic
- `E:\Projects\GIT\REST\Web_version\Rest_POS\SVPOS.Service\PaymentService.cs` — payment SP calls

**Key new backend files:**
- `backend/src/RestPos.Data/Repositories/TransactionRepository.cs` — all SP wire-up
- `backend/src/RestPos.Api/Controllers/TransactionController.cs` — JWT claim extraction pattern
- `backend/src/RestPos.Application/Transaction/TransactionAppService.cs`

**Key new frontend files:**
- `frontend/src/app/features/pos/pos.component.ts` — all POS state and event handlers
- `frontend/src/app/features/pos/dialogs/payment-dialog.component.ts` — signals-based payment flow
