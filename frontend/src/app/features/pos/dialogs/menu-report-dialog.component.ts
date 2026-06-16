import {
  Component, EventEmitter, Input, OnChanges, Output,
  SimpleChanges, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportService } from '../../../core/services/report.service';
import {
  MenuItemDto, SalesReadingDto, BillWiseRow, ItemWiseRow,
  REPORT_CASHIER_READING, REPORT_X_READING
} from '../../../core/models/report.models';

type ReportKind = 'none' | 'reading' | 'bill-wise' | 'item-wise';

const SUPPORTED = new Set([1, 13, 17, 40]);

@Component({
  selector: 'app-menu-report-dialog',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
  @if (visible) {
    <div class="mr-overlay">
      <div class="mr-shell">

        <!-- Header -->
        <div class="mr-header">
          <span class="mr-title"><i class="pi pi-chart-bar"></i> REPORTS</span>
          <div class="mr-header-actions">
            @if (reportKind() !== 'none') {
              <button class="mr-act-btn" (click)="printReport()">
                <i class="pi pi-print"></i> Print
              </button>
              <button class="mr-act-btn" (click)="clearReport()">
                <i class="pi pi-arrow-left"></i> Back
              </button>
            }
            <button class="mr-close-btn" (click)="close()"><i class="pi pi-times"></i></button>
          </div>
        </div>

        <div class="mr-body">

          <!-- LEFT: report menu (hidden when a report is shown) -->
          @if (reportKind() === 'none') {
            <div class="mr-menu">
              @if (menuLoading()) {
                <div class="mr-center"><p-progressspinner strokeWidth="4" /></div>
              } @else {
                @for (item of menuItems(); track item.menuID) {
                  <button class="mr-menu-btn"
                    [class.supported]="isSupported(item.menuID)"
                    [class.active]="activeMenuID() === item.menuID"
                    (click)="selectReport(item)">
                    <span class="mr-menu-name">{{ item.menuName }}</span>
                    @if (!isSupported(item.menuID)) {
                      <span class="mr-badge">soon</span>
                    }
                  </button>
                }
              }
            </div>
          }

          <!-- RIGHT: report content -->
          <div class="mr-content">
            @if (reportLoading()) {
              <div class="mr-center"><p-progressspinner strokeWidth="4" /></div>

            } @else if (reportKind() === 'none') {
              <div class="mr-placeholder">
                <i class="pi pi-arrow-left"></i>
                <p>Select a report from the list</p>
              </div>

            } @else if (reportKind() === 'reading' && readingData()) {
              <div class="mr-reading" id="printable-report">
                <div class="rpt-title">{{ reportTitle() }}</div>
                <div class="rpt-time">{{ readingData()!.generatedAt }}</div>
                <table class="rpt-table">
                  <tr><td>Gross Sales</td>
                      <td class="rpt-num">{{ fmt(readingData()!.grossSale) }}</td></tr>
                  <tr class="rpt-sub"><td>Item Discounts</td>
                      <td class="rpt-num">{{ fmt(readingData()!.itemDiscount) }}</td></tr>
                  <tr class="rpt-sub"><td>Subtotal Discounts</td>
                      <td class="rpt-num">{{ fmt(readingData()!.subtotalDiscount) }}</td></tr>
                  @if (readingData()!.serviceCharge > 0) {
                    <tr class="rpt-sub"><td>Service Charge</td>
                        <td class="rpt-num">{{ fmt(readingData()!.serviceCharge) }}</td></tr>
                  }
                  @if (readingData()!.refunds > 0) {
                    <tr class="rpt-sub">
                      <td>Refunds ({{ readingData()!.nRefunds }})</td>
                      <td class="rpt-num">{{ fmt(readingData()!.refunds) }}</td>
                    </tr>
                  }
                  @if (readingData()!.voids > 0) {
                    <tr class="rpt-sub">
                      <td>Voids ({{ readingData()!.nVoids }})</td>
                      <td class="rpt-num">{{ fmt(readingData()!.voids) }}</td>
                    </tr>
                  }
                  @if (readingData()!.cancel > 0) {
                    <tr class="rpt-sub">
                      <td>Cancellations ({{ readingData()!.nCancel }})</td>
                      <td class="rpt-num">{{ fmt(readingData()!.cancel) }}</td>
                    </tr>
                  }
                  <tr class="rpt-divider"><td colspan="2"></td></tr>
                  <tr class="rpt-total"><td>NET SALES</td>
                      <td class="rpt-num">{{ fmt(readingData()!.netSales) }}</td></tr>
                  <tr><td>No of Bills</td>
                      <td class="rpt-num">{{ readingData()!.noOfBills }}</td></tr>
                  @if (readingData()!.noOfBills > 0) {
                    <tr class="rpt-sub"><td>Average Bill</td>
                      <td class="rpt-num">
                        {{ fmt(readingData()!.netSales / readingData()!.noOfBills) }}
                      </td>
                    </tr>
                  }
                  <tr class="rpt-divider"><td colspan="2"></td></tr>
                  <tr class="rpt-section"><td colspan="2">PAYMENTS</td></tr>
                  @for (p of readingData()!.payments; track p.payType) {
                    <tr>
                      <td>{{ p.payType }} ({{ p.count }})</td>
                      <td class="rpt-num">{{ fmt(p.amount) }}</td>
                    </tr>
                  }
                </table>
              </div>

            } @else if (reportKind() === 'bill-wise') {
              <div class="mr-table-wrap" id="printable-report">
                <div class="rpt-title">Bill Wise Report</div>
                <table class="rpt-table rpt-grid">
                  <thead><tr>
                    <th>Receipt</th><th>Cashier</th><th>Pay Type</th>
                    <th class="rpt-num">Amount</th>
                  </tr></thead>
                  <tbody>
                    @for (r of billWiseRows(); track r.receipt + r.payType) {
                      <tr>
                        <td>{{ r.receipt }}</td>
                        <td>{{ r.cashier }}</td>
                        <td>{{ r.payType }}</td>
                        <td class="rpt-num">{{ fmt(r.amount) }}</td>
                      </tr>
                    }
                    @if (billWiseRows().length === 0) {
                      <tr><td colspan="4" class="rpt-empty">No bills found</td></tr>
                    }
                  </tbody>
                </table>
              </div>

            } @else if (reportKind() === 'item-wise') {
              <div class="mr-table-wrap" id="printable-report">
                <div class="rpt-title">Item Wise Sales Report</div>
                <table class="rpt-table rpt-grid">
                  <thead><tr>
                    <th>Category</th><th>Item</th>
                    <th class="rpt-num">Qty</th><th class="rpt-num">Amount</th>
                  </tr></thead>
                  <tbody>
                    @for (r of itemWiseRows(); track r.itemName) {
                      <tr>
                        <td>{{ r.category }}</td>
                        <td>{{ r.itemName }}</td>
                        <td class="rpt-num">{{ r.qty | number:'1.0-3' }}</td>
                        <td class="rpt-num">{{ fmt(r.amount) }}</td>
                      </tr>
                    }
                    @if (itemWiseRows().length === 0) {
                      <tr><td colspan="4" class="rpt-empty">No items found</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

        </div>
      </div>
    </div>
  }
  `,
  styles: [`
    .mr-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.88);
      display: flex; align-items: center; justify-content: center;
      z-index: 9000;
    }
    .mr-shell {
      width: min(1100px, 96vw); height: min(700px, 92vh);
      background: #1a1a2e; border: 1px solid #2d2d4e;
      border-radius: 12px; display: flex; flex-direction: column;
      overflow: hidden;
    }
    .mr-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.75rem 1.25rem; border-bottom: 1px solid #2d2d4e;
      flex-shrink: 0;
    }
    .mr-title {
      font-size: 1.1rem; font-weight: 700; color: #e2e8f0;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .mr-title i { color: #818cf8; }
    .mr-header-actions { display: flex; gap: 0.5rem; align-items: center; }
    .mr-act-btn {
      background: rgba(129,140,248,0.15); border: 1px solid rgba(129,140,248,0.3);
      color: #a5b4fc; border-radius: 6px; padding: 0.35rem 0.75rem;
      cursor: pointer; font-size: 0.82rem; display: flex; align-items: center; gap: 0.35rem;
    }
    .mr-act-btn:hover { background: rgba(129,140,248,0.25); }
    .mr-close-btn {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8; border-radius: 6px; padding: 0.35rem 0.6rem;
      cursor: pointer; font-size: 1rem;
    }
    .mr-close-btn:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
    .mr-body { display: flex; flex: 1; overflow: hidden; }

    .mr-menu {
      width: 240px; flex-shrink: 0;
      border-right: 1px solid #2d2d4e;
      overflow-y: auto; padding: 0.5rem;
      display: flex; flex-direction: column; gap: 3px;
    }
    .mr-menu-btn {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.55rem 0.75rem; border-radius: 6px;
      border: 1px solid transparent; cursor: pointer;
      background: transparent; color: #94a3b8; font-size: 0.85rem;
      text-align: left; transition: all 0.12s;
    }
    .mr-menu-btn.supported { color: #e2e8f0; }
    .mr-menu-btn:hover { background: rgba(255,255,255,0.06); border-color: #3d3d5e; }
    .mr-menu-btn.active {
      background: rgba(129,140,248,0.15);
      border-color: rgba(129,140,248,0.35); color: #a5b4fc;
    }
    .mr-badge {
      font-size: 0.65rem; background: rgba(255,255,255,0.1); color: #64748b;
      border-radius: 4px; padding: 1px 5px;
    }

    .mr-content { flex: 1; overflow-y: auto; padding: 1.25rem; }
    .mr-center {
      display: flex; justify-content: center; align-items: center; height: 100%;
    }
    .mr-placeholder {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100%; gap: 0.75rem; color: #475569; font-size: 0.95rem;
    }
    .mr-placeholder i { font-size: 2rem; }

    .mr-reading, .mr-table-wrap { max-width: 600px; margin: 0 auto; }
    .rpt-title {
      font-size: 1.1rem; font-weight: 700; color: #e2e8f0;
      text-align: center; margin-bottom: 0.25rem;
    }
    .rpt-time { font-size: 0.8rem; color: #64748b; text-align: center; margin-bottom: 1rem; }
    .rpt-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; color: #cbd5e1; }
    .rpt-table td { padding: 0.3rem 0.5rem; }
    .rpt-table th {
      padding: 0.4rem 0.5rem; text-align: left;
      color: #94a3b8; font-size: 0.8rem; border-bottom: 1px solid #2d2d4e;
    }
    .rpt-num { text-align: right; font-variant-numeric: tabular-nums; }
    .rpt-sub td { color: #64748b; font-size: 0.83rem; padding-left: 1.25rem; }
    .rpt-total td { font-weight: 700; color: #a5b4fc; font-size: 0.95rem; }
    .rpt-section td {
      font-weight: 600; color: #94a3b8; font-size: 0.8rem;
      text-transform: uppercase; padding-top: 0.75rem;
    }
    .rpt-divider td { border-top: 1px solid #2d2d4e; padding: 0; height: 1px; }
    .rpt-grid { border: 1px solid #2d2d4e; border-radius: 6px; overflow: hidden; }
    .rpt-grid tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    .rpt-empty { text-align: center; color: #475569; padding: 1.5rem !important; }

    @media print {
      .mr-overlay { position: static; background: white; }
      .mr-shell { width: 100%; height: auto; background: white; border: none; }
      .mr-header, .mr-menu { display: none !important; }
      .mr-content { color: black; }
      .rpt-table, .rpt-table td, .rpt-table th { color: black; border-color: #ccc; }
    }
  `]
})
export class MenuReportDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() locationIDBilling = 0;
  @Input() shiftNo = 0;
  @Output() closed = new EventEmitter<void>();

  private readonly reportSvc = inject(ReportService);

  readonly menuItems     = signal<MenuItemDto[]>([]);
  readonly menuLoading   = signal(false);
  readonly reportLoading = signal(false);
  readonly activeMenuID  = signal<number | null>(null);
  readonly reportKind    = signal<ReportKind>('none');
  readonly reportTitle   = signal('');
  readonly readingData   = signal<SalesReadingDto | null>(null);
  readonly billWiseRows  = signal<BillWiseRow[]>([]);
  readonly itemWiseRows  = signal<ItemWiseRow[]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.clearReport();
      this.loadMenu();
    }
  }

  private loadMenu() {
    this.menuLoading.set(true);
    this.reportSvc.getMenuItems().subscribe({
      next: items => { this.menuItems.set(items); this.menuLoading.set(false); },
      error: ()    => this.menuLoading.set(false)
    });
  }

  isSupported(menuID: number) { return SUPPORTED.has(menuID); }

  selectReport(item: MenuItemDto) {
    if (!SUPPORTED.has(item.menuID)) return;
    this.activeMenuID.set(item.menuID);
    this.reportLoading.set(true);

    switch (item.menuID) {
      case 17:
        this.reportSvc.getSalesReading(this.locationIDBilling, this.shiftNo, REPORT_CASHIER_READING)
          .subscribe({
            next: data => {
              this.readingData.set(data);
              this.reportTitle.set('CASHIER READING');
              this.reportKind.set('reading');
              this.reportLoading.set(false);
            },
            error: () => this.reportLoading.set(false)
          });
        break;

      case 13:
        this.reportSvc.getSalesReading(this.locationIDBilling, this.shiftNo, REPORT_X_READING)
          .subscribe({
            next: data => {
              this.readingData.set(data);
              this.reportTitle.set('X READING');
              this.reportKind.set('reading');
              this.reportLoading.set(false);
            },
            error: () => this.reportLoading.set(false)
          });
        break;

      case 1:
        this.reportSvc.getBillWise(this.locationIDBilling, this.shiftNo)
          .subscribe({
            next: rows => {
              this.billWiseRows.set(rows);
              this.reportKind.set('bill-wise');
              this.reportLoading.set(false);
            },
            error: () => this.reportLoading.set(false)
          });
        break;

      case 40:
        this.reportSvc.getItemWise(this.locationIDBilling, this.shiftNo)
          .subscribe({
            next: rows => {
              this.itemWiseRows.set(rows);
              this.reportKind.set('item-wise');
              this.reportLoading.set(false);
            },
            error: () => this.reportLoading.set(false)
          });
        break;
    }
  }

  clearReport() {
    this.reportKind.set('none');
    this.activeMenuID.set(null);
    this.readingData.set(null);
    this.billWiseRows.set([]);
    this.itemWiseRows.set([]);
  }

  printReport() { window.print(); }

  close() {
    this.clearReport();
    this.closed.emit();
  }

  fmt(v: number): string {
    return (v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
