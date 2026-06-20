import {
  Component, signal, computed, inject, OnInit, OnDestroy,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { ProductService } from '../../core/services/product.service';
import { TransactionService } from '../../core/services/transaction.service';
import { PaymentService } from '../../core/services/payment.service';
import { MasterService } from '../../core/services/master.service';

import { SysConfig } from '../../core/models/config.models';
import { ProductMaster } from '../../core/models/product.models';
import { OrderLineDto, ItemCommentRequest, ServiceChargeUpdateRequest, LayawayRequest, CustomerCopyRequest } from '../../core/models/transaction.models';
import { PayTypeDto, PaymentLineDto, SuspendListItem } from '../../core/models/payment.models';
import {
  BillingLocation, TableInfo, TableStatus, Steward, TicketInfo
} from '../../core/models/master.models';

import { DiscountDialogComponent, DiscountResult } from './dialogs/discount-dialog.component';
import { PaymentDialogComponent, PaymentDialogContext } from './dialogs/payment-dialog.component';
import { SuspendDialogComponent, SuspendDialogMode } from './dialogs/suspend-dialog.component';
import { ReceiptComponent, ReceiptData } from './receipt/receipt.component';
import { ProductBrowserComponent } from './browser/product-browser.component';
import { MenuReportDialogComponent } from './dialogs/menu-report-dialog.component';
import { ReprintDialogComponent } from './dialogs/reprint-dialog.component';
import { InvoiceSummaryDto } from '../../core/models/transaction.models';

type SelectionStage = 'location' | 'tables' | 'tickets' | 'steward' | 'pos';

/** Each row rendered in the bill grid. Virtual subtotal rows are computed from the data. */
type BillDisplayRow =
  | { kind: 'item';     data: OrderLineDto }
  | { kind: 'discount'; data: OrderLineDto }
  | { kind: 'sc';       data: OrderLineDto }
  | { kind: 'subtotal'; amount: number; isFinal: boolean; i: number };

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, ProgressSpinnerModule,
    ToastModule, TagModule, DividerModule, BadgeModule, TooltipModule,
    ConfirmDialogModule,
    DiscountDialogComponent, PaymentDialogComponent,
    SuspendDialogComponent, ReceiptComponent,
    ProductBrowserComponent, MenuReportDialogComponent,
    ReprintDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly configSvc = inject(ConfigService);
  private readonly productSvc = inject(ProductService);
  private readonly txSvc = inject(TransactionService);
  private readonly paySvc = inject(PaymentService);
  private readonly masterSvc = inject(MasterService);
  private readonly msgSvc = inject(MessageService);
  private readonly confirmSvc = inject(ConfirmationService);

  @ViewChild('codeInput') codeInput!: ElementRef<HTMLInputElement>;

  readonly session = this.auth.session;
  readonly config = this.configSvc.config;
  readonly configLoading = signal(true);
  readonly billLoading = signal(false);
  readonly busy = signal(false);

  readonly TableStatus = TableStatus;

  // ── Selection flow ───────────────────────────────────────────────────────
  readonly selectionStage = signal<SelectionStage>('location');
  readonly billingLocations = signal<BillingLocation[]>([]);
  readonly tables = signal<TableInfo[]>([]);
  readonly stewards = signal<Steward[]>([]);
  readonly tickets = signal<TicketInfo[]>([]);
  readonly selectionLoading = signal(false);

  // ── Bill context ─────────────────────────────────────────────────────────
  readonly locationIDBilling = signal(0);
  readonly locationIDBillingName = signal('');
  readonly tableID = signal(0);
  readonly tableName = signal('');
  readonly ticketID = signal(0);
  readonly stewardId = signal(0);
  readonly stewardName = signal('');

  // ── Bill state ───────────────────────────────────────────────────────────
  readonly orderItems = signal<OrderLineDto[]>([]);
  readonly billTotal = signal(0);
  readonly selectedRowNo = signal<number | null>(null);

  // ── Bill header info (START, MOBILE #, CUSTOMER, PACKS, TAG #) ───────────
  readonly orderStart  = signal('');
  readonly billMobileNo = signal('');
  readonly billCustomer = signal('');
  readonly billPacks   = signal(1);
  readonly billTagNo   = signal('');

  // ── Input ────────────────────────────────────────────────────────────────
  readonly numpadBuffer = signal('');
  readonly productSearching = signal(false);
  readonly currentTime = signal(new Date());

  // ── Receipt ──────────────────────────────────────────────────────────────
  readonly currentReceipt = computed(() => {
    const cfg = this.config();
    if (!cfg) return '';
    return this.formatReceipt(cfg);
  });

  // ── Computed display ─────────────────────────────────────────────────────
  readonly decimalPlaces = computed(() => this.config()?.decimalPointsCurrency ?? 2);
  readonly locationName = computed(() => this.locationIDBillingName() || this.config()?.locationName || '');
  readonly itemCount = computed(() =>
    this.orderItems().filter(i => i.documentID <= 4).reduce((s, i) => s + i.qty, 0)
  );
  readonly selectedLine = computed(() =>
    this.orderItems().find(i => i.rowNo === this.selectedRowNo()) ?? null
  );

  /** Bill grid rows with virtual SUB TOTAL rows inserted between groups (items / discounts / SC). */
  readonly billDisplayRows = computed<BillDisplayRow[]>(() => {
    const items = this.orderItems();
    if (!items.length) return [];

    const rows: BillDisplayRow[] = [];
    let running = 0;
    let prevGroup: 'item' | 'discount' | 'sc' | null = null;
    let subIdx = 0;

    for (const item of items) {
      const group: 'item' | 'discount' | 'sc' =
        item.documentID <= 4 ? 'item' : item.documentID === 6 ? 'discount' : 'sc';

      if (prevGroup !== null && prevGroup !== group) {
        rows.push({ kind: 'subtotal', amount: running, isFinal: false, i: subIdx++ });
      }

      switch (group) {
        case 'item':
          running += (item.documentID === 1 || item.documentID === 3) ? item.nett : -item.nett;
          rows.push({ kind: 'item', data: item });
          break;
        case 'discount':
          running -= item.nett;
          rows.push({ kind: 'discount', data: item });
          break;
        case 'sc':
          running += item.nett;
          rows.push({ kind: 'sc', data: item });
          break;
      }
      prevGroup = group;
    }

    rows.push({ kind: 'subtotal', amount: running, isFinal: true, i: subIdx });
    return rows;
  });

  /** Final running total from the bill grid — mirrors legacy txtTotal (billValue) which is the last accumulated amount including items, discounts, and SC. */
  readonly displayTotal = computed(() => {
    const rows = this.billDisplayRows();
    if (!rows.length) return 0;
    const last = rows[rows.length - 1];
    return last.kind === 'subtotal' ? last.amount : 0;
  });

  // ── Dialog state ─────────────────────────────────────────────────────────
  showDiscount = false;
  showPayment = false;
  showSuspend = false;
  showReceipt = false;
  isCopyReceipt = false;
  isReprintReceipt = false;
  suspendMode: SuspendDialogMode = 'suspend';
  discountDialogIsPercentage = true;

  // ── Mobile bill toggle ────────────────────────────────────────────────────
  showBillMobile = signal(false);
  toggleBillMobile() { this.showBillMobile.update(v => !v); }

  // ── More panel toggle ─────────────────────────────────────────────────────
  showMore = signal(false);

  // ── Menu / reports dialog ─────────────────────────────────────────────────
  showMenuDialog = signal(false);
  openMenu() { this.showMenuDialog.set(true); }

  // ── Reprint dialog ────────────────────────────────────────────────────────
  showReprintDialog = signal(false);

  // ── Discount level (1-5 = line discount tier, 0 = default) ───────────────
  discountLevelId = signal(0);
  showDiscountLevelPicker = signal(false);
  readonly discountLevelLabel = computed(() => {
    const lvl = this.discountLevelId();
    return lvl === 0 ? 'DISC LEVEL' : `DISC LVL ${lvl}`;
  });

  // ── Merge table mode (reuses the location/table/ticket selection flow) ──────
  // Legacy: btnMerge_Click stashes the CURRENT bill as the source, then the user
  // navigates to pick a DESTINATION table+ticket (any billing location). The
  // source bill's items move into the destination; you end up on the destination.
  mergeMode = signal(false);
  mergeSrcTableID = signal(0);
  mergeSrcTableName = signal('');
  mergeSrcBilling = signal(0);
  mergeSrcBillingName = signal('');
  mergeSrcTicketID = signal(0);

  // ── Change table mode (reuses the location/table selection flow) ────────────
  changeTableMode = signal(false);
  changeSrcTableID = signal(0);
  changeSrcTableName = signal('');
  changeSrcBilling = signal(0);
  changeSrcBillingName = signal('');
  changeSrcTicketID = signal(0);

  // ── Item comment overlay (legacy panelComment) ──────────────────────────────
  showCommentOverlay = signal(false);
  commentOptions = signal<import('../../core/models/master.models').ItemCommentOption[]>([]);
  commentText = signal('');
  private commentLine: OrderLineDto | null = null;

  // On-screen QWERTY keyboard for the comment overlay (legacy panelComment keyboard).
  showCmtKeyboard = signal(false);
  readonly kbRows: string[][] = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M',',','.','/'],
  ];

  payTypes = signal<PayTypeDto[]>([]);
  paymentNotes = signal<number[]>([]);
  paymentLines = signal<PaymentLineDto[]>([]);
  suspendList = signal<SuspendListItem[]>([]);
  paymentCtx = signal<PaymentDialogContext | null>(null);
  receiptData = signal<ReceiptData | null>(null);

  private timeInterval?: ReturnType<typeof setInterval>;

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.timeInterval = setInterval(() => this.currentTime.set(new Date()), 1000);
    // Load session config first (terminal-level), then billing locations for selection
    this.configSvc.loadSession().subscribe({
      next: () => {
        this.configLoading.set(false);
        this.loadPayTypes();
        this.loadBillingLocations();
      },
      error: () => {
        this.configLoading.set(false);
        this.toast('error', 'Config Error', 'Could not load terminal configuration');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Selection flow
  // ─────────────────────────────────────────────────────────────────────────
  private loadBillingLocations() {
    this.selectionLoading.set(true);
    this.masterSvc.getBillingLocations().subscribe({
      next: list => {
        this.billingLocations.set(list);
        this.selectionLoading.set(false);
        if (list.length === 1) {
          this.onLocationSelected(list[0]);
        } else {
          this.selectionStage.set('location');
        }
      },
      error: () => {
        this.selectionLoading.set(false);
        this.toast('error', 'Error', 'Could not load billing locations');
      }
    });
  }

  /**
   * Picks a PrimeIcon for a billing location based on keywords in its name.
   * Locations are data-driven, so this maps common restaurant area names to a
   * recognisable glyph and falls back to a generic building icon.
   */
  locationIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (/take\s*away|takeaway|to\s*go|parcel/.test(n)) return 'pi-shopping-bag';
    if (/delivery|deliver/.test(n)) return 'pi-truck';
    if (/vip|lounge|exclusive|premium/.test(n)) return 'pi-crown';
    if (/family|kids|group/.test(n)) return 'pi-users';
    if (/restaurant|dining|dine|hall|main/.test(n)) return 'pi-shop';
    if (/room|suite|cabin/.test(n)) return 'pi-key';
    if (/bar|pub|drink/.test(n)) return 'pi-sparkles';
    if (/garden|outdoor|terrace|roof/.test(n)) return 'pi-sun';
    if (/counter|cashier|pos/.test(n)) return 'pi-desktop';
    return 'pi-building';
  }

  /** Accent color for a billing location's icon, matched to its type. */
  locationColor(name: string): string {
    const n = (name || '').toLowerCase();
    if (/take\s*away|takeaway|to\s*go|parcel/.test(n)) return '#2dc653'; // green
    if (/delivery|deliver/.test(n)) return '#ff9f43';                    // orange
    if (/vip|lounge|exclusive|premium/.test(n)) return '#f1c40f';        // gold
    if (/family|kids|group/.test(n)) return '#4dd4c4';                   // teal
    if (/restaurant|dining|dine|hall|main/.test(n)) return '#74b9ff';    // blue
    if (/room|suite|cabin/.test(n)) return '#a78bfa';                    // purple
    if (/bar|pub|drink/.test(n)) return '#ff6b9d';                       // pink
    if (/garden|outdoor|terrace|roof/.test(n)) return '#9ccc65';         // leaf
    if (/counter|cashier|pos/.test(n)) return '#5dade2';                 // sky
    return '#74b9ff';                                                    // default blue
  }

  onLocationSelected(loc: BillingLocation) {
    this.locationIDBilling.set(loc.locationId);
    this.locationIDBillingName.set(loc.name);
    this.selectionLoading.set(true);
    // Load counter config for this billing location
    this.configSvc.loadCounterConfig(loc.locationId).subscribe({
      next: () => {
        this.selectionLoading.set(false);
        this.loadTables(loc.locationId);
      },
      error: () => {
        this.selectionLoading.set(false);
        this.loadTables(loc.locationId);
      }
    });
  }

  private loadTables(billingLocationId: number, autoSelect = true) {
    this.selectionLoading.set(true);
    this.masterSvc.getTables(billingLocationId).subscribe({
      next: list => {
        this.tables.set(list);
        this.selectionLoading.set(false);
        // Auto-select if only 1 table AND only 1 billing location (mirrors legacy).
        // Never auto-select in change/merge mode — the user must pick the target.
        // Explicit navigation (TABLES button / post-sale reset) passes autoSelect=false
        // so the user always sees the (refreshed) table screen.
        if (autoSelect && list.length === 1 && this.billingLocations().length === 1 && !this.changeTableMode() && !this.mergeMode()) {
          this.onTableSelected(list[0]);
        } else {
          this.selectionStage.set('tables');
        }
      },
      error: () => {
        this.selectionLoading.set(false);
        this.toast('error', 'Error', 'Could not load tables');
      }
    });
  }

  onTableSelected(table: TableInfo) {
    // In change-table mode, picking a target table performs the move (legacy:
    // TableButton_Clicked → tableIDToBeChanged != 0 branch). No ticket/steward sub-flow.
    if (this.changeTableMode()) {
      this.doChangeTable(table);
      return;
    }
    // In merge mode, the picked table is the destination; resolve its ticket then merge
    // (legacy: TableButton_Clicked → tableIDToBeMerged != 0 branch).
    if (this.mergeMode()) {
      this.resolveMergeDestination(table);
      return;
    }
    this.tableID.set(table.tableID);
    this.tableName.set(table.tableName);
    this.selectionLoading.set(true);
    this.masterSvc.getTickets(this.locationIDBilling(), table.tableID).subscribe({
      next: tickets => {
        this.selectionLoading.set(false);
        if (tickets.length === 0) {
          // New bill — allocate a ticket
          this.masterSvc.allocateTicket().subscribe({
            next: res => {
              this.ticketID.set(res.ticketId);
              this.proceedAfterTicket(true);
            },
            error: () => this.toast('error', 'Error', 'Could not allocate ticket')
          });
        } else if (tickets.length === 1) {
          // One open ticket — reopen it
          this.ticketID.set(tickets[0].ticketID);
          this.stewardId.set(tickets[0].stewardID);
          this.stewardName.set(tickets[0].stewardName);
          this.proceedAfterTicket(false);
        } else {
          // Multiple tickets — show picker
          this.tickets.set(tickets);
          this.selectionStage.set('tickets');
        }
      },
      error: () => {
        this.selectionLoading.set(false);
        this.toast('error', 'Error', 'Could not load tickets');
      }
    });
  }

  onTicketSelected(ticket: TicketInfo) {
    // In merge mode, the picked ticket is the destination — merge into it.
    if (this.mergeMode()) {
      this.doMerge(ticket.ticketID);
      return;
    }
    this.ticketID.set(ticket.ticketID);
    this.stewardId.set(ticket.stewardID);
    this.stewardName.set(ticket.stewardName);
    this.proceedAfterTicket(false);
  }

  onNewTicketForTable() {
    this.masterSvc.allocateTicket().subscribe({
      next: res => {
        // In merge mode, merge the source bill into the freshly allocated destination ticket.
        if (this.mergeMode()) {
          this.doMerge(res.ticketId);
          return;
        }
        this.ticketID.set(res.ticketId);
        this.proceedAfterTicket(true);
      },
      error: () => this.toast('error', 'Error', 'Could not allocate ticket')
    });
  }

  private proceedAfterTicket(isNew: boolean) {
    if (isNew && this.config()?.isLoadSteward) {
      this.loadStewards();
    } else {
      this.enterPOS();
    }
  }

  private loadStewards() {
    this.selectionLoading.set(true);
    this.masterSvc.getStewards().subscribe({
      next: list => {
        this.stewards.set(list);
        this.selectionLoading.set(false);
        this.selectionStage.set('steward');
      },
      error: () => {
        this.selectionLoading.set(false);
        this.toast('error', 'Error', 'Could not load stewards');
      }
    });
  }

  onStewardSelected(steward: Steward) {
    this.stewardId.set(steward.stewardID);
    this.stewardName.set(steward.stewardName);
    this.enterPOS();
  }

  private enterPOS(isLoad = false) {
    this.selectionStage.set('pos');
    this.refreshBill(isLoad);
    setTimeout(() => this.codeInput?.nativeElement?.focus(), 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bill load
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Full bill refresh — faithful port of legacy
   * RefreshGrid(bool isLoad, bool isUpdateServiceCharge, bool isUpdateLoyaltyDiscount).
   *
   *  • isLoad — clear the ticket's in-progress payment rows BEFORE loading the grid
   *    (legacy GetTempItemDetails(isLoad:true) → ClearPayment → spClearPayment).
   *    Passed `true` by change-table & merge (legacy RefreshGrid(true)); left `false`
   *    by move/add/void/etc. (legacy RefreshGrid()).
   *  • isUpdateServiceCharge — recalculate the service charge before loading.
   *  • isUpdateLoyaltyDiscount — re-apply loyalty/employee auto-discount. The web POS
   *    has no loyalty/employee auto-discount subsystem yet, so this is currently a
   *    no-op kept for signature parity with legacy.
   *
   * Always finishes by reloading the full grid (loadBill).
   */
  private refreshBill(isLoad = false, isUpdateServiceCharge = true, isUpdateLoyaltyDiscount = true) {
    // Step 3 in legacy (isUpdateLoyaltyDiscount): re-apply loyalty / employee auto-discount.
    // The web POS has no loyalty/employee auto-discount subsystem yet, so this flag is
    // honoured as a no-op extension point to keep parity with legacy RefreshGrid.
    if (isUpdateLoyaltyDiscount) { /* no-op until loyalty/employee discount is ported */ }

    // Step 1 (legacy isLoad): clear payment rows for this ticket, then continue.
    if (isLoad && this.ticketID() !== 0) {
      const sess = this.session();
      if (sess) {
        this.paySvc.clearPayment({
          locationID: sess.locationId,
          locationIDBilling: this.locationIDBilling(),
          tableID: this.tableID(),
          ticketID: this.ticketID()
        }).subscribe({
          complete: () => this.updateServiceChargeThenLoad(isUpdateServiceCharge),
          error:    () => this.updateServiceChargeThenLoad(isUpdateServiceCharge)
        });
        return;
      }
    }
    this.updateServiceChargeThenLoad(isUpdateServiceCharge);
  }

  /** Step 2 (legacy isUpdateServiceCharge): recalc service charge, then load the full grid. */
  private updateServiceChargeThenLoad(isUpdateServiceCharge: boolean) {
    const cfg = this.config();
    const sess = this.session();
    // Mirror legacy ServiceChargeUpdate(): call unconditionally whenever there is a ticket,
    // passing the CURRENT location's rate (incl. 0). spServiceChargeUpdate always drops the
    // existing service-charge line and only re-adds it when the amount > 0 — so a rate of 0
    // removes a stale charge (e.g. moving a bill from a 10% location to a 0% location).
    // Do NOT gate on cfg.serviceCharge > 0, or the stale charge would never be cleared.
    if (isUpdateServiceCharge && cfg && this.ticketID() !== 0 && sess) {
      this.txSvc.updateServiceCharge({
        cashier: sess.name,
        receipt: this.currentReceipt(),
        locationIDBilling: this.locationIDBilling(),
        tableID: this.tableID(),
        ticketID: this.ticketID(),
        stewardID: this.stewardId(),
        stewardName: this.stewardName(),
        serviceCharge: cfg.serviceCharge,
        decimalPointsCurrency: this.decimalPlaces()
      } as ServiceChargeUpdateRequest).subscribe({
        complete: () => this.loadBill(),
        error:    () => this.loadBill()
      });
    } else {
      this.loadBill();
    }
  }

  loadBill() {
    const cfg = this.config();
    if (!cfg) return;
    this.billLoading.set(true);
    this.txSvc.getBill(
      this.locationIDBilling(), this.tableID(), this.ticketID(),
      this.currentReceipt(), this.decimalPlaces()
    ).subscribe({
      next: summary => {
        this.orderItems.set(summary.items);
        this.billTotal.set(summary.billTotal);
        // Full refresh of bill-derived header fields, mirroring legacy RefreshGrid():
        // re-apply the steward from the loaded bill. Backend returns '' only when the
        // bill has no rows — in that case keep a just-selected steward (legacy:
        // `if (stewardID != string.Empty)`), otherwise reflect the bill's actual steward
        // (important after merge/change-table switches the active ticket).
        if (summary.stewardID !== '') {
          this.stewardId.set(+summary.stewardID || 0);
          this.stewardName.set(summary.stewardName);
        }
        this.orderStart.set(summary.orderStart);
        this.billMobileNo.set(summary.mobileNo);
        this.billCustomer.set(summary.customer);
        this.billPacks.set(summary.packs);
        this.billTagNo.set(summary.tagNo);
        this.billLoading.set(false);
      },
      error: () => this.billLoading.set(false)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Product lookup + add item
  // ─────────────────────────────────────────────────────────────────────────
  numpadPress(key: string) {
    if (key === '.' && this.numpadBuffer().includes('.')) return;
    this.numpadBuffer.update(b => b + key);
    if (this.codeInput) this.codeInput.nativeElement.value = this.numpadBuffer();
  }
  numpadBackspace() {
    this.numpadBuffer.update(b => b.slice(0, -1));
    if (this.codeInput) this.codeInput.nativeElement.value = this.numpadBuffer();
  }
  numpadClear() {
    this.numpadBuffer.set('');
    if (this.codeInput) this.codeInput.nativeElement.value = '';
  }

  onCodeEnter(code: string) {
    this.lookupByCode(code.trim());
    if (this.codeInput) this.codeInput.nativeElement.value = '';
  }

  private lookupByCode(code: string) {
    if (!code) return;
    this.numpadBuffer.set('');
    if (this.codeInput) this.codeInput.nativeElement.value = '';
    this.productSearching.set(true);
    const cfg = this.config()!;
    this.productSvc.getByCode(code, this.locationIDBilling()).subscribe({
      next: p => { this.productSearching.set(false); this.addProduct(p, cfg); },
      error: err => {
        this.productSearching.set(false);
        this.toast('warn', 'Not Found', err.status === 404 ? `Product not found: ${code}` : 'Product lookup failed');
      }
    });
  }

  onBrowserProductSelected(p: ProductMaster) {
    const cfg = this.config();
    if (cfg) this.addProduct(p, cfg);
  }

  addProduct(p: ProductMaster, cfg: SysConfig) {
    const sess = this.session()!;
    const qty = this.numpadBuffer() ? parseFloat(this.numpadBuffer()) : 1;

    const req = {
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      productID: p.productID,
      productCode: p.productCode,
      refCode: p.refCode ?? p.productCode,
      barCodeFull: 0,
      descrip: p.nameOnInvoice || p.productName,
      cost: p.costPrice,
      price: p.sellingPrice,
      qty,
      documentID: 1,
      receipt: this.currentReceipt(),
      cashierID: sess.cashierId,
      cashier: sess.name,
      unitNo: sess.unitNo,
      billTypeID: 1,
      saleTypeID: 1,
      baseUnitID: 0,
      unitOfMeasureID: 0,
      unitOfMeasureName: '',
      convertFactor: 1,
      batchNo: '',
      serialNo: '',
      expiaryDate: null,
      isTax: p.isTax,
      taxPercentage: 0,
      salesmanID: 0,
      salesman: '',
      customerID: 0,
      customer: '',
      isStock: false,
      customerType: 0,
      transStatus: 1,
      isPromotion: p.isPromotion,
      fixedDiscount: p.fixedDiscount ?? 0,
      fixedDiscountPercentage: p.fixedDiscountPercentage ?? 0,
      promotionID: 0,
      orderTerminalID: p.orderTerminalID ?? 0,
      orderNo: cfg.kotInvoice,
      isNew: true,
      stewardID: this.stewardId(),
      stewardName: this.stewardName(),
      currentRowNo: this.orderItems().length,
      tagNo: '',
      mobileNo: ''
    };

    this.busy.set(true);
    this.txSvc.addItem(req).subscribe({
      next: () => {
        this.busy.set(false);
        this.numpadBuffer.set('');
        if (this.codeInput) this.codeInput.nativeElement.value = '';
        this.refreshBill();
        this.toast('success', 'Added', `${p.productName} × ${qty}`, 1500);
        setTimeout(() => this.codeInput?.nativeElement?.focus(), 50);
      },
      error: () => {
        this.busy.set(false);
        this.toast('error', 'Error', 'Failed to add item');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Item selection
  // ─────────────────────────────────────────────────────────────────────────
  selectRow(item: OrderLineDto) {
    this.selectedRowNo.set(item.rowNo === this.selectedRowNo() ? null : item.rowNo);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Void operations
  // ─────────────────────────────────────────────────────────────────────────
  voidSelectedItem() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item to void'); return; }
    const sess = this.session()!;

    this.confirmSvc.confirm({
      message: `Void "${line.descrip}"?`,
      accept: () => {
        this.busy.set(true);
        const voidFn = line.isPrinted
          ? this.txSvc.voidItem({
              locationID: sess.locationId, productID: line.productID,
              qty: line.qty, documentID: line.documentID,
              receipt: this.currentReceipt(), cashierID: sess.cashierId,
              cashier: sess.name, unitNo: sess.unitNo, rowNo: line.rowNo,
              isBillSeek: false, locationIDBilling: this.locationIDBilling(),
              tableID: this.tableID(), ticketID: this.ticketID(), appUserName: sess.code
            })
          : this.txSvc.errorCorrect({
              locationID: sess.locationId, productID: line.productID,
              qty: line.qty, documentID: line.documentID,
              receipt: this.currentReceipt(), cashierID: sess.cashierId,
              cashier: sess.name, unitNo: sess.unitNo, rowNo: line.rowNo
            });

        voidFn.subscribe({
          next: () => {
            this.busy.set(false);
            this.selectedRowNo.set(null);
            this.refreshBill();
            this.toast('info', 'Voided', line.descrip);
          },
          error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to void item'); }
        });
      }
    });
  }

  voidBill() {
    if (this.orderItems().length === 0) return;
    this.confirmSvc.confirm({
      message: 'Void entire bill?',
      accept: () => {
        const sess = this.session()!;
        this.busy.set(true);
        this.txSvc.voidBill({
          locationID: sess.locationId,
          locationIDBilling: this.locationIDBilling(),
          tableID: this.tableID(), ticketID: this.ticketID()
        }).subscribe({
          next: () => {
            this.busy.set(false);
            this.orderItems.set([]);
            this.billTotal.set(0);
            this.selectedRowNo.set(null);
            this.toast('info', 'Voided', 'Bill cleared');
          },
          error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to void bill'); }
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // New bill (same table, new ticket)
  // ─────────────────────────────────────────────────────────────────────────
  newBill() {
    this.confirmSvc.confirm({
      message: 'Start a new bill on this table?',
      accept: () => {
        this.masterSvc.allocateTicket().subscribe({
          next: res => {
            this.ticketID.set(res.ticketId);
            this.orderItems.set([]);
            this.billTotal.set(0);
            this.selectedRowNo.set(null);
            this.toast('success', 'New Bill', `Ticket #${res.ticketId}`);
          },
          error: () => this.toast('error', 'Error', 'Could not allocate ticket')
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Qty +  (re-add selected item)
  // ─────────────────────────────────────────────────────────────────────────
  increaseQty() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item first'); return; }
    const cfg = this.config();
    if (!cfg) return;
    this.busy.set(true);
    this.productSvc.getById(line.productID, this.locationIDBilling()).subscribe({
      next: p => this.addProduct(p, cfg),
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Could not find product'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Qty -
  // ─────────────────────────────────────────────────────────────────────────
  decreaseQty() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item first'); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.decreaseQty({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      productID: line.productID,
      rowNo: line.rowNo
    }).subscribe({
      next: () => { this.busy.set(false); this.refreshBill(); this.toast('info', 'Qty decreased', line.descrip); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to decrease qty'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Split qty  (enter qty on numpad first, then press SPLIT QTY)
  // ─────────────────────────────────────────────────────────────────────────
  splitQty() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item first'); return; }
    const qty = parseFloat(this.numpadBuffer());
    if (!qty || qty <= 0) { this.toast('warn', 'Split Qty', 'Enter qty to split on numpad first'); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.splitQty({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      productID: line.productID,
      rowNo: line.rowNo,
      qty
    }).subscribe({
      next: () => { this.busy.set(false); this.numpadClear(); this.refreshBill(); this.toast('success', 'Split', `${qty} split off`); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to split qty'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Remove service charge
  // ─────────────────────────────────────────────────────────────────────────
  removeServiceCharge() {
    this.busy.set(true);
    this.txSvc.removeServiceCharge(this.locationIDBilling(), this.tableID(), this.ticketID()).subscribe({
      next: () => { this.busy.set(false); this.loadBill(); this.toast('info', 'Removed', 'Service charge removed'); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to remove service charge'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Remove discount — item-level when a line is selected, bill-level otherwise
  // Mirrors legacy RunDiscountRemove: rowNo=0 → subtotal discount removal
  // ─────────────────────────────────────────────────────────────────────────
  removeDiscount() {
    if (!this.auth.hasPermission('DISCREM')) {
      this.toast('warn', 'Permission Denied', 'Remove discount permission denied');
      return;
    }
    if (this.orderItems().length === 0) { this.toast('warn', 'No Items', 'No items in bill'); return; }
    const line = this.selectedLine();
    const sess = this.session()!;
    this.busy.set(true);
    const cfg = this.config()!;
    this.txSvc.removeDiscount({
      locationID: sess.locationId,
      productCode: '',            // legacy always sends '' (only '**' for bulk-remove, unsupported)
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      rowNo: line ? line.rowNo : 0,   // rowNo=0 → removes bill-level discount
      receipt: this.currentReceipt(),
      stewardID: this.stewardId(),
      stewardName: this.stewardName(),
      serviceCharge: cfg.serviceCharge,
      decimalPointsCurrency: this.decimalPlaces()
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.refreshBill();
        this.toast('info', 'Discount Removed', line ? line.descrip : 'Bill discount removed');
      },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to remove discount'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Change price  (enter new price on numpad first, then CHANGE PRICE)
  // ─────────────────────────────────────────────────────────────────────────
  openChangePrice() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item first'); return; }
    const price = parseFloat(this.numpadBuffer());
    if (isNaN(price) || price < 0) { this.toast('warn', 'Change Price', 'Enter new price on numpad first'); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.changePrice({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      productID: line.productID,
      rowNo: line.rowNo,
      price
    }).subscribe({
      next: () => { this.busy.set(false); this.numpadClear(); this.refreshBill(); this.toast('success', 'Price Changed', line.descrip); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to change price'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reprint invoice — opens picker dialog, loads saved detail, shows receipt
  // ─────────────────────────────────────────────────────────────────────────
  reprintInvoice() {
    this.showReprintDialog.set(true);
    this.showMore.set(false);
  }

  onReprintSelected(inv: InvoiceSummaryDto) {
    this.showReprintDialog.set(false);
    const cfg = this.config();
    if (!cfg) return;
    this.busy.set(true);
    this.txSvc.getSavedInvoiceDetail(this.locationIDBilling(), inv.receipt).subscribe({
      next: detail => {
        this.busy.set(false);
        const headerLines = [cfg.locationName, cfg.head1, cfg.head2, cfg.head3, cfg.head4, cfg.head5]
          .filter(h => h?.trim());
        const footerLines = [cfg.tail1, cfg.tail2, cfg.tail3, cfg.tail4, cfg.tail5]
          .filter(t => t?.trim());
        const payments = detail.payments.map(p => ({
          payTypeID: p.payTypeID, descrip: p.descrip,
          amount: p.amount, refNo: p.refNo, rowNo: 0
        }));
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
        const saleItems = detail.items.filter(i => i.documentID === 1 || i.documentID === 3);
        this.receiptData.set({
          receiptNo: inv.receipt,
          zNo: cfg.zno,
          date: inv.recDate.split(' ')[0],
          time: inv.recDate.split(' ')[1],
          cashier: detail.cashier || inv.cashier,
          unitNo: inv.unitNo,
          type: this.locationIDBillingName() || undefined,
          label: 'REPRINTED',
          headerLines,
          footerLines,
          items: detail.items,
          payments,
          billTotal: inv.netAmount,
          totalPaid,
          change: 0,
          decimalPoints: this.decimalPlaces(),
          soldQty: saleItems.length,
          pieces: saleItems.reduce((s, i) => s + i.qty, 0),
          totalDiscount: detail.items
            .filter(i => i.documentID === 6)
            .reduce((s, i) => s + i.nett, 0)
        });
        this.isReprintReceipt = true;
        this.showReceipt = true;
      },
      error: () => {
        this.busy.set(false);
        this.toast('error', 'Error', 'Could not load invoice detail');
      }
    });
  }

  onReprintClosed() {
    this.showReprintDialog.set(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Discount — AMOUNT
  // Line selected  → item-level discount  (rowNo, isSubTotal=false, documentID=line)
  // No line        → bill-level discount  (rowNo=0, isSubTotal=true, documentID=6)
  // Numpad has value → apply directly without dialog; empty → open dialog
  // Mirrors legacy: btnDiscount_Click → IsAccess("DISCOUNT") → RunDiscount(false)
  // ─────────────────────────────────────────────────────────────────────────
  openDiscountAmount() {
    if (!this.auth.hasPermission('DISCOUNT')) {
      this.toast('warn', 'Permission Denied', 'Discount amount permission denied');
      return;
    }
    if (this.orderItems().length === 0) { this.toast('warn', 'No Items', 'No items in bill'); return; }
    const line = this.selectedLine();
    const val = parseFloat(this.numpadBuffer());
    if (!isNaN(val) && val > 0) {
      this.numpadClear();
      this.onDiscountApplied(this.buildDiscountResult(val, false, line));
    } else {
      this.discountDialogIsPercentage = false;
      this.showDiscount = true;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Discount — PERCENTAGE
  // Same two-level logic as DISCOUNT, but isPercentage=true.
  // Mirrors legacy: btnDiscountPercentage_Click → IsAccess("DISCOUNTPER") → RunDiscount(true)
  // ─────────────────────────────────────────────────────────────────────────
  openDiscountPercent() {
    if (!this.auth.hasPermission('DISCOUNTPER')) {
      this.toast('warn', 'Permission Denied', 'Discount % permission denied');
      return;
    }
    if (this.orderItems().length === 0) { this.toast('warn', 'No Items', 'No items in bill'); return; }
    const line = this.selectedLine();
    const val = parseFloat(this.numpadBuffer());
    if (!isNaN(val) && val > 0 && val <= 100) {
      this.numpadClear();
      this.onDiscountApplied(this.buildDiscountResult(val, true, line));
    } else {
      this.discountDialogIsPercentage = true;
      this.showDiscount = true;
    }
  }

  /**
   * Builds a DiscountResult for the API call.
   * line=null  → bill-level: rowNo=0, isSubTotal=true, documentID=6
   * line!=null → item-level: uses line's rowNo and documentID
   */
  private buildDiscountResult(discount: number, isPercentage: boolean, line: OrderLineDto | null): DiscountResult {
    const item = !!line;
    return {
      rowNo:       item ? line!.rowNo : 0,
      productCode: item ? line!.productCode : '',
      discount,
      isPercentage,
      isSubTotal:  !item,
      discountID:  this.discountLevelId() || 2,
      netAmount:   item ? line!.nett : this.displayTotal(),
      documentID:  item ? line!.documentID : 6
    };
  }

  onDiscountApplied(result: DiscountResult) {
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.applyDiscount({
      locationID: sess.locationId,
      documentID: result.documentID,
      receipt: this.currentReceipt(),
      cashierID: sess.cashierId,
      cashier: sess.name,
      unitNo: sess.unitNo,
      discount: result.discount,
      isPercentage: result.isPercentage,
      isSubTotal: result.isSubTotal,
      discountID: result.discountID,
      netAmount: result.netAmount,
      billTypeID: 1,
      saleTypeID: 1,
      customerID: 0,
      decimalPointsCurrency: this.decimalPlaces(),
      customerType: 0,
      transStatus: 1,
      isPromotion: false,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      rowNo: result.rowNo
    }).subscribe({
      next: () => { this.busy.set(false); this.refreshBill(); this.toast('success', 'Discount', 'Applied'); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to apply discount'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KOT
  // ─────────────────────────────────────────────────────────────────────────
  sendKot() {
    const sess = this.session()!;
    const unprinted = this.orderItems().filter(i => !i.isPrinted);
    if (unprinted.length === 0) { this.toast('warn', 'KOT', 'No new items to send'); return; }

    const terminalIDs = [...new Set(unprinted.map(i => (i as any).orderTerminalID ?? 0))];
    const sends = terminalIDs.map(tid =>
      this.txSvc.sendKot({
        locationID: sess.locationId,
        locationIDBilling: this.locationIDBilling(),
        tableID: this.tableID(),
        ticketID: this.ticketID(),
        orderTerminalID: tid
      })
    );

    this.busy.set(true);
    let remaining = sends.length;
    sends.forEach(obs => obs.subscribe({
      next: () => {
        if (--remaining === 0) {
          this.busy.set(false);
          this.loadBill();
          this.toast('success', 'KOT Sent', `${unprinted.length} item(s) sent to kitchen`);
        }
      },
      error: () => { remaining--; this.busy.set(false); this.toast('error', 'Error', 'KOT send failed'); }
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Layaway
  // ─────────────────────────────────────────────────────────────────────────
  layaway() {
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.layaway({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID()
    } as LayawayRequest).subscribe({
      next: () => {
        this.busy.set(false);
        this.orderItems.set([]);
        this.billTotal.set(0);
        this.goToTables();
      },
      error: (err) => {
        this.busy.set(false);
        const msg = err?.error?.error ?? 'Layaway failed';
        this.toast('warn', 'Layaway', msg);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Customer copy receipt (COPY button)
  // ─────────────────────────────────────────────────────────────────────────
  copyReceipt() {
    const sess = this.session()!;
    const cfg = this.config()!;
    this.busy.set(true);
    this.txSvc.customerCopy({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID()
    } as CustomerCopyRequest).subscribe({
      next: () => {
        this.busy.set(false);
        this.prepareReceipt('', cfg);
        // Override label to CUSTOMER COPY with no payment lines
        const cur = this.receiptData();
        if (cur) {
          this.receiptData.set({ ...cur, label: 'CUSTOMER COPY', payments: [], totalPaid: 0, change: 0 });
        }
        this.isCopyReceipt = true;
        this.showReceipt = true;
      },
      error: (err) => {
        this.busy.set(false);
        const msg = err?.error?.error ?? 'Copy failed';
        this.toast('warn', 'Copy', msg);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Suspend / Recall
  // ─────────────────────────────────────────────────────────────────────────
  openSuspend() {
    if (this.orderItems().length === 0) { this.toast('warn', 'Suspend', 'Nothing to suspend'); return; }
    this.suspendMode = 'suspend';
    this.showSuspend = true;
  }

  openRecall() {
    this.paySvc.getSuspendList().subscribe({
      next: list => { this.suspendList.set(list); this.suspendMode = 'recall'; this.showSuspend = true; },
      error: () => this.toast('error', 'Error', 'Could not load suspend list')
    });
  }

  onSuspendConfirmed() {
    const sess = this.session()!;
    this.busy.set(true);
    this.paySvc.suspendInvoice({
      locationID: sess.locationId,
      receipt: this.currentReceipt(),
      unitNo: sess.unitNo,
      cashierID: sess.cashierId,
      amount: this.displayTotal(),
      transStatus: 1
    }).subscribe({
      next: res => {
        this.busy.set(false);
        this.orderItems.set([]);
        this.billTotal.set(0);
        this.toast('success', 'Suspended', `Suspend No: ${res.suspendNo}`);
      },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to suspend invoice'); }
    });
  }

  onRecallSelected(suspendNo: string) {
    const sess = this.session()!;
    this.busy.set(true);
    this.paySvc.recallInvoice({
      locationID: sess.locationId,
      receipt: this.currentReceipt(),
      unitNo: sess.unitNo,
      cashierID: sess.cashierId,
      cashier: sess.name,
      recallNo: suspendNo,
      recallUnitNo: sess.unitNo
    }).subscribe({
      next: () => { this.busy.set(false); this.refreshBill(); this.toast('success', 'Recalled', `Invoice recalled`); },
      error: (e) => {
        this.busy.set(false);
        this.toast('error', 'Error', e.error?.error ?? 'Failed to recall invoice');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Payment
  // ─────────────────────────────────────────────────────────────────────────
  private loadPayTypes() {
    this.paySvc.getPayTypes().subscribe({
      next: types => this.payTypes.set(types),
      error: () => {}
    });
    this.paySvc.getPaymentNotes().subscribe({
      next: notes => this.paymentNotes.set(notes.map(n => n.note)),
      error: () => {}
    });
  }

  openPayment() {
    if (this.orderItems().length === 0) { this.toast('warn', 'Payment', 'No items in bill'); return; }
    const sess = this.session()!;
    this.paymentCtx.set({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      receipt: this.currentReceipt(),
      unitNo: sess.unitNo,
      cashierID: sess.cashierId,
      billTypeID: 1,
      saleTypeID: 1,
      billTotal: this.displayTotal(),
      decimalPoints: this.decimalPlaces(),
      tableName: this.tableName(),
      cashierName: sess.name,
      orderStart: this.orderStart(),
      mobileNo: this.billMobileNo(),
      customer: this.billCustomer(),
      packs: this.billPacks(),
      tagNo: this.billTagNo()
    });
    this.paymentLines.set([]);
    this.showPayment = true;
  }

  onPaymentCompleted(lines: PaymentLineDto[]) {
    this.paymentLines.set(lines);
    const sess = this.session()!;
    const cfg = this.config()!;

    this.busy.set(true);
    this.txSvc.saveInvoice({
      locationID: sess.locationId,
      receipt: this.currentReceipt(),
      unitNo: sess.unitNo,
      cashierID: sess.cashierId,
      customerID: 0,
      customerType: 0,
      customerCode: '',
      amount: this.displayTotal(),
      loyaltyType: 0,
      encodedName: sess.code,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID()
    }).subscribe({
      next: result => {
        this.busy.set(false);
        this.prepareReceipt(result.receiptNo, cfg);
        this.orderItems.set([]);
        this.billTotal.set(0);
        this.showReceipt = true;
        // Refresh counter config to get updated receipt counter
        this.configSvc.loadCounterConfig(this.locationIDBilling()).subscribe();
      },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to save invoice'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Receipt print
  // ─────────────────────────────────────────────────────────────────────────
  private prepareReceipt(receiptNo: string, cfg: SysConfig) {
    const sess = this.session()!;
    const headerLines = [cfg.locationName, cfg.head1, cfg.head2, cfg.head3, cfg.head4, cfg.head5]
      .filter(h => h?.trim());
    const footerLines = [cfg.tail1, cfg.tail2, cfg.tail3, cfg.tail4, cfg.tail5]
      .filter(t => t?.trim());
    const payments = this.paymentLines();
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const items = this.orderItems();
    const saleItems = items.filter(i => i.documentID === 1 || i.documentID === 3);
    const now = new Date();

    this.receiptData.set({
      receiptNo,
      zNo: cfg.zno,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      cashier: sess.name,
      unitNo: sess.unitNo,
      type: this.locationIDBillingName() || undefined,
      tableNo: this.tableName() || undefined,
      stewardName: this.stewardName() || undefined,
      tagNo: items.find(i => i.tagNo)?.tagNo ?? undefined,
      ticketID: this.ticketID() || undefined,
      label: '',
      headerLines,
      footerLines,
      items,
      payments,
      billTotal: this.displayTotal(),
      totalPaid,
      change: Math.max(0, totalPaid - this.displayTotal()),
      decimalPoints: this.decimalPlaces(),
      soldQty: saleItems.length,
      pieces: saleItems.reduce((s, i) => s + i.qty, 0),
      totalDiscount: saleItems.reduce((s, i) => s + i.discount, 0)
        + items.filter(i => i.documentID === 6).reduce((s, i) => s + i.nett, 0)
    });
  }

  printReceipt() { window.print(); }

  closeReceipt() {
    this.showReceipt = false;
    this.receiptData.set(null);
    this.paymentLines.set([]);
    if (this.isCopyReceipt || this.isReprintReceipt) {
      this.isCopyReceipt = false;
      this.isReprintReceipt = false;
      // Stay on the current screen — customer copy / reprint don't end the order
    } else {
      this.resetToTables();
    }
  }

  /** Clear the active bill-view context when navigating back to a selection screen. */
  private clearBillContext() {
    this.tableID.set(0);
    this.tableName.set('');
    this.ticketID.set(0);
    this.stewardId.set(0);
    this.stewardName.set('');
    this.selectedRowNo.set(null);
    this.orderStart.set('');
    this.billMobileNo.set('');
    this.billCustomer.set('');
    this.billPacks.set(1);
    this.billTagNo.set('');
  }

  resetToTables() {
    this.clearBillContext();
    this.loadTables(this.locationIDBilling(), false);
  }

  /** Order-screen button: go to the table-selection screen for the current billing location. */
  goToTables() {
    this.clearBillContext();
    this.loadTables(this.locationIDBilling(), false);
  }

  /** Order-screen button: go to the billing-location selection screen. */
  goToLocations() {
    this.clearBillContext();
    this.selectionStage.set('location');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMMENT — legacy panelComment: predefined comment buttons (ItemComment) that
  // append with " / ", plus free text, applied to the selected line.
  // ─────────────────────────────────────────────────────────────────────────
  openComment() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item first'); return; }
    this.commentLine = line;
    this.busy.set(true);
    // Load the existing comment + the predefined comment options together (legacy
    // btnComment_Click → GetItemComment + LoadItemComment → GetItemCommentsForTouch).
    this.txSvc.getItemComment(
      this.locationIDBilling(), this.tableID(), this.ticketID(),
      line.rowNo, line.productID
    ).subscribe({
      next: res => {
        this.commentText.set(res.comment ?? '');
        this.masterSvc.getItemComments().subscribe({
          next: opts => { this.commentOptions.set(opts); this.busy.set(false); this.showCommentOverlay.set(true); },
          error: () => { this.commentOptions.set([]); this.busy.set(false); this.showCommentOverlay.set(true); }
        });
      },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Could not load comment'); }
    });
  }

  /** Append a predefined comment, separated by " / " (legacy LoadItemComment button click). */
  appendComment(opt: import('../../core/models/master.models').ItemCommentOption) {
    this.commentText.update(c => c.trim() ? `${c.trim()} / ${opt.comment.trim()}` : opt.comment.trim());
  }

  clearComment() { this.commentText.set(''); }

  closeCommentOverlay() { this.showCommentOverlay.set(false); this.showCmtKeyboard.set(false); this.commentLine = null; }

  // On-screen keyboard handlers (append to the comment text).
  toggleCmtKeyboard() { this.showCmtKeyboard.update(v => !v); }
  kbKey(ch: string) { this.commentText.update(c => c + ch); }
  kbBackspace() { this.commentText.update(c => c.slice(0, -1)); }

  /** Save the comment for the selected line (legacy btnItemCommentOk_Click → UpdateItemComment). */
  applyComment() {
    const line = this.commentLine;
    if (!line) { this.closeCommentOverlay(); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.updateItemComment({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      rowNo: line.rowNo,
      productID: line.productID,
      itemComment: this.commentText().trim()
    }).subscribe({
      next: () => { this.busy.set(false); this.closeCommentOverlay(); this.loadBill(); this.toast('success', 'Comment', 'Saved'); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to save comment'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAG — read the value from the PLU / barcode input box (legacy btnTag_Click
  // reads txtMainNumeric.Text). Type/scan the tag into the box, then press TAG.
  // ─────────────────────────────────────────────────────────────────────────
  updateTag(raw: string) {
    const tagNo = (raw ?? '').trim();
    if (!tagNo) { this.toast('warn', 'Tag', 'Enter a tag in the PLU / barcode box first'); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.updateTag({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      tagNo
    }).subscribe({
      next: () => { this.busy.set(false); this.numpadClear(); this.loadBill(); this.toast('success', 'Tag', tagNo); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to set tag'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PACKS — use numpad value
  // ─────────────────────────────────────────────────────────────────────────
  updatePacks() {
    const packs = parseInt(this.numpadBuffer(), 10);
    if (!packs || packs <= 0) { this.toast('warn', 'Packs', 'Enter number of packs on numpad first'); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.updatePacks({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      packs
    }).subscribe({
      next: () => { this.busy.set(false); this.numpadClear(); this.loadBill(); this.toast('success', 'Packs', `${packs} packs`); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to set packs'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE NO — read the value from the PLU / barcode input box (legacy
  // btnMobileNo_Click reads txtMainNumeric.Text). Type the number, then press MOBILE NO.
  // ─────────────────────────────────────────────────────────────────────────
  updateMobileNo(raw: string) {
    const mobileNo = (raw ?? '').trim();
    if (!mobileNo) { this.toast('warn', 'Mobile No', 'Enter a mobile number in the PLU / barcode box first'); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.updateMobileNo({
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      mobileNo
    }).subscribe({
      next: () => { this.busy.set(false); this.numpadClear(); this.loadBill(); this.toast('success', 'Mobile No', mobileNo); },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to set mobile no'); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DISCOUNT LEVEL — numpad value 1-5 sets directly; empty opens picker
  // Mirrors legacy: btnDiscountLevel_Click → IsAccess("DISC_LEVEL") → RunChangeDiscountLevel
  // ─────────────────────────────────────────────────────────────────────────
  openDiscountLevel() {
    if (!this.auth.hasPermission('DISC_LEVEL')) {
      this.toast('warn', 'Permission Denied', 'Discount level change permission denied');
      return;
    }
    const val = parseInt(this.numpadBuffer(), 10);
    if (val >= 1 && val <= 5) {
      this.discountLevelId.set(val);
      this.numpadClear();
      this.toast('info', 'Discount Level', `Level ${val} active`, 1500);
    } else {
      this.showDiscountLevelPicker.set(true);
    }
  }

  selectDiscountLevel(level: number) {
    this.discountLevelId.set(level);
    this.showDiscountLevelPicker.set(false);
    this.toast('info', 'Discount Level', level === 0 ? 'Reset to default' : `Level ${level} active`, 1500);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOVE — moves selected item to a new ticket on the same table
  // ─────────────────────────────────────────────────────────────────────────
  moveSelectedItem() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item to move'); return; }
    const sess = this.session()!;

    this.confirmSvc.confirm({
      message: `Move "${line.descrip}" to a new ticket on this table?`,
      accept: () => {
        this.busy.set(true);
        this.masterSvc.allocateTicket().subscribe({
          next: res => {
            this.txSvc.moveItems({
              locationID: sess.locationId,
              cashierID: sess.cashierId,
              locationIDBilling: this.locationIDBilling(),
              tableID: this.tableID(),
              ticketID: this.ticketID(),
              rowNo: line.rowNo,
              newTicketID: res.ticketId
            }).subscribe({
              next: () => {
                this.busy.set(false);
                this.selectedRowNo.set(null);
                this.ticketID.set(res.ticketId);   // legacy btnMoveItems_Click: ticketID = ticketIDNew — open the new ticket
                this.refreshBill();                 // legacy RefreshGrid() (isLoad = false)
                this.toast('success', 'Moved', `"${line.descrip}" moved to new ticket #${res.ticketId}`);
              },
              error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to move item'); }
            });
          },
          error: () => { this.busy.set(false); this.toast('error', 'Error', 'Could not allocate ticket'); }
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MERGE — move the current bill into another table's bill (legacy: spMergeTable)
  // Mirrors legacy btnMerge_Click + TableButton_Clicked (tableIDToBeMerged branch):
  // stash the CURRENT bill as the source, re-enter the billing-location → table →
  // ticket selection flow, then pick the DESTINATION (in ANY billing location).
  // The source's items move into the destination ticket; you end up on the
  // destination. The SP also archives a copy for audit.
  // ─────────────────────────────────────────────────────────────────────────
  openMerge() {
    if (this.orderItems().length === 0) {
      this.toast('warn', 'Merge', 'No data to merge');
      return;
    }
    if (!this.auth.hasPermission('MERGE')) {
      this.toast('warn', 'Permission Denied', 'Merge permission denied');
      return;
    }
    this.busy.set(true);
    this.txSvc.isCustomerCopyPrinted(this.locationIDBilling(), this.tableID(), this.ticketID()).subscribe({
      next: res => {
        this.busy.set(false);
        if (res.printed && !this.auth.hasPermission('CHANGETBLAFTERCUSTCOPY')) {
          this.toast('warn', 'Permission Denied', 'You are not allowed to merge after printing customer copy');
          return;
        }
        this.enterMergeMode();
      },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Could not verify customer copy status'); }
    });
  }

  private enterMergeMode() {
    // Stash the current bill as the SOURCE (legacy: tableIDToBeMerged = tableID …).
    this.mergeSrcTableID.set(this.tableID());
    this.mergeSrcTableName.set(this.tableName());
    this.mergeSrcBilling.set(this.locationIDBilling());
    this.mergeSrcBillingName.set(this.locationIDBillingName());
    this.mergeSrcTicketID.set(this.ticketID());
    this.mergeMode.set(true);
    this.selectionStage.set('location');
  }

  /** Resolve the destination ticket on the picked table, then merge (legacy ticket sub-flow). */
  private resolveMergeDestination(table: TableInfo) {
    this.tableID.set(table.tableID);
    this.tableName.set(table.tableName);
    this.selectionLoading.set(true);
    this.masterSvc.getTickets(this.locationIDBilling(), table.tableID).subscribe({
      next: tickets => {
        this.selectionLoading.set(false);
        // Can't merge a bill into itself — drop the source ticket if it's on this table.
        const usable = tickets.filter(t => !(
          table.tableID === this.mergeSrcTableID() &&
          this.locationIDBilling() === this.mergeSrcBilling() &&
          t.ticketID === this.mergeSrcTicketID()));
        if (usable.length === 0) {
          // No existing destination ticket → allocate a fresh one (legacy getTicketID).
          this.masterSvc.allocateTicket().subscribe({
            next: res => this.doMerge(res.ticketId),
            error: () => this.toast('error', 'Error', 'Could not allocate ticket')
          });
        } else if (usable.length === 1) {
          this.doMerge(usable[0].ticketID);
        } else {
          this.tickets.set(usable);
          this.selectionStage.set('tickets');
        }
      },
      error: () => { this.selectionLoading.set(false); this.toast('error', 'Error', 'Could not load tickets'); }
    });
  }

  /** Calls spMergeTable: source (stashed) → destination (current table + given ticket). */
  private doMerge(destTicketId: number) {
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.mergeTable({
      locationID: sess.locationId,
      cashierID: sess.cashierId,
      locationIDBilling: this.locationIDBilling(),            // destination billing (newly selected)
      tableID: this.tableID(),                                // destination table
      ticketID: destTicketId,                                 // destination ticket
      tableIDToBeMerged: this.mergeSrcTableID(),              // source table (stashed)
      locationIDBillingToBeMerged: this.mergeSrcBilling(),    // source billing (stashed)
      ticketIDToBeMerged: this.mergeSrcTicketID()             // source ticket (stashed)
    }).subscribe({
      next: () => {
        this.ticketID.set(destTicketId);                      // view the destination bill
        this.mergeMode.set(false);
        this.busy.set(false);
        this.enterPOS(true);   // legacy RefreshGrid(true): clears payments + full reload
        this.toast('success', 'Merged', `Bill merged into ${this.tableName()}`);
      },
      error: () => {
        this.busy.set(false);
        this.toast('error', 'Error', 'Table merge failed');
        this.cancelMerge();
      }
    });
  }

  /** Abort merge mode and return to the original bill. */
  cancelMerge() {
    this.locationIDBilling.set(this.mergeSrcBilling());
    this.locationIDBillingName.set(this.mergeSrcBillingName());
    this.tableID.set(this.mergeSrcTableID());
    this.tableName.set(this.mergeSrcTableName());
    this.ticketID.set(this.mergeSrcTicketID());
    this.mergeMode.set(false);
    this.enterPOS();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHANGE TABLE — move entire bill to another table (legacy: spChangeTable)
  // Mirrors legacy btnChangeTable_Click + TableButton_Clicked: stash the source
  // table/billing-location, then re-enter the billing-location → table selection
  // flow. Picking a target table (in ANY billing location) performs the move.
  // The same ticket is preserved; the SP also archives a copy for audit.
  // ─────────────────────────────────────────────────────────────────────────
  openChangeTable() {
    if (this.orderItems().length === 0) {
      this.toast('warn', 'Change Table', 'No data to change');
      return;
    }
    if (!this.auth.hasPermission('CHANGETABLE')) {
      this.toast('warn', 'Permission Denied', 'Change table permission denied');
      return;
    }
    this.busy.set(true);
    this.txSvc.isCustomerCopyPrinted(this.locationIDBilling(), this.tableID(), this.ticketID()).subscribe({
      next: res => {
        this.busy.set(false);
        if (res.printed && !this.auth.hasPermission('CHANGETBLAFTERCUSTCOPY')) {
          this.toast('warn', 'Permission Denied', 'You are not allowed to change table after printing customer copy');
          return;
        }
        this.enterChangeTableMode();
      },
      error: () => { this.busy.set(false); this.toast('error', 'Error', 'Could not verify customer copy status'); }
    });
  }

  private enterChangeTableMode() {
    // Stash the source context so it survives navigating the selection screens.
    this.changeSrcTableID.set(this.tableID());
    this.changeSrcTableName.set(this.tableName());
    this.changeSrcBilling.set(this.locationIDBilling());
    this.changeSrcBillingName.set(this.locationIDBillingName());
    this.changeSrcTicketID.set(this.ticketID());
    this.changeTableMode.set(true);
    // Re-enter the billing-location screen (legacy panelLocation) so the target
    // table can live in a different billing location.
    this.selectionStage.set('location');
  }

  /** Performs the move once a target table is picked while in change-table mode. */
  private doChangeTable(target: TableInfo) {
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.changeTable({
      locationID: sess.locationId,
      cashierID: sess.cashierId,
      locationIDBilling: this.locationIDBilling(),          // target billing location (newly selected)
      tableIDToBeChanged: this.changeSrcTableID(),           // source table
      tableID: target.tableID,                               // target table
      ticketID: this.changeSrcTicketID(),                    // same ticket (preserved)
      locationIDBillingToBeChanged: this.changeSrcBilling()  // source billing location
    }).subscribe({
      next: () => {
        // Activate the new table context, keeping the same ticket.
        this.tableID.set(target.tableID);
        this.tableName.set(target.tableName);
        this.ticketID.set(this.changeSrcTicketID());
        this.changeTableMode.set(false);
        this.busy.set(false);
        this.enterPOS(true);   // legacy RefreshGrid(true): clears payments + full reload
        this.toast('success', 'Table Changed', `Bill moved to ${target.tableName}`);
      },
      error: () => {
        this.busy.set(false);
        this.toast('error', 'Error', 'Table change failed');
        this.cancelChangeTable();
      }
    });
  }

  /** Abort change-table mode and return to the original bill. */
  cancelChangeTable() {
    this.locationIDBilling.set(this.changeSrcBilling());
    this.locationIDBillingName.set(this.changeSrcBillingName());
    this.tableID.set(this.changeSrcTableID());
    this.tableName.set(this.changeSrcTableName());
    this.ticketID.set(this.changeSrcTicketID());
    this.changeTableMode.set(false);
    this.enterPOS();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHIFT END — enter cash-in-hand amount, confirm, call SP
  // ─────────────────────────────────────────────────────────────────────────
  shiftEnd() {
    const buf = this.numpadBuffer().trim();
    const amount = buf ? parseFloat(buf) : null;
    if (amount === null || isNaN(amount)) {
      this.toast('warn', 'Shift End', 'Enter cash-in-hand amount on numpad first');
      return;
    }
    const sess = this.session()!;
    this.confirmSvc.confirm({
      message: `End shift? Cash in hand: ${amount.toFixed(this.decimalPlaces())}`,
      accept: () => {
        this.busy.set(true);
        this.txSvc.shiftEnd({
          locationID: sess.locationId,
          cashierID: sess.cashierId,
          locationIDBilling: this.locationIDBilling(),
          amount,
          dayEnd: new Date().toISOString(),
          unitNo: sess.unitNo
        }).subscribe({
          next: () => {
            this.busy.set(false);
            this.numpadClear();
            this.showMore.set(false);
            this.toast('success', 'Shift End', 'Shift closed successfully');
          },
          error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to end shift'); }
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  signOut() { this.auth.signOut(); }

  formatCurrency(v: number) { return v.toFixed(this.decimalPlaces()); }

  private formatReceipt(cfg: SysConfig): string {
    const loc = String(cfg.locationID).padStart(3, '0');
    const unit = String(cfg.unitNo).padStart(2, '0');
    const rcpt = String(cfg.receipt).padStart(5, '0');  // SP @Receipt is varchar(10): loc(3)+unit(2)+rcpt(5)
    return `${loc}${unit}${rcpt}`;
  }

  private toast(severity: string, summary: string, detail: string, life = 3000) {
    this.msgSvc.add({ severity, summary, detail, life });
  }
}
