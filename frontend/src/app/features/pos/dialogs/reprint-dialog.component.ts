import { Component, EventEmitter, Input, OnChanges, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { InvoiceSummaryDto } from '../../../core/models/transaction.models';

@Component({
  selector: 'app-reprint-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
@if (visible) {
  <div class="rdlg-backdrop" (click)="cancel()">
    <div class="rdlg-panel" (click)="$event.stopPropagation()">

      <div class="rdlg-header">
        <span class="rdlg-title"><i class="pi pi-print"></i> Reprint Invoice</span>
        <button class="rdlg-close" (click)="cancel()"><i class="pi pi-times"></i></button>
      </div>

      @if (loading()) {
        <div class="rdlg-loading"><i class="pi pi-spin pi-spinner"></i> Loading invoices…</div>
      } @else if (invoices().length === 0) {
        <div class="rdlg-empty">No invoices found for the current shift.</div>
      } @else {
        <div class="rdlg-list">
          @for (inv of invoices(); track inv.receipt) {
            <button class="rdlg-row" (click)="select(inv)">
              <div class="rdlg-row-top">
                <span class="rdlg-receipt">{{ inv.receipt }}</span>
                <span class="rdlg-amount">{{ inv.netAmount | number:'1.2-2' }}</span>
              </div>
              <div class="rdlg-row-mid">
                <span class="rdlg-label">START</span>
                <span class="rdlg-val">{{ inv.startTime }}</span>
                <span class="rdlg-sep">·</span>
                <span class="rdlg-val rdlg-cashier">{{ inv.cashier }}</span>
              </div>
              <div class="rdlg-row-bot">
                @if (inv.mobileNo) {
                  <span class="rdlg-chip"><span class="rdlg-label">MOBILE #</span> {{ inv.mobileNo }}</span>
                }
                @if (inv.customer) {
                  <span class="rdlg-chip"><span class="rdlg-label">CUSTOMER</span> {{ inv.customer }}</span>
                }
                <span class="rdlg-chip"><span class="rdlg-label">PACKS</span> {{ inv.packs }}</span>
                @if (inv.tagNo) {
                  <span class="rdlg-chip"><span class="rdlg-label">TAG #</span> {{ inv.tagNo }}</span>
                }
              </div>
            </button>
          }
        </div>
      }

    </div>
  </div>
}
  `,
  styles: [`
    .rdlg-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.65);
      display: flex; align-items: center; justify-content: center;
    }
    .rdlg-panel {
      background: #1a1a28;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      width: min(92vw, 520px);
      max-height: 70dvh;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      overflow: hidden;
    }
    .rdlg-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    }
    .rdlg-title {
      font-size: 1rem; font-weight: 700; color: #e8e8f0;
      display: flex; align-items: center; gap: 0.5rem;
      i { color: #a78bfa; }
    }
    .rdlg-close {
      background: none; border: none; color: rgba(232,232,240,0.45);
      cursor: pointer; font-size: 1rem; padding: 4px;
      &:hover { color: #e8e8f0; }
    }
    .rdlg-loading, .rdlg-empty {
      padding: 2rem; text-align: center;
      color: rgba(232,232,240,0.45); font-size: 0.9rem;
      i { margin-right: 0.5rem; }
    }
    .rdlg-list {
      overflow-y: auto; flex: 1;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    .rdlg-row {
      width: 100%; display: flex; flex-direction: column; gap: 0.25rem;
      padding: 0.75rem 1.25rem;
      background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.05);
      color: #e8e8f0; cursor: pointer; text-align: left;
      transition: background 0.1s;
      &:hover { background: rgba(167,139,250,0.1); }
      &:active { background: rgba(167,139,250,0.18); }
    }
    .rdlg-row-top { display: flex; align-items: center; justify-content: space-between; }
    .rdlg-row-mid { display: flex; align-items: center; gap: 0.4rem; }
    .rdlg-row-bot { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.1rem; }
    .rdlg-receipt { font-weight: 700; font-size: 0.9rem; color: #a78bfa; }
    .rdlg-amount { font-weight: 700; font-size: 0.9rem; color: #4dd4c4; white-space: nowrap; }
    .rdlg-label { font-size: 0.68rem; color: rgba(232,232,240,0.4); text-transform: uppercase; letter-spacing: 0.04em; }
    .rdlg-val { font-size: 0.78rem; color: rgba(232,232,240,0.65); }
    .rdlg-cashier { color: rgba(232,232,240,0.85); font-weight: 600; }
    .rdlg-sep { color: rgba(232,232,240,0.2); font-size: 0.75rem; }
    .rdlg-chip { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: rgba(232,232,240,0.7); background: rgba(255,255,255,0.05); border-radius: 4px; padding: 1px 6px; }
  `]
})
export class ReprintDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() locationIDBilling = 0;
  @Output() invoiceSelected = new EventEmitter<InvoiceSummaryDto>();
  @Output() closed = new EventEmitter<void>();

  private txSvc = inject(TransactionService);

  readonly loading  = signal(false);
  readonly invoices = signal<InvoiceSummaryDto[]>([]);

  ngOnChanges() {
    if (this.visible && this.locationIDBilling) {
      this.load();
    }
  }

  private load() {
    this.loading.set(true);
    this.invoices.set([]);
    this.txSvc.getInvoiceList(this.locationIDBilling).subscribe({
      next:  list => { this.invoices.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  select(inv: InvoiceSummaryDto) { this.invoiceSelected.emit(inv); }
  cancel()                        { this.closed.emit(); }
}
