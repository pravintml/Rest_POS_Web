import {
  Component, EventEmitter, Input, OnChanges, Output,
  SimpleChanges, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ReportService } from '../../../core/services/report.service';
import {
  MenuItemDto, SalesReadingDto, TableReportDto,
  REPORT_CASHIER_READING, REPORT_X_READING
} from '../../../core/models/report.models';

type ReportKind = 'none' | 'reading' | 'table';

const SUPPORTED = new Set([
  1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
  17, 18, 25, 26, 27, 28, 40, 41, 43, 44
]);

const MENU_PATH: Record<number, string> = {
  3:  'suspend',
  4:  'pending-suspend',
  5:  'suspend-recall',
  6:  'cancellation',
  7:  'discount',
  8:  'loyalty',
  9:  'credit-card',
  25: 'non-cash',
  10: 'staff-purchase',
  11: 'gift-voucher',
  28: 'gift-card',
  12: 'paidout',
  27: 'paid-in',
  18: 'salesman',
  26: 'non-sales',
  44: 'sales-including-pending',
};

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
            }
            <button class="mr-close-btn" (click)="close()"><i class="pi pi-times"></i></button>
          </div>
        </div>

        <div class="mr-body">

          <!-- LEFT: report menu (always visible) -->
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

          <!-- RIGHT: report content -->
          <div class="mr-content">
            @if (reportLoading()) {
              <div class="mr-center"><p-progressspinner strokeWidth="4" /></div>

            } @else if (reportKind() === 'none') {
              <div class="mr-placeholder">
                <i class="pi pi-chart-bar"></i>
                <p>Select a report from the menu</p>
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

            } @else if (reportKind() === 'table' && tableReport()) {
              <div class="mr-table-wrap" id="printable-report">
                <div class="rpt-title">{{ tableReport()!.reportTitle }}</div>
                <div class="rpt-time">{{ tableReport()!.generatedAt }}</div>
                @for (sec of tableReport()!.sections; track $index) {
                  @if (tableReport()!.sections.length > 1 && sec.title) {
                    <div class="rpt-section-hdr">{{ sec.title }}</div>
                  }
                  <table class="rpt-table rpt-grid">
                    @if (sec.headers.length > 0) {
                      <thead><tr>
                        @for (h of sec.headers; track $index) {
                          <th [class.rpt-num]="isRightAlign(h)">{{ h }}</th>
                        }
                      </tr></thead>
                    }
                    <tbody>
                      @for (row of sec.rows; track $index) {
                        <tr>
                          @for (cell of row; track $index) {
                            <td [class.rpt-num]="isRightAlign(cell)">{{ cell }}</td>
                          }
                        </tr>
                      }
                      @if (sec.rows.length === 0) {
                        <tr>
                          <td [attr.colspan]="sec.headers.length || 1" class="rpt-empty">
                            No data
                          </td>
                        </tr>
                      }
                    </tbody>
                    @if (sec.footer && sec.footer.length > 0) {
                      <tfoot><tr class="rpt-footer-row">
                        @for (f of sec.footer; track $index) {
                          <td [class.rpt-num]="isRightAlign(f)">{{ f }}</td>
                        }
                      </tr></tfoot>
                    }
                  </table>
                }
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

    .mr-reading, .mr-table-wrap { max-width: 700px; margin: 0 auto; }
    .rpt-title {
      font-size: 1.1rem; font-weight: 700; color: #e2e8f0;
      text-align: center; margin-bottom: 0.25rem;
    }
    .rpt-time { font-size: 0.8rem; color: #64748b; text-align: center; margin-bottom: 1rem; }
    .rpt-section-hdr {
      font-size: 0.82rem; font-weight: 600; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.05em;
      margin: 1rem 0 0.4rem; padding-bottom: 0.25rem;
      border-bottom: 1px solid #2d2d4e;
    }
    .rpt-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; color: #cbd5e1; margin-bottom: 1rem; }
    .rpt-table td { padding: 0.3rem 0.5rem; }
    .rpt-table th {
      padding: 0.4rem 0.5rem; text-align: left;
      color: #94a3b8; font-size: 0.8rem; border-bottom: 1px solid #2d2d4e;
    }
    .rpt-num { text-align: right !important; font-variant-numeric: tabular-nums; }
    .rpt-sub td { color: #64748b; font-size: 0.83rem; padding-left: 1.25rem; }
    .rpt-total td { font-weight: 700; color: #a5b4fc; font-size: 0.95rem; }
    .rpt-section td {
      font-weight: 600; color: #94a3b8; font-size: 0.8rem;
      text-transform: uppercase; padding-top: 0.75rem;
    }
    .rpt-divider td { border-top: 1px solid #2d2d4e; padding: 0; height: 1px; }
    .rpt-grid { border: 1px solid #2d2d4e; border-radius: 6px; overflow: hidden; }
    .rpt-grid tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    .rpt-footer-row td {
      font-weight: 700; color: #a5b4fc; border-top: 1px solid #2d2d4e;
      padding: 0.4rem 0.5rem;
    }
    .rpt-empty { text-align: center; color: #475569; padding: 1.5rem !important; }

    @media print {
      .mr-overlay { position: static; background: white; }
      .mr-shell { width: 100%; height: auto; background: white; border: none; }
      .mr-header, .mr-menu { display: none !important; }
      .mr-content { color: black; }
      .rpt-table, .rpt-table td, .rpt-table th { color: black; border-color: #ccc; }
      .rpt-footer-row td { color: black; }
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
  readonly tableReport   = signal<TableReportDto | null>(null);

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

  isRightAlign(value: string): boolean {
    return /^-?[\d,]+(\.\d+)?$/.test((value ?? '').trim());
  }

  selectReport(item: MenuItemDto) {
    if (!SUPPORTED.has(item.menuID)) return;
    this.activeMenuID.set(item.menuID);
    this.reportLoading.set(true);
    this.reportKind.set('none');

    const setTable = (dto: TableReportDto) => {
      this.tableReport.set(dto);
      this.reportKind.set('table');
      this.reportLoading.set(false);
    };
    const setReading = (data: SalesReadingDto, title: string) => {
      this.readingData.set(data);
      this.reportTitle.set(title);
      this.reportKind.set('reading');
      this.reportLoading.set(false);
    };
    const onErr = () => this.reportLoading.set(false);

    switch (item.menuID) {
      case 17:
        this.reportSvc.getSalesReading(this.locationIDBilling, this.shiftNo, REPORT_CASHIER_READING)
          .subscribe({ next: d => setReading(d, 'CASHIER READING'), error: onErr });
        break;
      case 13:
        this.reportSvc.getSalesReading(this.locationIDBilling, this.shiftNo, REPORT_X_READING)
          .subscribe({ next: d => setReading(d, 'X READING'), error: onErr });
        break;
      case 14:
        this.reportSvc.getZReading(this.locationIDBilling, this.shiftNo)
          .subscribe({ next: d => setReading(d, 'Z READING'), error: onErr });
        break;
      case 1:
        this.reportSvc.getBillWiseAsTable(this.locationIDBilling, this.shiftNo)
          .subscribe({ next: setTable, error: onErr });
        break;
      case 40:
        this.reportSvc.getItemWiseAsTable(this.locationIDBilling, this.shiftNo)
          .subscribe({ next: setTable, error: onErr });
        break;
      case 43:
        this.reportSvc.getPendingItemWise(this.locationIDBilling)
          .subscribe({ next: setTable, error: onErr });
        break;
      case 41:
        this.reportSvc.getDayBook()
          .subscribe({ next: setTable, error: onErr });
        break;
      default: {
        const path = MENU_PATH[item.menuID];
        if (path) {
          this.reportSvc.getTableReport(path, this.locationIDBilling, this.shiftNo)
            .subscribe({ next: setTable, error: onErr });
        } else {
          this.reportLoading.set(false);
        }
        break;
      }
    }
  }

  clearReport() {
    this.reportKind.set('none');
    this.activeMenuID.set(null);
    this.readingData.set(null);
    this.tableReport.set(null);
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
