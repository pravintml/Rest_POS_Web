# Rest_POS → Web Version: Architecture & Build Plan

## Context

`Rest_POS` is a mature, production restaurant POS running at 60+ client sites. It is a
.NET Framework 4.5.2 **WinForms** application (~11 projects) backed by **SQL Server 2014**,
with a large amount of business logic in both a C# service layer (`TransactionService.cs`
is ~364 KB) and **35+ stored procedures**. It is deployed **on-premise per restaurant**
(each site has its own SQL Server DB, e.g. `SVREST_MATARA_REST`), works **offline on the
local LAN**, and is tightly coupled to **POS hardware** (thermal receipt printers, cash
drawer, customer display, kitchen KOT printers, MSR/EDC card readers, scales) via OPOS /
`Microsoft.PointOfService` on COM/USB.

The goal is a **web version** that:
- Replicates **all** existing functionality with the **same flow** (no functional changes now).
- Has a **new, enhanced, responsive UI** (mobile / tablet / laptop / PC / TV).
- Splits the system into a **.NET Web API** (all DB communication) + an **Angular** front end.
- Is **low-risk** for 60 live deployments — must produce identical totals, receipts, and saved data.

This plan keeps the **existing SQL Server schema and stored procedures unchanged**, ports the
proven C# business logic into the API, and replaces only the presentation + hardware-access
layers. The new code lives in `Rest_POS_Web/` (GitHub: `pravintml/Rest_POS_Web`).

## Confirmed decisions

| Area | Decision |
|---|---|
| Deployment | **On-premise per client** — API + Angular served from a local box on each site's LAN, talking to that site's existing SQL Server 2014. Preserves offline + hardware. |
| Frontend | **Angular + PWA**, responsive, with PrimeNG (recommended) or Angular Material. |
| API runtime | **.NET 9** ASP.NET Core Web API (installed; upgrade to .NET 10 LTS when released). |
| Data access | **Reuse existing DB + stored procedures via Dapper**; port C# service logic as-is. **No schema migration.** SQL Server 2014 fully supported by `Microsoft.Data.SqlClient`. |
| Configuration | **No per-machine `.config`.** Site config → one API `appsettings.json` (secrets out of Git); terminal identity (`LocationID`/`UnitNo`) → device **registration** + JWT; per-terminal behavior → `SysConfig` (DB); device UI prefs → browser localStorage. See **Configuration & terminal identity**. |
| Hardware/printing | **Browser printing by default** — render the bill as HTML/PDF and print via the OS **default/driver printer** (`window.print()`). **Works on mobile/tablet with no agent** (AirPrint / Mopria) and on desktop (optionally **silent** via Chrome/Edge `--kiosk-printing`). **KOT/BOT** stay on the existing kitchen DB-polling service (`SoftVinzOrderPrinter`). A **local print agent is optional/deferred** — built only for stations needing raw ESC/POS, programmatic cash-drawer kick, or silent thermal. Provider is **configurable per terminal**. See **Printing model**. |

## Target architecture

```
Restaurant LAN (on-premise box)
┌──────────────────────────────────────────────────────────────┐
│  Browser (tablet / phone / PC)  Angular PWA (responsive)      │
│   - renders HTML/PDF receipt → window.print() → default/      │
│     driver printer (AirPrint/Mopria on mobile; kiosk = silent)│
│        │  HTTPS (LAN)                                          │
│        ▼                                                       │
│  RestPos.Api (.NET 9)                                         │
│   - JWT auth, controllers, ported business services           │
│   - Dapper → stored procs   - server-side journal/copy        │
│        │                                                      │
│        ▼                                                      │
│  SQL Server 2014 (existing per-site DB, unchanged schema+SPs) │
│        ▲                                                      │
│  SoftVinzOrderPrinter (existing KOT/BOT DB-polling, kept)     │
│                                                               │
│  [optional/deferred] RestPos.PrintAgent on localhost — raw    │
│  ESC/POS, cash drawer, silent thermal (only where needed)     │
└──────────────────────────────────────────────────────────────┘
```

Stateless API: all order/shift/day state stays in the DB (TempItemDet, SuspendHed,
DayStart, ShiftDet) exactly as today. Multi-tenant = one deployment per site, connection
string in per-site config (out of source).

## Configuration & terminal identity

Today every machine carries its own `App.config` — `LocationID`, `UnitNo`, `SERVER`/`PASSWORD`/`DBName`,
`isOrderTakingUnit`, `Barcode`, `IsPrintOnRemoteMachine`, mail + ERP creds — read at POS load and used to
build the DB connection via `CommonService.setAndsGetConnection(server, password, DBName)`. A browser
device can't hold this file and one API serves many devices, so config is split into **three tiers**:

1. **Site/server config — one per on-prem API box** → `appsettings.json` + env vars/secrets, kept
   **out of Git** (`.gitignore`):
   - DB connection string (collapses ~60 duplicated machine configs into one per site).
   - ERP sync (`CompanyId`, `ErpApiUrl`, `ErpEmail`/`ErpPassword`), mail (`Send Mail`, `Send To`).

2. **Terminal identity & per-terminal behavior — data, not files** → terminal **registration / pairing**:
   - Each device pairs once → assigned `LocationID` + `UnitNo` (stored in browser localStorage/PWA +
     server `Terminals` table extending existing `TerminalDetails`).
   - Identity embedded in **JWT at login** (replaces static `Common.LoggedLocationID`/`unitNo`).
   - Registration enforces UnitNo uniqueness (two devices sharing one = receipt/temp-bill collisions).
   - Behavior flags (`isOrderTakingUnit`, barcode mode, print mode) live in **`SysConfig`** (already
     keyed by `LocationID`+`UnitNo`); API loads them at session start; Angular UI enables/disables
     features accordingly.

3. **Device-local UI prefs — browser only** → localStorage: selected printer, kiosk-silent toggle,
   receipt paper width, scanner-focus mode.

External/loyalty connections (`getConnectionExternal`, `TerminalDetails`) stay **server-side** in the API.

Result: no per-machine file editing; adding a terminal = register the device in-app; secrets centralized
and out of Git.

## Repository structure (`Rest_POS_Web/`)

```
Rest_POS_Web/
  Agentdocs/                    # living project documentation (this file)
  backend/
    RestPos.sln
    src/RestPos.Api             # ASP.NET Core Web API: controllers, JWT, Swagger, DI, config
    src/RestPos.Application     # business services ported from SVPOS.Service
    src/RestPos.Domain          # entities/DTOs ported from SVPOS.Domain
    src/RestPos.Data            # Dapper data access + stored-proc calls, IDbConnection factory
    src/RestPos.Infrastructure  # Serilog logging, config, email, ERP-sync runner
    tests/RestPos.Tests         # parity/unit tests for totals, discounts, tax, numbering
  frontend/                     # Angular workspace (PWA) — renders HTML/PDF receipts, browser printing
  .gitignore
  README.md
  # [deferred] src/RestPos.PrintAgent  — local agent, only if a site needs raw ESC/POS / drawer
```

## Legacy → new mapping

| Legacy | New |
|---|---|
| `SVPOS.Data` (DBConnection, CommonDataAccess) | `RestPos.Data` — per-request `IDbConnection` factory + Dapper; same stored procedures, same params |
| `SVPOS.Domain` | `RestPos.Domain` — entity classes ported as-is (TempItemDet, ProductMaster, SysConfig, Cashier, etc.) |
| `SVPOS.Service` (TransactionService, PaymentService, ProductService, MasterFileService, ReportService, DayStartAndShiftService, SysConfigService, CommonService) | `RestPos.Application` — port logic verbatim; remove WinForms static UI state; pass context (location, unit, cashier) explicitly per request |
| `SVPOS.Utility` (SystemLogger, MailSender, ERPSync, Validater) | `RestPos.Infrastructure` |
| WinForms `FrmPOS.cs` + `RunPOSFunction()` command set | Angular feature modules — the function table (PLU, DISCOUNT, VOID, SUBTOTAL, SUSPEND, RECALL, PAYIN/POUT, REFUND, LOYALTY, VOUCHER…) is the parity checklist |
| `Devices/PrintData.cs` (ESC/POS) | Deferred — reused only by optional PrintAgent |
| `SVPOS.SoftVinzOrderPrinter` (KOT/BOT) | **Kept as-is** — DB-polling kitchen/bar service |

## Printing model

**Default — Browser printing (no agent):**
- Angular renders the bill as **HTML** (CSS `@page`, 80mm/58mm) or **PDF** (pdfmake/jsPDF) and calls
  `window.print()` to the OS default/driver printer.
- Mobile/tablet: AirPrint (iOS) / Mopria (Android) — no agent needed.
- Desktop: any installed driver; optionally **silent** via Chrome/Edge `--kiosk-printing`.
- Journal/copy-receipt: written **server-side** in the API.

**KOT/BOT:** unchanged — `SoftVinzOrderPrinter` DB-polling service, routed by `OrderTerminalID`.

**Optional/deferred — Local print agent:** per-device Windows helper on `localhost:<port>/print` for
raw ESC/POS, programmatic cash-drawer kick, or silent thermal on tablet. Reuses `Devices/PrintData.cs`.

**Caveats:**
- Cash drawer via browser only if wired into the receipt printer and driver kicks on print.
- Mobile/tablet: no silent print path — always requires a tap.
- WebUSB/Web Serial: desktop-Chrome only, no iOS — not used as the cross-device default.

## Build phases

**Phase 0 — Repo & scaffolding** ✅ (in progress)
- `Agentdocs/` with this plan.
- `.gitignore`, `README.md`, connect `origin` → `https://github.com/pravintml/Rest_POS_Web.git`.
- Scaffold `backend/RestPos.sln` with 5 projects + tests (.NET 9). Scaffold Angular PWA in `frontend/`.
- Add Swagger, Serilog, JWT, CORS (LAN), health endpoint.

**Phase 1 — Vertical slice (prove end-to-end)**
- Dapper connects to a restored client DB via `appsettings` connection string.
- Terminal registration → `LocationID`+`UnitNo` → JWT.
- Auth: cashier sign-on → validate vs `Cashier` table → JWT with identity.
- Load `SysConfig`; load categories + products.
- Core order: add item (`spTempItemUpdate`) → subtotal → payment → `spSaveInvoice` → browser print.
- Angular: login + main POS screen for this slice.

**Phase 2 — Full POS parity** (mirror `FrmPOS` exactly)
- 5-level item discounts + subtotal discount; promotions; loyalty; vouchers; gift cards.
- Void/error-correction; decrease/split qty; price override; service charge.
- Suspend/recall; table select/move/merge; refund; paid-in/paid-out; multi-tender + change; tax + rounding.

**Phase 3 — Day/shift + reports**
- Day start/end, shift start/end, Z-number sequencing; counter management.
- Reports: daybook, sales register, bill-wise sales, suspended list, invoice reprint (web views/PDF).

**Deferred** (revisit after Phases 0–3)
- Master/admin screens; `CashierPermission` management; SysConfig CRUD.
- Reservation module; ERP sync runner; email receipts.
- `RestPos.PrintAgent` (raw ESC/POS / cash drawer).

**Cross-cutting (every phase)**
- Responsive layouts + PWA install/offline shell; touch-friendly POS grid.
- Secrets out of source; HTTPS on LAN.

## Verification

- **Parity harness:** same inputs against the new API + legacy WinForms → bill totals, discount/tax math,
  receipt/Z numbers, and DB rows written must match exactly.
- **Unit tests** (`RestPos.Tests`): totals, 5-level discounts, tax, rounding, number sequencing.
- **API:** `dotnet run` → Swagger.
- **Frontend:** `ng serve` → login → order → pay → print; verify responsive at all screen sizes + PWA install.
- **Printing:** browser print on desktop (silent via kiosk flag) and tablet/phone (AirPrint/Mopria).
  KOT/BOT via existing kitchen service.

## Open follow-ups

- Confirm which client DB to use as parity reference (and obtain a restore).
- Confirm UI component library: **PrimeNG** (recommended) vs Angular Material.
- Decide terminal pairing strategy: admin pairing code (recommended) vs cashier picks at login vs IP mapping.
- Confirm silent one-tap printing requirement and device type (determines if/where agent is needed).
- Confirm receipt paper width (80mm / 58mm).
