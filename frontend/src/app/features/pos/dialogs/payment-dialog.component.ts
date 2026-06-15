import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PayTypeDto, PaymentLineDto, AddPaymentRequest } from '../../../core/models/payment.models';

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
}

export interface PaymentCompleteEvent {
  finalAmount: number;
  change: number;
  tenders: AddPaymentRequest[];
  receiptNo: string;
}

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputNumberModule, DividerModule, BadgeModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast position="top-center" />
    <p-dialog [(visible)]="visible" [modal]="true" [closable]="true"
              (onHide)="onCancel()" header="Payment"
              [style]="{ width: '520px', maxWidth: '98vw' }" [draggable]="false">

      <div class="pay-body">
        <!-- Bill total -->
        <div class="pay-total-row">
          <span class="pay-label">Bill Total</span>
          <span class="pay-total-val">{{ ctx?.billTotal | number:'1.' + (ctx?.decimalPoints ?? 2) + '-' + (ctx?.decimalPoints ?? 2) }}</span>
        </div>

        <!-- Tendered so far -->
        <div class="pay-lines" *ngIf="lines().length > 0">
          @for (ln of lines(); track ln.rowNo) {
            <div class="pay-line">
              <span class="pay-line-type">{{ ln.descrip }}</span>
              <span class="pay-line-amt">{{ ln.amount | number:'1.2-2' }}</span>
            </div>
          }
        </div>

        <p-divider />

        <div class="pay-summary-row">
          <div class="pay-sum-item">
            <span class="pay-label">Paid</span>
            <span class="pay-paid-val">{{ totalPaid() | number:'1.2-2' }}</span>
          </div>
          <div class="pay-sum-item">
            <span class="pay-label">Balance</span>
            <span class="pay-balance-val" [class.over]="balance() <= 0">{{ balance() | number:'1.2-2' }}</span>
          </div>
          <div class="pay-sum-item" *ngIf="change() > 0">
            <span class="pay-label">Change</span>
            <span class="pay-change-val">{{ change() | number:'1.2-2' }}</span>
          </div>
        </div>

        <p-divider />

        <!-- Tender entry -->
        <div class="tender-section">
          <div class="tender-type-grid">
            @for (pt of payTypes(); track pt.payTypeID) {
              <button class="tender-type-btn" [class.selected]="selectedPayTypeID() === pt.payTypeID"
                      (click)="selectPayType(pt)">
                {{ pt.payTypeName }}
              </button>
            }
          </div>

          <div class="tender-amount-row">
            <p-inputNumber [(ngModel)]="tenderAmount"
                           [min]="0" [minFractionDigits]="2" [maxFractionDigits]="2"
                           placeholder="Enter amount"
                           styleClass="tender-input" inputStyleClass="tender-input-field"
                           (keyup.enter)="addTender()" />
            <p-button label="Add" icon="pi pi-plus" (onClick)="addTender()"
                      [disabled]="!tenderAmount || !selectedPayTypeID()" />
          </div>

          <!-- Quick cash buttons -->
          <div class="quick-cash" *ngIf="selectedPayTypeID() === 1">
            @for (amt of quickAmounts(); track amt) {
              <button class="quick-btn" (click)="tenderAmount = amt">{{ amt | number:'1.0-0' }}</button>
            }
            <button class="quick-btn exact" (click)="tenderAmount = balance()">Exact</button>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button label="Clear Tender" severity="danger" [outlined]="true" icon="pi pi-trash"
                  (onClick)="clearTender()" [disabled]="lines().length === 0" />
        <p-button label="Complete Sale" severity="success" icon="pi pi-check"
                  (onClick)="complete()"
                  [disabled]="balance() > 0 || lines().length === 0" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .pay-body { padding: 0.25rem 0; }
    .pay-total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .pay-label { font-size: 0.85rem; color: var(--text-color-secondary); }
    .pay-total-val { font-size: 1.6rem; font-weight: 700; color: var(--primary-color); }
    .pay-lines { margin-bottom: 0.5rem; }
    .pay-line { display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9rem; }
    .pay-summary-row { display: flex; gap: 1.5rem; margin: 0.5rem 0; }
    .pay-sum-item { display: flex; flex-direction: column; }
    .pay-paid-val { font-size: 1.2rem; font-weight: 600; color: var(--green-600); }
    .pay-balance-val { font-size: 1.2rem; font-weight: 600; color: var(--orange-600); }
    .pay-balance-val.over { color: var(--green-600); }
    .pay-change-val { font-size: 1.2rem; font-weight: 700; color: var(--blue-600); }
    .tender-section { margin-top: 0.5rem; }
    .tender-type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.4rem; margin-bottom: 0.75rem; }
    .tender-type-btn { padding: 0.5rem; border: 1px solid var(--surface-border); border-radius: 6px; background: var(--surface-card); cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
    .tender-type-btn.selected { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
    .tender-amount-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    :host ::ng-deep .tender-input { flex: 1; }
    :host ::ng-deep .tender-input-field { width: 100%; font-size: 1.1rem; text-align: right; }
    .quick-cash { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.4rem; }
    .quick-btn { padding: 0.35rem 0.75rem; border: 1px solid var(--surface-border); border-radius: 4px; background: var(--surface-50); cursor: pointer; font-size: 0.85rem; }
    .quick-btn.exact { background: var(--blue-50); border-color: var(--blue-300); color: var(--blue-700); }
  `]
})
export class PaymentDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() ctx: PaymentDialogContext | null = null;
  @Input() payTypeList: PayTypeDto[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() tenderAdded = new EventEmitter<AddPaymentRequest>();
  @Output() tenderCleared = new EventEmitter<void>();
  @Output() completed = new EventEmitter<void>();

  readonly lines = signal<PaymentLineDto[]>([]);
  readonly payTypes = signal<PayTypeDto[]>([]);
  readonly selectedPayTypeID = signal<number | null>(null);
  readonly selectedPayTypeName = signal('');
  tenderAmount: number | null = null;

  readonly totalPaid = computed(() => this.lines().reduce((s, l) => s + l.amount, 0));
  readonly balance = computed(() => Math.max(0, (this.ctx?.billTotal ?? 0) - this.totalPaid()));
  readonly change = computed(() => Math.max(0, this.totalPaid() - (this.ctx?.billTotal ?? 0)));

  readonly quickAmounts = computed(() => {
    const t = this.ctx?.billTotal ?? 0;
    const base = Math.ceil(t / 50) * 50;
    return [base, base + 50, base + 100, base + 200].filter(a => a > t);
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['payTypeList']) {
      this.payTypes.set(this.payTypeList);
    }
    if (changes['visible'] && this.visible) {
      this.reset();
    }
  }

  updateLines(newLines: PaymentLineDto[]) {
    this.lines.set(newLines);
  }

  selectPayType(pt: PayTypeDto) {
    this.selectedPayTypeID.set(pt.payTypeID);
    this.selectedPayTypeName.set(pt.payTypeName);
    // Default to exact balance for non-cash
    if (pt.payTypeID !== 1) this.tenderAmount = this.balance();
  }

  addTender() {
    if (!this.tenderAmount || !this.selectedPayTypeID() || !this.ctx) return;
    const req: AddPaymentRequest = {
      locationID: this.ctx.locationID,
      receipt: this.ctx.receipt,
      unitNo: this.ctx.unitNo,
      billTypeID: this.ctx.billTypeID,
      saleTypeID: this.ctx.saleTypeID,
      cashierID: this.ctx.cashierID,
      payTypeID: this.selectedPayTypeID()!,
      amount: this.tenderAmount,
      balance: this.balance() - this.tenderAmount,
      refNo: '',
      bankID: 0,
      terminalID: 0,
      chequeDate: null,
      isRecallAdv: false,
      recallNo: '',
      descrip: this.selectedPayTypeName(),
      enCodeName: '',
      locationIDBilling: this.ctx.locationIDBilling,
      tableID: this.ctx.tableID,
      ticketID: this.ctx.ticketID
    };
    this.tenderAdded.emit(req);
    this.tenderAmount = null;
  }

  clearTender() {
    this.lines.set([]);
    this.tenderCleared.emit();
  }

  complete() {
    if (this.balance() > 0) return;
    this.completed.emit();
    this.onCancel();
  }

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private reset() {
    this.lines.set([]);
    this.tenderAmount = null;
    this.selectedPayTypeID.set(null);
    this.selectedPayTypeName.set('');
  }
}
