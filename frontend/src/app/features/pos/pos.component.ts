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
import { OrderLineDto, ItemCommentRequest, ServiceChargeUpdateRequest } from '../../core/models/transaction.models';
import { PayTypeDto, PaymentLineDto, SuspendListItem } from '../../core/models/payment.models';
import {
  BillingLocation, TableInfo, Steward, TicketInfo
} from '../../core/models/master.models';

import { DiscountDialogComponent, DiscountResult } from './dialogs/discount-dialog.component';
import { PaymentDialogComponent, PaymentDialogContext } from './dialogs/payment-dialog.component';
import { SuspendDialogComponent, SuspendDialogMode } from './dialogs/suspend-dialog.component';
import { ReceiptComponent, ReceiptData } from './receipt/receipt.component';
import { ProductBrowserComponent } from './browser/product-browser.component';
import { MenuReportDialogComponent } from './dialogs/menu-report-dialog.component';

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
    ProductBrowserComponent, MenuReportDialogComponent
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

  // ── Discount level (1-5 = line discount tier, 0 = default) ───────────────
  discountLevelId = signal(0);
  showDiscountLevelPicker = signal(false);
  readonly discountLevelLabel = computed(() => {
    const lvl = this.discountLevelId();
    return lvl === 0 ? 'DISC LEVEL' : `DISC LVL ${lvl}`;
  });

  // ── Merge table overlay ────────────────────────────────────────────────────
  showMergeOverlay = signal(false);
  mergeStage = signal<'tables' | 'tickets'>('tables');
  mergeTables = signal<import('../../core/models/master.models').TableInfo[]>([]);
  mergeSourceTickets = signal<import('../../core/models/master.models').TicketInfo[]>([]);
  mergeSelectedTable = signal<import('../../core/models/master.models').TableInfo | null>(null);

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

  private loadTables(billingLocationId: number) {
    this.selectionLoading.set(true);
    this.masterSvc.getTables(billingLocationId).subscribe({
      next: list => {
        this.tables.set(list);
        this.selectionLoading.set(false);
        // Auto-select if only 1 table AND only 1 billing location (mirrors legacy)
        if (list.length === 1 && this.billingLocations().length === 1) {
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
    this.ticketID.set(ticket.ticketID);
    this.stewardId.set(ticket.stewardID);
    this.stewardName.set(ticket.stewardName);
    this.proceedAfterTicket(false);
  }

  onNewTicketForTable() {
    this.masterSvc.allocateTicket().subscribe({
      next: res => {
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

  private enterPOS() {
    this.selectionStage.set('pos');
    this.refreshBill();
    setTimeout(() => this.codeInput?.nativeElement?.focus(), 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bill load
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Recalculate service charge (if configured > 0), then reload the bill.
   * Mirrors legacy RefreshGrid(isUpdateServiceCharge=true).
   * Used after any operation that changes the bill total.
   */
  private refreshBill() {
    const cfg = this.config();
    const sess = this.session();
    if (cfg && cfg.serviceCharge > 0 && this.ticketID() !== 0 && sess) {
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
  // Reprint last invoice
  // ─────────────────────────────────────────────────────────────────────────
  reprintInvoice() {
    if (this.receiptData()) {
      this.showReceipt = true;
    } else {
      this.toast('warn', 'Reprint', 'No recent invoice to reprint');
    }
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
      cashierName: sess.name
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
    // Return to table selection after completing a bill
    this.resetToTables();
  }

  resetToTables() {
    this.tableID.set(0);
    this.tableName.set('');
    this.ticketID.set(0);
    this.stewardId.set(0);
    this.stewardName.set('');
    this.selectedRowNo.set(null);
    this.selectionStage.set('tables');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMMENT — get existing comment, prompt user, save
  // ─────────────────────────────────────────────────────────────────────────
  openComment() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item first'); return; }
    const sess = this.session()!;
    this.txSvc.getItemComment(
      this.locationIDBilling(), this.tableID(), this.ticketID(),
      line.rowNo, line.productID
    ).subscribe({
      next: res => {
        const text = window.prompt('Item comment:', res.comment);
        if (text === null) return;
        this.busy.set(true);
        this.txSvc.updateItemComment({
          locationID: sess.locationId,
          locationIDBilling: this.locationIDBilling(),
          tableID: this.tableID(),
          ticketID: this.ticketID(),
          rowNo: line.rowNo,
          productID: line.productID,
          itemComment: text
        }).subscribe({
          next: () => { this.busy.set(false); this.loadBill(); this.toast('success', 'Comment', 'Saved'); },
          error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to save comment'); }
        });
      },
      error: () => this.toast('error', 'Error', 'Could not load comment')
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TAG — use numpad value or prompt
  // ─────────────────────────────────────────────────────────────────────────
  updateTag() {
    const buf = this.numpadBuffer().trim();
    const tagNo = (buf || window.prompt('Tag No:', '')) ?? '';
    if (!tagNo) return;
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
  // MOBILE NO — use numpad value or prompt
  // ─────────────────────────────────────────────────────────────────────────
  updateMobileNo() {
    const buf = this.numpadBuffer().trim();
    const mobileNo = (buf || window.prompt('Mobile No:', '')) ?? '';
    if (!mobileNo) return;
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
                this.refreshBill();
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
  // MERGE — merge another ticket's items into the current one
  // ─────────────────────────────────────────────────────────────────────────
  openMerge() {
    this.selectionLoading.set(true);
    this.masterSvc.getTables(this.locationIDBilling()).subscribe({
      next: list => {
        this.selectionLoading.set(false);
        this.mergeTables.set(list);
        this.mergeStage.set('tables');
        this.showMergeOverlay.set(true);
      },
      error: () => { this.selectionLoading.set(false); this.toast('error', 'Error', 'Could not load tables'); }
    });
  }

  onMergeTableSelected(table: import('../../core/models/master.models').TableInfo) {
    this.mergeSelectedTable.set(table);
    this.selectionLoading.set(true);
    this.masterSvc.getTickets(this.locationIDBilling(), table.tableID).subscribe({
      next: tickets => {
        this.selectionLoading.set(false);
        // Exclude the current ticket
        const filtered = tickets.filter(t => t.ticketID !== this.ticketID() || table.tableID !== this.tableID());
        if (filtered.length === 0) { this.toast('warn', 'No Tickets', 'No other open tickets on this table'); return; }
        this.mergeSourceTickets.set(filtered);
        this.mergeStage.set('tickets');
      },
      error: () => { this.selectionLoading.set(false); this.toast('error', 'Error', 'Could not load tickets'); }
    });
  }

  onMergeTicketSelected(ticket: import('../../core/models/master.models').TicketInfo) {
    const src = this.mergeSelectedTable()!;
    const sess = this.session()!;
    this.showMergeOverlay.set(false);

    this.confirmSvc.confirm({
      message: `Merge ticket #${ticket.ticketID} from ${src.tableName} into the current bill?`,
      accept: () => {
        this.busy.set(true);
        this.txSvc.mergeTable({
          locationID: sess.locationId,
          cashierID: sess.cashierId,
          locationIDBilling: this.locationIDBilling(),
          tableID: this.tableID(),
          ticketID: this.ticketID(),
          tableIDToBeMerged: src.tableID,
          locationIDBillingToBeMerged: this.locationIDBilling(),
          ticketIDToBeMerged: ticket.ticketID
        }).subscribe({
          next: () => { this.busy.set(false); this.refreshBill(); this.toast('success', 'Merged', `Ticket #${ticket.ticketID} merged in`); },
          error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to merge table'); }
        });
      }
    });
  }

  closeMergeOverlay() { this.showMergeOverlay.set(false); }

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
