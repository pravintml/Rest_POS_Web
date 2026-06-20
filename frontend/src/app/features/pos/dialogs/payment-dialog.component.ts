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
  orderStart: string;
  mobileNo: string;
  customer: string;
  packs: number;
  tagNo: string;
}

interface BillDisplayRow {
  kind: 'item' | 'discount' | 'sc' | 'subtotal';
  data?: OrderLineDto;
  amount?: number;
  isFinal?: boolean;
  i?: number;
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

    <!-- ORDER header (matches POS order panel) -->
    <div class="bill-order-header">
      <div class="oh-top">
        <span class="order-title">ORDER</span>
        @if (itemCount() > 0) {
          <span class="item-count">{{ itemCount() | number:'1.0-0' }} ITEMS</span>
        }
      </div>
      @if (ctx?.orderStart) {
        <div class="oh-meta">
          <div class="oh-row">
            <span class="oh-chip oh-start">
              <i class="pi pi-clock"></i>{{ ctx?.orderStart }}
            </span>
          </div>
          <div class="oh-row">
            <span class="oh-chip oh-mobile">
              <i class="pi pi-mobile"></i>{{ ctx?.mobileNo || '—' }}
            </span>
            <span class="oh-chip oh-customer">
              <i class="pi pi-user"></i>{{ ctx?.customer || '—' }}
            </span>
          </div>
          <div class="oh-row">
            <span class="oh-chip oh-packs">
              <i class="pi pi-box"></i>{{ ctx?.packs }}
            </span>
            <span class="oh-chip oh-tag">
              <i class="pi pi-tag"></i>{{ ctx?.tagNo || '—' }}
            </span>
          </div>
        </div>
      }
    </div>

    <!-- Item list (order-panel style) -->
    <div class="bill-scroll">
      @for (row of billDisplayRows(); track $index) {
        @if (row.kind === 'item') {
          <div class="order-item" [class.return-item]="row.data!.documentID === 2 || row.data!.documentID === 4">
            <div class="item-row1">
              <span class="item-name">{{ row.data!.descrip }}</span>
            </div>
            <div class="item-row2">
              <span class="item-qty-price">{{ row.data!.qty | number:'1.0-3' }} × {{ row.data!.price | number:'1.' + dp() + '-' + dp() }}</span>
              @if (row.data!.discount > 0) {
                <span class="item-disc">-{{ row.data!.discount | number:'1.2-2' }}</span>
              }
              <span class="item-nett">{{ row.data!.nett | number:'1.' + dp() + '-' + dp() }}</span>
            </div>
          </div>
        } @else if (row.kind === 'discount') {
          <div class="order-item discount-row">
            <div class="bill-special-row">
              <span class="special-badge disc-badge">DISC</span>
              <span class="special-desc">{{ row.data!.descrip }}</span>
              <span class="special-amount disc-amount">-{{ row.data!.nett | number:'1.' + dp() + '-' + dp() }}</span>
            </div>
          </div>
        } @else if (row.kind === 'sc') {
          <div class="order-item sc-row">
            <div class="bill-special-row">
              <span class="special-badge sc-badge">SC</span>
              <span class="special-desc">SERVICE CHARGE</span>
              <span class="special-amount sc-amount">{{ row.data!.nett | number:'1.' + dp() + '-' + dp() }}</span>
            </div>
          </div>
        } @else {
          <div class="order-item subtotal-row" [class.final-total]="row.isFinal">
            <div class="bill-special-row">
              <span class="special-desc sub-label">SUB TOTAL</span>
              <span class="special-amount sub-amount">{{ row.amount! | number:'1.' + dp() + '-' + dp() }}</span>
            </div>
          </div>
        }
      }

      <!-- Running payment tenders -->
      @for (entry of runningBill(); track $index) {
        <div class="order-item tender-row">
          <div class="bill-special-row">
            <span class="special-badge pay-badge">PAY</span>
            <span class="special-desc">{{ entry.descrip }}{{ entry.refNo ? ' ' + entry.refNo : '' }}</span>
            <span class="special-amount">{{ entry.amount | number:'1.' + dp() + '-' + dp() }}</span>
          </div>
        </div>
        <div class="order-item balance-row">
          <div class="bill-special-row">
            <span class="special-desc sub-label">BALANCE</span>
            <span class="special-amount sub-amount" [class.zero-bal]="entry.remaining <= 0">{{ entry.remaining | number:'1.' + dp() + '-' + dp() }}</span>
          </div>
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
          [style.--ptc]="ptIconColor(pt)"
          (click)="onPayTypeClick(pt)"
          [disabled]="busy()">
          <span class="pt-icon-wrap">
            <i class="pi pt-icon" [ngClass]="ptIconClass(pt)"></i>
          </span>
          <span class="pt-name">{{ pt.payTypeName }}</span>
        </button>
      }
    </div>

    <!-- Denomination note buttons -->
    <div class="pay-notes-area">
      @for (n of notesList; track n) {
        <button class="note-btn" [style.--nc]="noteColor(n)" (click)="onNoteClick(n)" [disabled]="busy()">
          <span class="note-currency"><i class="pi pi-money-bill"></i> Rs.</span>
          <span class="note-amount">{{ n | number:'1.0-0' }}</span>
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
      position: fixed; inset: 52px 0 0 0; z-index: 1000;
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
      background: #0d0d14; border-right: 1px solid rgba(255,255,255,0.07);
      overflow: hidden; font-family: 'Inter', -apple-system, sans-serif;
    }

    /* ORDER-style header */
    .bill-order-header {
      display: flex; flex-direction: column; gap: 0.3rem;
      padding: 0.55rem 1rem 0.5rem;
      background: #1a1a28; border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .oh-top {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 0.8rem; font-weight: 700;
      color: rgba(232,232,240,0.45); text-transform: uppercase; letter-spacing: 0.5px;
    }
    .order-title { font-weight: 700; color: rgba(232,232,240,0.45); letter-spacing: 0.5px; }
    .item-count  { color: #e63946; font-size: 0.75rem; }
    .oh-meta { display: flex; flex-direction: column; gap: 0.2rem; }
    .oh-row  { display: flex; align-items: center; gap: 1rem; }
    .oh-chip {
      display: inline-flex; align-items: center; gap: 0.28rem;
      font-size: 0.7rem; color: rgba(232,232,240,0.6); white-space: nowrap; flex: 1;
    }
    .oh-chip i { font-size: 0.72rem; }
    .oh-start   { flex: unset; } .oh-start   i { color: #a78bfa; }
    .oh-mobile  i { color: #4dd4c4; }
    .oh-customer i { color: #74b9ff; }
    .oh-packs   i { color: #ff9f43; }
    .oh-tag     i { color: #f1c40f; }

    /* Item scroll */
    .bill-scroll {
      flex: 1; overflow-y: auto; padding: 0.5rem 0;
    }
    .bill-scroll::-webkit-scrollbar { width: 4px; }
    .bill-scroll::-webkit-scrollbar-track { background: transparent; }
    .bill-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    /* Order items — matches pos order panel */
    .order-item {
      display: flex; flex-direction: column;
      padding: 0.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.07);
      gap: 0.2rem; cursor: default;
    }
    .order-item.return-item { color: #ff9999; }

    .item-row1 { display: flex; align-items: center; gap: 0.4rem; }
    .item-name { flex: 1; font-size: 0.875rem; color: #e8e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .item-row2 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
    .item-qty-price { color: rgba(232,232,240,0.45); flex: 1; }
    .item-disc  { color: #ff9999; font-size: 0.75rem; }
    .item-nett  { font-weight: 700; font-variant-numeric: tabular-nums; color: #e8e8f0; margin-left: auto; }

    /* Special rows */
    .bill-special-row {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem;
    }
    .special-badge {
      font-size: 0.6rem; font-weight: 800; letter-spacing: 0.5px;
      padding: 0.1rem 0.35rem; border-radius: 3px; flex-shrink: 0;
    }
    .special-desc { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .special-amount { font-weight: 700; font-variant-numeric: tabular-nums; margin-left: auto; }
    .sub-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    .discount-row { background: rgba(230,57,70,0.05); }
    .disc-badge  { background: rgba(230,57,70,0.2); color: #f28090; }
    .disc-amount { color: #f28090; }

    .sc-row { background: rgba(99,102,241,0.05); }
    .sc-badge  { background: rgba(99,102,241,0.2); color: #a5b4fc; }
    .sc-amount { color: #a5b4fc; }

    .subtotal-row {
      background: rgba(255,255,255,0.03); padding-top: 0.35rem; padding-bottom: 0.35rem;
    }
    .subtotal-row .sub-label  { color: rgba(232,232,240,0.45); }
    .subtotal-row .sub-amount { color: rgba(232,232,240,0.45); }

    .final-total {
      background: rgba(45,198,83,0.08);
      border-top: 1px solid rgba(45,198,83,0.25); border-bottom: none;
    }
    .final-total .sub-label  { color: #2dc653; font-size: 0.85rem; }
    .final-total .sub-amount { color: #2dc653; font-size: 0.95rem; }

    .tender-row { background: rgba(59,130,246,0.08); }
    .pay-badge  { background: rgba(59,130,246,0.2); color: #93c5fd; }
    .tender-row .special-amount { color: #93c5fd; }

    .balance-row { background: rgba(255,255,255,0.02); padding-top: 0.2rem; padding-bottom: 0.2rem; }
    .balance-row .sub-label  { color: rgba(232,232,240,0.45); }
    .balance-row .sub-amount { color: rgba(232,232,240,0.45); }
    .zero-bal { color: #4ade80 !important; font-weight: 700; }

    /* Footer */
    .bill-footer { border-top: 2px solid rgba(255,255,255,0.07); padding: 0.5rem 1rem; flex-shrink: 0; }
    .bill-total-row {
      display: flex; justify-content: space-between;
      font-size: 1.1rem; font-weight: 700; color: #f59e0b;
      font-variant-numeric: tabular-nums;
    }
    .bill-total-row.balanced { color: #4ade80; }
    .bill-change-row {
      display: flex; justify-content: space-between;
      font-size: 0.9rem; font-weight: 600; color: #818cf8; margin-top: 0.25rem;
      font-variant-numeric: tabular-nums;
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
      --ptc: #64748b;
      width: 100%; height: 100%; min-height: 5rem;
      padding: 0.6rem 0.35rem;
      border: 1.5px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      background: linear-gradient(160deg, color-mix(in srgb, var(--ptc) 14%, #0f1420) 0%, color-mix(in srgb, var(--ptc) 6%, #0a0e18) 100%);
      color: rgba(232,232,240,0.65);
      cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s, transform 0.12s;
      position: relative; overflow: hidden;
    }
    /* subtle top sheen */
    .pt-btn::before {
      content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
      background: rgba(255,255,255,0.07); pointer-events: none;
    }

    .pt-icon-wrap {
      width: 2.6rem; height: 2.6rem; border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 1.5px solid rgba(255,255,255,0.10);
      display: flex; align-items: center; justify-content: center;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
      flex-shrink: 0;
    }
    .pt-icon {
      font-size: 1.2rem;
      color: var(--ptc);
      transition: transform 0.15s, filter 0.15s;
    }
    .pt-name {
      font-size: 0.64rem; font-weight: 700; letter-spacing: 0.04em;
      line-height: 1.25; word-break: break-word; text-align: center;
      color: rgba(232,232,240,0.65);
      transition: color 0.15s;
    }

    /* Hover */
    .pt-btn:hover:not(:disabled) {
      border-color: var(--ptc);
      background: linear-gradient(160deg, color-mix(in srgb, var(--ptc) 22%, #0f1420) 0%, color-mix(in srgb, var(--ptc) 10%, #0a0e18) 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.35);
    }
    .pt-btn:hover:not(:disabled) .pt-icon-wrap {
      border-color: var(--ptc);
      background: rgba(255,255,255,0.1);
    }
    .pt-btn:hover:not(:disabled) .pt-icon { filter: brightness(1.2); transform: scale(1.08); }
    .pt-btn:hover:not(:disabled) .pt-name { color: #e8e8f0; }

    /* Selected */
    .pt-btn.pt-selected {
      border-color: var(--ptc);
      background: linear-gradient(160deg, color-mix(in srgb, var(--ptc) 28%, #0f1420) 0%, color-mix(in srgb, var(--ptc) 13%, #0a0e18) 100%);
      box-shadow: 0 0 0 1px var(--ptc), 0 0 22px -5px var(--ptc);
      color: #fff; transform: none;
    }
    .pt-btn.pt-selected .pt-icon-wrap {
      border-color: var(--ptc);
      background: rgba(255,255,255,0.12);
      box-shadow: 0 0 10px -3px var(--ptc);
    }
    .pt-btn.pt-selected .pt-icon { filter: drop-shadow(0 0 5px var(--ptc)); }
    .pt-btn.pt-selected .pt-name { color: #fff; }

    .pt-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

    .pay-notes-area {
      display: grid; grid-template-columns: repeat(4, 1fr);
      grid-auto-rows: 1fr;
      gap: 5px; padding: 10px; border-top: 1px solid rgba(255,255,255,0.07); background: #080b14;
    }
    .note-btn {
      --nc: #16a34a;
      width: 100%; height: 100%; min-height: 5rem;
      padding: 0.5rem;
      border: 1.5px solid rgba(255,255,255,0.07); border-radius: 12px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--nc) 16%, #0a0e18) 0%, color-mix(in srgb, var(--nc) 6%, #060810) 100%);
      cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s, transform 0.12s;
    }
    .note-currency {
      display: flex; align-items: center; gap: 0.25rem;
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em;
      color: var(--nc); opacity: 0.85;
    }
    .note-currency i { font-size: 0.75rem; }
    .note-amount {
      font-size: 1.45rem; font-weight: 800; color: #e8e8f0;
      font-variant-numeric: tabular-nums; letter-spacing: -0.01em; line-height: 1;
    }
    .note-btn:hover:not(:disabled) {
      border-color: var(--nc);
      background: linear-gradient(135deg, color-mix(in srgb, var(--nc) 26%, #0a0e18) 0%, color-mix(in srgb, var(--nc) 11%, #060810) 100%);
      box-shadow: 0 4px 14px rgba(0,0,0,0.4), 0 0 0 1px var(--nc);
      transform: translateY(-1px);
    }
    .note-btn:hover:not(:disabled) .note-amount { color: #fff; }
    .note-btn:hover:not(:disabled) .note-currency { opacity: 1; }
    .note-btn:disabled { opacity: 0.3; cursor: not-allowed; }

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

  noteColor(n: number): string {
    if (n >= 5000) return '#7c3aed';   // violet   — 5000 note
    if (n >= 2000) return '#db2777';   // pink     — 2000 note
    if (n >= 1000) return '#2563eb';   // blue     — 1000 note
    if (n >=  500) return '#16a34a';   // green    — 500 note
    if (n >=  100) return '#b45309';   // amber    — 100 note
    if (n >=   50) return '#9333ea';   // purple   — 50 note
    if (n >=   20) return '#0d9488';   // teal     — 20 note
    return '#475569';                  // slate    — 10 note
  }

  ptIconClass(pt: PayTypeDto): string {
    if (pt.type === 0) return 'pi-wallet';
    if (pt.type === 1) return 'pi-credit-card';
    const n = pt.payTypeName.toUpperCase();
    if (n.includes('CHEQUE') || n.includes('CHECK'))               return 'pi-file-edit';
    if (n.includes('ONLINE') || n.includes('INTERNET') || n.includes('DIGITAL') || n.includes('BANK')) return 'pi-globe';
    if (n.includes('MOBILE') || n.includes('PHONE'))               return 'pi-mobile';
    if (n.includes('STAFF'))                                        return 'pi-id-card';
    if (n.includes('COMPLI') || n.includes('COMP'))                return 'pi-gift';
    if (n.includes('ROOM'))                                         return 'pi-building';
    if (n.includes('ADVANCE') || n.includes('ADV'))                return 'pi-calendar';
    if (n.includes('CREDIT'))                                       return 'pi-dollar';
    if (n.includes('VOUCHER') || n.includes('COUPON'))             return 'pi-ticket';
    return 'pi-tag';
  }

  ptIconColor(pt: PayTypeDto): string {
    if (pt.type === 0) return '#4ade80';
    if (pt.type === 1) return '#818cf8';
    const n = pt.payTypeName.toUpperCase();
    if (n.includes('CHEQUE') || n.includes('CHECK'))               return '#fbbf24';
    if (n.includes('ONLINE') || n.includes('INTERNET') || n.includes('DIGITAL') || n.includes('BANK')) return '#22d3ee';
    if (n.includes('MOBILE') || n.includes('PHONE'))               return '#34d399';
    if (n.includes('STAFF'))                                        return '#a78bfa';
    if (n.includes('COMPLI') || n.includes('COMP'))                return '#f472b6';
    if (n.includes('ROOM'))                                         return '#60a5fa';
    if (n.includes('ADVANCE') || n.includes('ADV'))                return '#fb923c';
    if (n.includes('CREDIT'))                                       return '#facc15';
    if (n.includes('VOUCHER') || n.includes('COUPON'))             return '#e879f9';
    return '#fb923c';
  }

  // ── Reactive state ─────────────────────────────────────────────────────
  readonly lines       = signal<PaymentLineDto[]>([]);
  readonly payTypes    = signal<PayTypeDto[]>([]);
  readonly selectedPayType = signal<PayTypeDto | null>(null);
  readonly pendingPayType  = signal<PayTypeDto | null>(null);  // card type waiting for refNo
  readonly refNoMode   = signal(false);
  readonly busy        = signal(false);
  readonly numpadStr   = signal('');

  // mirrored inputs so computed() can track them (plain @Input() is not trackable)
  protected readonly _billTotal    = signal(0);
  private   readonly _orderItems   = signal<OrderLineDto[]>([]);

  refNoInput = '';

  // ── Computed ────────────────────────────────────────────────────────────
  readonly dp = computed(() => this.ctx?.decimalPoints ?? 2);

  readonly itemCount = computed(() =>
    this._orderItems().filter(i => i.documentID <= 4).reduce((s, i) => s + i.qty, 0)
  );

  readonly billDisplayRows = computed<BillDisplayRow[]>(() => {
    const items = this._orderItems();
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
          rows.push({ kind: 'item', data: item }); break;
        case 'discount':
          running -= item.nett;
          rows.push({ kind: 'discount', data: item }); break;
        case 'sc':
          running += item.nett;
          rows.push({ kind: 'sc', data: item }); break;
      }
      prevGroup = group;
    }
    rows.push({ kind: 'subtotal', amount: running, isFinal: true, i: subIdx });
    return rows;
  });

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
    if (changes['orderItems']) {
      this._orderItems.set(this.orderItems);
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
