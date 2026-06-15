import {
  Component, signal, computed, inject, OnInit, OnDestroy,
  ViewChild, ElementRef, ViewContainerRef
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

import { SysConfig } from '../../core/models/config.models';
import { ProductMaster } from '../../core/models/product.models';
import { OrderLineDto } from '../../core/models/transaction.models';
import { PayTypeDto, PaymentLineDto, SuspendListItem, AddPaymentRequest } from '../../core/models/payment.models';

import { DiscountDialogComponent, DiscountResult } from './dialogs/discount-dialog.component';
import { PaymentDialogComponent, PaymentDialogContext } from './dialogs/payment-dialog.component';
import { SuspendDialogComponent, SuspendDialogMode } from './dialogs/suspend-dialog.component';
import { ReceiptComponent, ReceiptData } from './receipt/receipt.component';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, ProgressSpinnerModule,
    ToastModule, TagModule, DividerModule, BadgeModule, TooltipModule,
    ConfirmDialogModule,
    DiscountDialogComponent, PaymentDialogComponent,
    SuspendDialogComponent, ReceiptComponent
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
  private readonly msgSvc = inject(MessageService);
  private readonly confirmSvc = inject(ConfirmationService);

  @ViewChild('codeInput') codeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('receiptEl') receiptEl!: ElementRef<HTMLDivElement>;

  readonly session = this.auth.session;
  readonly config = this.configSvc.config;
  readonly configLoading = signal(true);
  readonly billLoading = signal(false);
  readonly busy = signal(false);

  // ── Bill state ───────────────────────────────────────────────────────────
  readonly orderItems = signal<OrderLineDto[]>([]);
  readonly billTotal = signal(0);
  readonly selectedRowNo = signal<number | null>(null);

  // ── Input ────────────────────────────────────────────────────────────────
  readonly numpadBuffer = signal('');
  readonly productSearching = signal(false);
  readonly currentTime = signal(new Date());

  // ── Bill context (per-session fixed values) ───────────────────────────────
  readonly locationIDBilling = computed(() => this.session()?.locationId ?? 0);
  readonly tableID = 0;    // 0 = no table (takeaway). Table select = Phase 2 extension
  readonly ticketID = 0;

  // ── Receipt / session ────────────────────────────────────────────────────
  readonly currentReceipt = computed(() => {
    const cfg = this.config();
    if (!cfg) return '';
    return this.formatReceipt(cfg);
  });

  // ── Computed display ─────────────────────────────────────────────────────
  readonly decimalPlaces = computed(() => this.config()?.decimalPointsCurrency ?? 2);
  readonly locationName = computed(() => this.config()?.locationName ?? '');
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

  payTypes = signal<PayTypeDto[]>([]);
  paymentLines = signal<PaymentLineDto[]>([]);
  suspendList = signal<SuspendListItem[]>([]);

  paymentCtx = signal<PaymentDialogContext | null>(null);
  receiptData = signal<ReceiptData | null>(null);

  private timeInterval?: ReturnType<typeof setInterval>;

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.timeInterval = setInterval(() => this.currentTime.set(new Date()), 1000);
    this.configSvc.loadSession().subscribe({
      next: () => {
        this.configLoading.set(false);
        this.loadBill();
        this.loadPayTypes();
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
  // Bill load
  // ─────────────────────────────────────────────────────────────────────────
  loadBill() {
    const cfg = this.config();
    const sess = this.session();
    if (!cfg || !sess) return;
    this.billLoading.set(true);
    this.txSvc.getBill(
      this.locationIDBilling(), this.tableID, this.ticketID,
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
  }
  numpadBackspace() { this.numpadBuffer.update(b => b.slice(0, -1)); }
  numpadClear() { this.numpadBuffer.set(''); }

  onCodeEnter(code: string) {
    this.lookupByCode(code.trim());
    if (this.codeInput) this.codeInput.nativeElement.value = '';
  }

  private lookupByCode(code: string) {
    if (!code) return;
    this.numpadBuffer.set('');
    this.productSearching.set(true);
    const cfg = this.config()!;
    this.productSvc.getByCode(code).subscribe({
      next: p => { this.productSearching.set(false); this.addProduct(p, cfg); },
      error: err => {
        this.productSearching.set(false);
        this.toast('warn', 'Not Found', err.status === 404 ? `Product not found: ${code}` : 'Product lookup failed');
      }
    });
  }

  private addProduct(p: ProductMaster, cfg: SysConfig) {
    const sess = this.session()!;
    const qty = this.numpadBuffer() ? parseFloat(this.numpadBuffer()) : 1;

    const req = {
      locationID: sess.locationId,
      locationIDBilling: this.locationIDBilling(),
      tableID: this.tableID,
      ticketID: this.ticketID,
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
      stewardID: 0,
      stewardName: '',
      currentRowNo: this.orderItems().length,
      tagNo: '',
      mobileNo: ''
    };

    this.busy.set(true);
    this.txSvc.addItem(req).subscribe({
      next: () => {
        this.busy.set(false);
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
              tableID: this.tableID, ticketID: this.ticketID, appUserName: sess.code
            })
          : this.txSvc.errorCorrect({
              locationID: sess.locationId, productID: line.productID,
              qty: line.qty, documentID: line.documentID,
              receipt: this.currentReceipt(), cashierID: sess.cashierId,
              cashier: sess.name, unitNo: sess.unitNo, rowNo: line.rowNo
            });

        voidFn.subscribe({
          next: () => { this.busy.set(false); this.selectedRowNo.set(null); this.loadBill(); this.toast('info', 'Voided', line.descrip); },
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
          tableID: this.tableID, ticketID: this.ticketID
        }).subscribe({
          next: () => { this.busy.set(false); this.orderItems.set([]); this.billTotal.set(0); this.selectedRowNo.set(null); this.toast('info', 'Voided', 'Bill cleared'); },
          error: () => { this.busy.set(false); this.toast('error', 'Error', 'Failed to void bill'); }
        });
      }
    });
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
      tableID: this.tableID,
      ticketID: this.ticketID,
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
      this.txSvc.sendKot({ locationID: sess.locationId, locationIDBilling: this.locationIDBilling(), tableID: this.tableID, ticketID: this.ticketID, orderTerminalID: tid })
    );

    this.busy.set(true);
    let remaining = sends.length;
    sends.forEach(obs => obs.subscribe({
      next: () => { if (--remaining === 0) { this.busy.set(false); this.loadBill(); this.toast('success', 'KOT Sent', `${unprinted.length} item(s) sent to kitchen`); } },
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
      tableID: this.tableID,
      ticketID: this.ticketID,
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
        // Reload payment lines to update dialog
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
    this.paySvc.clearPayment({ locationID: ctx.locationID, locationIDBilling: ctx.locationIDBilling, tableID: ctx.tableID, ticketID: ctx.ticketID }).subscribe({
      next: () => this.paymentLines.set([]),
      error: () => {}
    });
  }

  onPaymentCompleted() {
    const sess = this.session()!;
    const ctx = this.paymentCtx()!;
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
      tableID: this.tableID,
      ticketID: this.ticketID
    }).subscribe({
      next: result => {
        this.busy.set(false);
        this.prepareReceipt(result.receiptNo, cfg);
        this.orderItems.set([]);
        this.billTotal.set(0);
        this.showReceipt = true;
        // Reload config to get updated receipt counter
        this.configSvc.loadSession().subscribe();
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

  printReceipt() {
    window.print();
  }

  closeReceipt() {
    this.showReceipt = false;
    this.receiptData.set(null);
    this.paymentLines.set([]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  signOut() { this.auth.signOut(); }

  formatCurrency(v: number) { return v.toFixed(this.decimalPlaces()); }

  private formatReceipt(cfg: SysConfig): string {
    const loc = String(cfg.locationID).padStart(3, '0');
    const unit = String(cfg.unitNo).padStart(2, '0');
    const rcpt = String(cfg.receipt).padStart(7, '0');
    return `${loc}${unit}${rcpt}`;
  }

  private toast(severity: string, summary: string, detail: string, life = 3000) {
    this.msgSvc.add({ severity, summary, detail, life });
  }
}
