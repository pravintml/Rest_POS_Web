import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  signal, computed, inject, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PaymentService } from '../../../core/services/payment.service';
import { PayTypeDto, PaymentLineDto, AddPaymentRequest } from '../../../core/models/payment.models';
import { OrderLineDto } from '../../../core/models/transaction.models';

export interface PaymentDialogContext {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  receipt: string;
  unitNo: number;
  cashierID: number;
  billTypeID: number;
  saleTypeID: number;
  billTotal: number;
  decimalPoints: number;
  tableName: string;
  cashierName: string;
}

// Emitted when sale is complete, carrying the finalized tender lines
export type PaymentCompleteEvent = PaymentLineDto[];

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  template: `
<p-toast position="top-center" />

@if (visible) {
<div class="pay-screen">

  <!-- ══ LEFT: Bill panel ════════════════════════════════════════════ -->
  <div class="pay-bill">
    <div class="bill-header">
      <div class="bh-table"><i class="pi pi-table"></i> {{ ctx?.tableName || 'Table ' + ctx?.tableID }}</div>
      <div class="bh-cashier"><i class="pi pi-user"></i> {{ ctx?.cashierName }}</div>
      <div class="bh-receipt">R# {{ ctx?.receipt }}</div>
    </div>

    <div class="bill-scroll">
      <!-- Original items -->
      @for (item of orderItems; track item.rowNo) {
        @if (item.documentID !== 5) {
          <div class="bill-row item-row">
            <span class="br-desc">
              {{ item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(3) }}&nbsp;{{ item.descrip }}
            </span>
            <span class="br-amt">{{ item.nett | number:'1.' + dp() + '-' + dp() }}</span>
          </div>
        }
      }
      <!-- Bill subtotal (= bill total before any payments) -->
      <div class="bill-row subtotal-row">
        <span>SUB TOTAL</span>
        <span>{{ _billTotal() | number:'1.' + dp() + '-' + dp() }}</span>
      </div>

      <!-- Running tenders with subtotal after each -->
      @for (entry of runningBill(); track $index) {
        <div class="bill-row tender-row">
          <span class="br-desc">{{ entry.descrip }}{{ entry.refNo ? ' ' + entry.refNo : '' }}</span>
          <span class="br-amt">{{ entry.amount | number:'1.' + dp() + '-' + dp() }}</span>
        </div>
        <div class="bill-row subtotal-row">
          <span>SUB TOTAL</span>
          <span [class.zero-bal]="entry.remaining <= 0">{{ entry.remaining | number:'1.' + dp() + '-' + dp() }}</span>
        </div>
      }
    </div>

    <!-- Total + Change footer -->
    <div class="bill-footer">
      <div class="bill-total-row" [class.balanced]="balance() <= 0">
        <span>TOTAL</span>
        <span>{{ balance() | number:'1.' + dp() + '-' + dp() }}</span>
      </div>
      @if (change() > 0) {
        <div class="bill-change-row">
          <span>CHANGE</span>
          <span>{{ change() | number:'1.' + dp() + '-' + dp() }}</span>
        </div>
      }
    </div>
  </div>

  <!-- ══ CENTER: Pay types + Denomination notes ════════════════════════ -->
  <div class="pay-center">

    <!-- Pay type buttons -->
    <div class="pay-types-area">
      @for (pt of payTypes(); track pt.payTypeID) {
        <button class="pt-btn"
          [class.pt-selected]="selectedPayType()?.payTypeID === pt.payTypeID"
          [class.pt-card]="pt.type === 1"
          [class.pt-other]="pt.type === 6"
          (click)="onPayTypeClick(pt)"
          [disabled]="busy()">
          {{ pt.payTypeName }}
        </button>
      }
    </div>

    <!-- Denomination note buttons -->
    <div class="pay-notes-area">
      @for (n of notesList; track n) {
        <button class="note-btn" (click)="onNoteClick(n)" [disabled]="busy()">
          {{ n | number:'1.0-0' }}
        </button>
      }
    </div>

  </div>

  <!-- ══ RIGHT: Numpad ══════════════════════════════════════════════════ -->
  <div class="pay-numpad">

    <!-- RefNo panel (shown for card types) -->
    @if (refNoMode()) {
      <div class="refno-panel">
        <div class="refno-label">
          <i class="pi pi-credit-card"></i>
          {{ pendingPayType()?.payTypeName }} — REF NO
        </div>
        <input #refInput type="text" class="refno-input"
          [(ngModel)]="refNoInput"
          placeholder="Approval code / last 4 digits"
          maxlength="20"
          (keyup.enter)="confirmRefNo()"
          autofocus />
        <div class="refno-actions">
          <button class="rn-btn rn-cancel" (click)="cancelRefNo()">CANCEL</button>
          <button class="rn-btn rn-confirm" (click)="confirmRefNo()"
            [disabled]="!refNoInput.trim()">CONFIRM</button>
        </div>
      </div>
    }

    <!-- Amount display -->
    <div class="pay-display-row">
      <div class="pay-display">{{ displayValue() }}</div>
      <button class="np-key np-c" (click)="numpadClear()" [disabled]="busy()">C</button>
    </div>

    <!-- Numpad grid: 3×3 + bottom row -->
    <div class="np-grid">
      @for (k of numKeys; track k) {
        <button class="np-key" (click)="numpadPress(k)" [disabled]="busy()">{{ k }}</button>
      }
      <button class="np-key" (click)="numpadPress('.')" [disabled]="busy()">.</button>
      <button class="np-key np-zero" (click)="numpadPress('0')" [disabled]="busy()">0</button>
      <button class="np-key" (click)="numpadPress('00')" [disabled]="busy()">00</button>
      <button class="np-key np-back" (click)="numpadBackspace()" [disabled]="busy()">
        <i class="pi pi-delete-left"></i>
      </button>
      <!-- S = settle with selected pay type -->
      <button class="np-key np-settle" (click)="settleKey()"
        [disabled]="busy() || !selectedPayType()">
        S
      </button>
    </div>

    <!-- Footer: Cancel + KEY -->
    <div class="pay-footer-btns">
      <button class="pay-cancel-btn" (click)="cancelPayment()" [disabled]="busy()">
        CANCEL
      </button>
      <button class="pay-key-btn"
        (click)="keyComplete()"
        [disabled]="busy() || balance() > 0 || lines().length === 0">
        KEY
      </button>
    </div>

  </div><!-- end numpad -->

</div><!-- end pay-screen -->
}
  `,
  styles: [`
    /* ── Full-screen overlay ─────────────────────────────────────── */
    .pay-screen {
      position: fixed; inset: 0; z-index: 1000;
      display: grid;
      grid-template-columns: 28% 1fr 24%;
      background: #0f1117;
      color: #e0e0e0;
      font-family: 'Cambria', Georgia, serif;
      overflow: hidden;
    }

    /* ── Bill panel (left) ───────────────────────────────────────── */
    .pay-bill {
      display: flex; flex-direction: column;
      background: #161c25; border-right: 1px solid #2a3244;
      overflow: hidden;
    }
    .bill-header {
      padding: 0.6rem 0.75rem; background: #1e2634; border-bottom: 1px solid #2a3244;
      font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.2rem;
    }
    .bh-table  { font-size: 0.95rem; font-weight: 700; color: #7dd3fc; }
    .bh-cashier { color: #94a3b8; }
    .bh-receipt { color: #64748b; font-size: 0.72rem; }

    .bill-scroll { flex: 1; overflow-y: auto; padding: 0.25rem 0; }

    .bill-row {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 0.18rem 0.65rem; font-size: 0.78rem;
    }
    .item-row { color: #cbd5e1; }
    .item-row .br-desc { flex: 1; margin-right: 0.5rem; word-break: break-word; }
    .item-row .br-amt { white-space: nowrap; font-weight: 500; }
    .tender-row { color: #93c5fd; font-weight: 600; }
    .subtotal-row {
      color: #64748b; font-size: 0.72rem; font-style: italic;
      border-bottom: 1px dotted #2a3244; margin-bottom: 0.15rem; padding-bottom: 0.18rem;
    }
    .subtotal-row .zero-bal { color: #4ade80; font-weight: 700; }

    .bill-footer { border-top: 2px solid #334155; padding: 0.4rem 0.65rem; }
    .bill-total-row {
      display: flex; justify-content: space-between;
      font-size: 1.05rem; font-weight: 700; color: #f59e0b;
    }
    .bill-total-row.balanced { color: #4ade80; }
    .bill-change-row {
      display: flex; justify-content: space-between;
      font-size: 0.9rem; font-weight: 600; color: #818cf8; margin-top: 0.2rem;
    }

    /* ── Center: Pay types + Notes ───────────────────────────────── */
    .pay-center {
      display: flex; flex-direction: column; overflow: hidden;
      border-right: 1px solid #2a3244;
    }
    .pay-types-area {
      flex: 1; display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 1fr;
      gap: 5px; padding: 10px; overflow-y: auto;
    }
    .pt-btn {
      width: 100%; height: 100%;
      padding: 0.4rem; border: none; border-radius: 5px;
      background: #1e3a5f; color: #bde0ff; font-weight: 700;
      font-size: 0.78rem; cursor: pointer; transition: all 0.12s;
      text-align: center; letter-spacing: 0.02em; min-height: 3rem;
    }
    .pt-btn:hover:not(:disabled) { background: #2563eb; color: #fff; }
    .pt-btn.pt-selected { background: #16a34a; color: #fff; box-shadow: 0 0 0 2px #4ade80; }
    .pt-btn.pt-card { background: #1e1b4b; color: #a5b4fc; }
    .pt-btn.pt-card.pt-selected { background: #4f46e5; color: #fff; }
    .pt-btn.pt-other { background: #431407; color: #fdba74; }
    .pt-btn.pt-other.pt-selected { background: #c2410c; color: #fff; }
    .pt-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .pay-notes-area {
      display: grid; grid-template-columns: repeat(4, 1fr);
      grid-auto-rows: 1fr;
      gap: 5px; padding: 10px; border-top: 1px solid #2a3244; background: #111827;
    }
    .note-btn {
      width: 100%; height: 100%;
      padding: 0.4rem; border: 1px solid #334155; border-radius: 4px;
      background: #1e2634; color: #94a3b8; font-weight: 700; font-size: 0.82rem;
      cursor: pointer; text-align: center; transition: all 0.1s; min-height: 2.6rem;
    }
    .note-btn:hover:not(:disabled) { background: #0f766e; color: #fff; border-color: #14b8a6; }
    .note-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── Right: Numpad ───────────────────────────────────────────── */
    .pay-numpad {
      display: flex; flex-direction: column; padding: 10px; gap: 8px;
      background: #0f172a;
    }

    /* RefNo panel */
    .refno-panel {
      background: #1e1b4b; border: 1px solid #4f46e5; border-radius: 8px;
      padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;
    }
    .refno-label { font-size: 0.8rem; color: #a5b4fc; font-weight: 700; }
    .refno-input {
      background: #0f0f1a; border: 1px solid #4f46e5; border-radius: 4px;
      color: #e0e0ff; font-size: 1.1rem; padding: 0.45rem 0.6rem; width: 100%;
      outline: none; letter-spacing: 0.08em;
    }
    .refno-input:focus { border-color: #818cf8; box-shadow: 0 0 0 2px #4f46e533; }
    .refno-actions { display: flex; gap: 6px; }
    .rn-btn { flex: 1; padding: 0.45rem; border: none; border-radius: 4px; font-weight: 700;
      font-size: 0.8rem; cursor: pointer; }
    .rn-cancel { background: #374151; color: #d1d5db; }
    .rn-confirm { background: #4f46e5; color: #fff; }
    .rn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Amount display */
    .pay-display-row { display: flex; gap: 6px; align-items: center; }
    .pay-display {
      flex: 1; background: #1e2634; border: 1px solid #334155; border-radius: 5px;
      padding: 0.5rem 0.75rem; font-size: 1.6rem; font-weight: 700;
      text-align: right; color: #fbbf24; letter-spacing: 0.04em;
      min-height: 3rem; display: flex; align-items: center; justify-content: flex-end;
    }
    .np-c {
      background: #7f1d1d; color: #fca5a5; border: none; border-radius: 5px;
      font-size: 0.95rem; font-weight: 700; padding: 0 0.75rem; cursor: pointer;
    }
    .np-c:disabled { opacity: 0.4; }

    /* Numpad grid */
    .np-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 5px; flex: 1;
    }
    .np-key {
      background: #1e2634; color: #e2e8f0; border: 1px solid #334155;
      border-radius: 5px; font-size: 1.1rem; font-weight: 600; cursor: pointer;
      padding: 0.65rem 0; transition: background 0.1s; aspect-ratio: unset;
      min-height: 3rem;
    }
    .np-key:hover:not(:disabled) { background: #263352; }
    .np-key:active:not(:disabled) { background: #1d4ed8; }
    .np-key:disabled { opacity: 0.35; cursor: not-allowed; }
    .np-zero { grid-column: span 1; }
    .np-back { background: #1c1917; color: #f97316; }
    .np-settle {
      background: #1e3a5f; color: #7dd3fc; font-weight: 800;
      font-size: 1.2rem; letter-spacing: 0.05em;
    }
    .np-settle:disabled { opacity: 0.3; }

    /* Footer buttons */
    .pay-footer-btns { display: flex; gap: 8px; margin-top: auto; }
    .pay-cancel-btn, .pay-key-btn {
      flex: 1; padding: 0.75rem; border: none; border-radius: 6px;
      font-size: 0.9rem; font-weight: 700; cursor: pointer; letter-spacing: 0.05em;
    }
    .pay-cancel-btn { background: #374151; color: #d1d5db; }
    .pay-cancel-btn:hover:not(:disabled) { background: #4b5563; }
    .pay-key-btn { background: #16a34a; color: #fff; }
    .pay-key-btn:hover:not(:disabled) { background: #15803d; }
    .pay-cancel-btn:disabled, .pay-key-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  `]
})
export class PaymentDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() ctx: PaymentDialogContext | null = null;
  @Input() payTypeList: PayTypeDto[] = [];
  @Input() notesList: number[] = [];
  @Input() orderItems: OrderLineDto[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() completed = new EventEmitter<PaymentLineDto[]>();

  @ViewChild('refInput') refInputRef?: ElementRef<HTMLInputElement>;

  private readonly paySvc = inject(PaymentService);
  private readonly msgSvc = inject(MessageService);

  readonly numKeys = ['7','8','9','4','5','6','1','2','3'];

  // ── Reactive state ─────────────────────────────────────────────────────
  readonly lines       = signal<PaymentLineDto[]>([]);
  readonly payTypes    = signal<PayTypeDto[]>([]);
  readonly selectedPayType = signal<PayTypeDto | null>(null);
  readonly pendingPayType  = signal<PayTypeDto | null>(null);  // card type waiting for refNo
  readonly refNoMode   = signal(false);
  readonly busy        = signal(false);
  readonly numpadStr   = signal('');

  // billTotal mirrored into a signal so computed() can track it reactively
  protected readonly _billTotal = signal(0);

  refNoInput = '';

  // ── Computed ────────────────────────────────────────────────────────────
  readonly dp = computed(() => this.ctx?.decimalPoints ?? 2);

  readonly totalPaid = computed(() =>
    this.lines().reduce((s, l) => s + l.amount, 0));

  readonly balance = computed(() =>
    Math.max(0, this._billTotal() - this.totalPaid()));

  readonly change = computed(() =>
    Math.max(0, this.totalPaid() - this._billTotal()));

  readonly runningBill = computed(() => {
    let remaining = this._billTotal();
    return this.lines().map(line => {
      remaining = Math.max(0, remaining - line.amount);
      return { ...line, remaining };
    });
  });

  readonly displayValue = computed(() => {
    const s = this.numpadStr();
    if (!s) return '0';
    return s;
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges) {
    // Update _billTotal signal BEFORE reset() so balance() computes correctly
    if (changes['ctx'] && this.ctx) {
      this._billTotal.set(this.ctx.billTotal);
    }
    if (changes['payTypeList']) {
      this.payTypes.set(this.payTypeList);
    }
    if (changes['visible'] && this.visible) {
      this.reset();
    }
  }

  // ── Numpad ──────────────────────────────────────────────────────────────
  numpadPress(key: string) {
    const s = this.numpadStr();
    if (key === '.') {
      if (s.includes('.')) return;
      this.numpadStr.set(s ? s + '.' : '0.');
      return;
    }
    if (key === '00') {
      if (!s || s === '0') return;
      this.numpadStr.set(s + '00');
      return;
    }
    // Regular digit
    if (s === '0') { this.numpadStr.set(key); return; }
    this.numpadStr.set(s + key);
  }

  numpadBackspace() {
    const s = this.numpadStr();
    this.numpadStr.set(s.length <= 1 ? '' : s.slice(0, -1));
  }

  numpadClear() { this.numpadStr.set(''); }

  // ── Pay type click ──────────────────────────────────────────────────────
  onPayTypeClick(pt: PayTypeDto) {
    this.selectedPayType.set(pt);

    if (pt.type === 1) {
      // Card: collect RefNo first
      this.pendingPayType.set(pt);
      this.refNoInput = '';
      this.refNoMode.set(true);
      setTimeout(() => this.refInputRef?.nativeElement?.focus(), 60);
    } else {
      // Cash / Other: submit immediately
      this.submitTender(pt, '');
    }
  }

  // ── Denomination note click ─────────────────────────────────────────────
  // Legacy: adds the note value to the display then immediately submits as CASH
  onNoteClick(note: number) {
    const current = parseFloat(this.numpadStr() || '0');
    const newAmount = current + note;
    this.numpadStr.set(newAmount.toString());

    const cashPt = this.payTypes().find(p => p.payTypeID === 1)
      ?? this.payTypes().find(p => p.type === 0);
    if (cashPt) {
      this.selectedPayType.set(cashPt);
      this.submitTender(cashPt, '');
    }
  }

  // ── S key: settle with selected pay type ────────────────────────────────
  settleKey() {
    const pt = this.selectedPayType();
    if (!pt) return;
    if (pt.type === 1) {
      this.pendingPayType.set(pt);
      this.refNoInput = '';
      this.refNoMode.set(true);
      setTimeout(() => this.refInputRef?.nativeElement?.focus(), 60);
    } else {
      this.submitTender(pt, '');
    }
  }

  // ── RefNo dialog actions ────────────────────────────────────────────────
  confirmRefNo() {
    const ref = this.refNoInput.trim();
    if (!ref) return;
    const pt = this.pendingPayType();
    if (!pt) return;
    this.refNoMode.set(false);
    this.submitTender(pt, ref);
  }

  cancelRefNo() {
    this.refNoMode.set(false);
    this.pendingPayType.set(null);
    this.selectedPayType.set(null);
    this.refNoInput = '';
  }

  // ── KEY button: manual complete (balance already 0) ─────────────────────
  keyComplete() {
    if (this.balance() > 0 || this.lines().length === 0) return;
    this.completed.emit(this.lines());
    this.closeOverlay();
  }

  // ── Cancel: clear all tenders and close ─────────────────────────────────
  cancelPayment() {
    const ctx = this.ctx;
    if (!ctx) { this.closeOverlay(); return; }
    this.paySvc.clearPayment({
      locationID: ctx.locationID,
      locationIDBilling: ctx.locationIDBilling,
      tableID: ctx.tableID,
      ticketID: ctx.ticketID
    }).subscribe({ error: () => {} });
    this.closeOverlay();
  }

  // ── Core submit logic ───────────────────────────────────────────────────
  private submitTender(pt: PayTypeDto, refNo: string) {
    const ctx = this.ctx;
    if (!ctx || this.busy()) return;

    const remaining = this.balance();

    // Parse amount from numpad; default to remaining balance when display is empty
    const rawAmount = parseFloat(this.numpadStr() || '0') || remaining;

    // Validation
    if (rawAmount <= 0) {
      this.msgSvc.add({ severity: 'warn', summary: 'Payment', detail: 'Enter a valid amount' });
      return;
    }
    // Cards (Type=1) and others (Type=6): amount must not exceed remaining
    if (pt.type !== 0 && rawAmount > remaining) {
      this.msgSvc.add({
        severity: 'warn', summary: 'Payment',
        detail: `Amount exceeds balance for ${pt.payTypeName}`
      });
      return;
    }

    // For CASH overpayment: store full amount; balance rounds down to 0
    const storedAmount = rawAmount;
    const newBalance = Math.max(0, remaining - storedAmount);

    const req: AddPaymentRequest = {
      locationID: ctx.locationID,
      receipt: ctx.receipt,
      unitNo: ctx.unitNo,
      billTypeID: ctx.billTypeID,
      saleTypeID: ctx.saleTypeID,
      cashierID: ctx.cashierID,
      payTypeID: pt.payTypeID,
      amount: storedAmount,
      balance: newBalance,
      refNo,
      bankID: pt.type === 1 ? 1 : 0,
      terminalID: pt.type === 1 ? 1 : 0,
      chequeDate: null,
      isRecallAdv: false,
      recallNo: '',
      descrip: pt.payTypeName,
      enCodeName: '',
      locationIDBilling: ctx.locationIDBilling,
      tableID: ctx.tableID,
      ticketID: ctx.ticketID
    };

    this.busy.set(true);
    this.paySvc.addPayment(req).subscribe({
      next: () => {
        // Refresh tender lines from backend
        this.paySvc.getPaymentSummary(
          ctx.locationIDBilling, ctx.tableID, ctx.ticketID, ctx.receipt, ctx.billTotal
        ).subscribe({
          next: summary => {
            this.lines.set(summary.lines);
            this.numpadStr.set('');
            this.selectedPayType.set(null);
            this.busy.set(false);

            // ── Auto-complete when balance reaches zero ──
            if (this.balance() <= 0) {
              this.completed.emit(summary.lines);
              this.closeOverlay();
            }
          },
          error: () => {
            this.busy.set(false);
            this.msgSvc.add({ severity: 'error', summary: 'Error', detail: 'Failed to refresh payment' });
          }
        });
      },
      error: () => {
        this.busy.set(false);
        this.msgSvc.add({ severity: 'error', summary: 'Error', detail: 'Failed to add payment' });
      }
    });
  }

  private reset() {
    this.lines.set([]);
    this.numpadStr.set('');
    this.selectedPayType.set(null);
    this.pendingPayType.set(null);
    this.refNoMode.set(false);
    this.refNoInput = '';
    this.busy.set(false);
  }

  private closeOverlay() {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
