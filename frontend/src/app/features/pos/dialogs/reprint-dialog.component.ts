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
              <span class="rdlg-receipt">{{ inv.receipt }}</span>
              <span class="rdlg-meta">{{ inv.cashier }} · {{ inv.recDate }}</span>
              <span class="rdlg-amount">{{ inv.netAmount | number:'1.2-2' }}</span>
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
      width: 100%; display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.05);
      color: #e8e8f0; cursor: pointer; text-align: left;
      transition: background 0.1s;
      &:hover { background: rgba(167,139,250,0.1); }
      &:active { background: rgba(167,139,250,0.18); }
    }
    .rdlg-receipt { font-weight: 700; font-size: 0.9rem; min-width: 110px; color: #a78bfa; }
    .rdlg-meta { flex: 1; font-size: 0.75rem; color: rgba(232,232,240,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rdlg-amount { font-weight: 700; font-size: 0.9rem; color: #4dd4c4; white-space: nowrap; }
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
