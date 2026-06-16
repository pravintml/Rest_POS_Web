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
import { OrderLineDto } from '../../core/models/transaction.models';
import { PayTypeDto, PaymentLineDto, SuspendListItem, AddPaymentRequest } from '../../core/models/payment.models';
import {
  BillingLocation, TableInfo, Steward, TicketInfo
} from '../../core/models/master.models';

import { DiscountDialogComponent, DiscountResult } from './dialogs/discount-dialog.component';
import { PaymentDialogComponent, PaymentDialogContext } from './dialogs/payment-dialog.component';
import { SuspendDialogComponent, SuspendDialogMode } from './dialogs/suspend-dialog.component';
import { ReceiptComponent, ReceiptData } from './receipt/receipt.component';
import { ProductBrowserComponent } from './browser/product-browser.component';

type SelectionStage = 'location' | 'tables' | 'tickets' | 'steward' | 'pos';

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
    ProductBrowserComponent
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
  readonly itemCount = computed(() => this.orderItems().reduce((s, i) => s + i.qty, 0));
  readonly selectedLine = computed(() =>
    this.orderItems().find(i => i.rowNo === this.selectedRowNo()) ?? null
  );

  // ── Dialog state ─────────────────────────────────────────────────────────
  showDiscount = false;
  showPayment = false;
  showSuspend = false;
  showReceipt = false;
  suspendMode: SuspendDialogMode = 'suspend';

  // ── Mobile bill toggle ────────────────────────────────────────────────────
  showBillMobile = signal(false);
  toggleBillMobile() { this.showBillMobile.update(v => !v); }

  // ── More panel toggle ─────────────────────────────────────────────────────
  showMore = signal(false);

  payTypes = signal<PayTypeDto[]>([]);
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
    this.loadBill();
    setTimeout(() => this.codeInput?.nativeElement?.focus(), 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bill load
  // ─────────────────────────────────────────────────────────────────────────
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
        this.loadBill();
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
            this.loadBill();
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
      next: () => { this.busy.set(false); this.loadBill(); this.toast('info', 'Qty decreased', line.descrip); },
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
      next: () => { this.busy.set(false); this.numpadClear(); this.loadBill(); this.toast('success', 'Split', `${qty} split off`); },
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
  // Remove discount from selected line
  // ─────────────────────────────────────────────────────────────────────────
  removeDiscount() {
    const line = this.selectedLine();
    if (!line) { this.toast('warn', 'Select Item', 'Please select an item first'); return; }
    const sess = this.session()!;
    this.busy.set(true);
    this.txSvc.removeDiscount({
      locationID: sess.locationId,
      productCode: line.productCode,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID(),
      ticketID: this.ticketID(),
      rowNo: line.rowNo
    }).subscribe({
      next: () => { this.busy.set(false); this.loadBill(); this.toast('info', 'Discount Removed', line.descrip); },
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
      next: () => { this.busy.set(false); this.numpadClear(); this.loadBill(); this.toast('success', 'Price Changed', line.descrip); },
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
  // Discount
  // ─────────────────────────────────────────────────────────────────────────
  openDiscount() {
    if (!this.selectedLine()) { this.toast('warn', 'Select Item', 'Please select an item to discount'); return; }
    this.showDiscount = true;
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
      next: () => { this.busy.set(false); this.loadBill(); this.toast('success', 'Discount', 'Applied'); },
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
      amount: this.billTotal(),
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
      next: () => { this.busy.set(false); this.loadBill(); this.toast('success', 'Recalled', `Invoice recalled`); },
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
      billTotal: this.billTotal(),
      decimalPoints: this.decimalPlaces()
    });
    this.paymentLines.set([]);
    this.showPayment = true;
  }

  onTenderAdded(req: AddPaymentRequest) {
    this.paySvc.addPayment(req).subscribe({
      next: () => {
        const ctx = this.paymentCtx()!;
        this.paySvc.getPaymentSummary(
          ctx.locationIDBilling, ctx.tableID, ctx.ticketID,
          ctx.receipt, ctx.billTotal
        ).subscribe({
          next: summary => this.paymentLines.set(summary.lines),
          error: () => {}
        });
        this.toast('success', 'Tender', `${req.descrip}: ${req.amount.toFixed(2)}`, 1200);
      },
      error: () => this.toast('error', 'Error', 'Failed to add payment')
    });
  }

  onTenderCleared() {
    const ctx = this.paymentCtx()!;
    this.paySvc.clearPayment({
      locationID: ctx.locationID,
      locationIDBilling: ctx.locationIDBilling,
      tableID: ctx.tableID,
      ticketID: ctx.ticketID
    }).subscribe({
      next: () => this.paymentLines.set([]),
      error: () => {}
    });
  }

  onPaymentCompleted() {
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
      amount: this.billTotal(),
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

    this.receiptData.set({
      receiptNo,
      zNo: cfg.zno,
      date: new Date().toLocaleString(),
      cashier: sess.name,
      unitNo: sess.unitNo,
      headerLines,
      footerLines,
      items: this.orderItems(),
      payments,
      billTotal: this.billTotal(),
      totalPaid,
      change: Math.max(0, totalPaid - this.billTotal()),
      decimalPoints: this.decimalPlaces()
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
