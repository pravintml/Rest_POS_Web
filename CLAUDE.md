# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`Rest_POS_Web` is a web rewrite of a mature WinForms restaurant POS (`Rest_POS`) running at 60+ live sites. The goal is **exact functional parity** with the legacy system — same totals, same DB rows, same flow — delivered via a .NET 9 Web API + Angular PWA. The legacy codebase lives alongside at `e:\Projects\GIT\REST` (WinForms, ~11 projects). **Always read the full legacy flow before implementing any feature in the web version.**

## Commands

### Backend (.NET 9)
```bash
cd backend
dotnet restore
dotnet run --project src/RestPos.Api        # API on http://localhost:5111
dotnet test tests/RestPos.Tests
dotnet build
```
Swagger UI: `http://localhost:5111/swagger`

`appsettings.Development.json` is gitignored — copy from `appsettings.Development.template.json` and fill in the connection string for the local SQL Server instance (`SVREST_MATARA_REST`).

### Frontend (Angular 21)
```bash
cd frontend
npm install
npx ng serve                                # App on http://localhost:4200
npx ng build --configuration production
npx ng test                                 # Vitest unit tests
npx playwright test                         # e2e tests (from repo root)
```

## Architecture

### Backend — Layered .NET 9 API

```
RestPos.Api           → Controllers, JWT, Swagger, CORS, DI wiring
RestPos.Application   → Business services (ported verbatim from legacy TransactionService, PaymentService, etc.)
RestPos.Domain        → Entity classes + DTOs (TempItemDet, ProductMaster, SysConfig, Cashier, …)
RestPos.Data          → Dapper repositories; all DB calls use stored procedures via IDbConnectionFactory
RestPos.Infrastructure→ Serilog, config helpers, ERP sync, email
```

All DB access goes through Dapper + the existing SQL Server 2014 stored procedures — **no schema changes, no ORM migrations ever**. Repositories in `RestPos.Data` mirror the legacy `CommonDataAccess` call-by-call. Stored procedures return `-1` when `SET NOCOUNT ON` is set — always check `return true` after a non-query SP call, never `rows >= 0`.

### Frontend — Angular 21 Signals + Zoneless

```
core/guards        → authGuard (JWT presence check)
core/interceptors  → JwtInterceptor (attaches Bearer token)
core/models        → TypeScript DTOs matching API responses
core/services      → API client services (one per domain area)
features/login     → Login / cashier sign-on screen
features/pos       → Main POS screen (pos.component + sub-components)
  ├── browser/     → Product browser (category + PLU grid)
  ├── dialogs/     → Payment, discount, suspend, menu-report dialogs
  └── receipt/     → HTML receipt component (rendered for window.print())
```

The app is **zoneless with Angular signals** throughout. Use `signal()`, `computed()`, and `effect()` — not `BehaviorSubject` or `@Input()` for reactive state. Plain `@Input()` values cannot be tracked by `computed()`: mirror them into a signal inside `ngOnChanges`.

### Configuration Tiers

| Tier | Where |
|---|---|
| DB connection string, ERP/mail creds | `appsettings.json` on the server — **never in Git** |
| Terminal identity: `LocationID`, `UnitNo` | Embedded in JWT at login; stored in localStorage |
| Per-terminal behavior flags (`isOrderTakingUnit`, etc.) | `SysConfig` table — loaded at session start |
| Device UI prefs (printer, kiosk mode, paper width) | Browser localStorage |

### Authentication Flow

`POST /api/auth/login` → validates cashier against `Cashier` table → returns JWT containing `LocationID`, `UnitNo`, cashier identity → all subsequent API calls carry that JWT → API uses claims as the context that legacy code read from `Common.LoggedLocationID` / `unitNo` static fields.

### Printing

Default: Angular renders the receipt as HTML (`app-receipt`) → `window.print()` → OS default printer. KOT/BOT is handled by the existing `SoftVinzOrderPrinter` DB-polling service (unchanged). A local print agent for raw ESC/POS is deferred.

## Key Rules & Constraints

- **Read the full legacy flow first.** Before implementing any feature, trace the equivalent WinForms code in `e:\Projects\GIT\REST` end-to-end including all sub-calls. The legacy `TransactionService.cs` is ~364 KB — partial reads miss important steps.
- **No schema changes.** The SQL Server 2014 schema and stored procedures are shared with the live WinForms system at every client site.
- **Exact parity.** Totals, discount math, tax, receipt numbers, and DB rows written by the web version must match the legacy WinForms output exactly. The `RestPos.Tests` parity harness enforces this.
- **SP return values.** Many SPs use `SET NOCOUNT ON` and return `-1` from Dapper's `ExecuteAsync`. Use `return true` (fire-and-forget pattern) not `rows >= 0` for these calls.
- **Cashier in use:** `unitNo = 1026`, cashier `KUSAL` on `SVREST_MATARA_REST` is the active dev terminal.

## Legacy → New Reference

| Legacy | New location |
|---|---|
| `SVPOS.Service / TransactionService.cs` | `RestPos.Application/Transaction/TransactionAppService.cs` |
| `SVPOS.Service / PaymentService.cs` | `RestPos.Application/Payment/PaymentAppService.cs` |
| `SVPOS.Data / CommonDataAccess` | `RestPos.Data/` repositories (Dapper) |
| `SVPOS.Domain` entities | `RestPos.Domain/` entities |
| `FrmPOS.cs` + `RunPOSFunction()` | `features/pos/pos.component` |
| Hardware / ESC/POS printing | Deferred (`RestPos.PrintAgent`) |
| `SoftVinzOrderPrinter` KOT/BOT | **Kept as-is, unchanged** |

## Living Documentation

`Agentdocs/Rest_POS_Web_Plan.md` — architecture decisions, configuration tiers, printing model, build phases, and open follow-ups. Update it when major decisions change.
