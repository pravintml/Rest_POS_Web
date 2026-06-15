import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderLineDto } from '../../../core/models/transaction.models';
import { PaymentLineDto } from '../../../core/models/payment.models';

export interface ReceiptData {
  receiptNo: string;
  zNo: number;
  date: string;
  cashier: string;
  unitNo: number;
  tableNo?: string;
  headerLines: string[];
  footerLines: string[];
  items: OrderLineDto[];
  payments: PaymentLineDto[];
  billTotal: number;
  totalPaid: number;
  change: number;
  decimalPoints: number;
}

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="receipt" id="receipt-print">
      <!-- Header -->
      <div class="r-header">
        @for (h of data.headerLines; track $index) {
          <div class="r-hline" [class.bold]="$index === 0">{{ h }}</div>
        }
      </div>
      <div class="r-divider">--------------------------------</div>

      <!-- Meta -->
      <div class="r-meta">
        <div class="r-meta-row"><span>Receipt#</span><span>{{ data.receiptNo }}</span></div>
        <div class="r-meta-row"><span>Date</span><span>{{ data.date }}</span></div>
        <div class="r-meta-row"><span>Cashier</span><span>{{ data.cashier }}</span></div>
        <div class="r-meta-row"><span>Unit</span><span>{{ data.unitNo }}</span></div>
        @if (data.tableNo) {
          <div class="r-meta-row"><span>Table</span><span>{{ data.tableNo }}</span></div>
        }
      </div>
      <div class="r-divider">--------------------------------</div>

      <!-- Items -->
      <div class="r-items">
        @for (item of data.items; track item.rowNo) {
          @if (item.documentID === 1 || item.documentID === 3) {
            <div class="r-item">
              <div class="r-item-name">{{ item.descrip }}</div>
              <div class="r-item-calc">
                <span>{{ item.qty | number:'1.0-3' }} × {{ item.price | number:'1.2-2' }}</span>
                <span class="r-item-nett">{{ item.nett | number:'1.' + dp + '-' + dp }}</span>
              </div>
              @if (item.discount > 0) {
                <div class="r-item-disc">Disc: -{{ item.discount | number:'1.2-2' }}</div>
              }
            </div>
          } @else if (item.documentID === 2 || item.documentID === 4) {
            <div class="r-item return">
              <div class="r-item-name">{{ item.descrip }} (RETURN)</div>
              <div class="r-item-calc">
                <span>{{ item.qty | number:'1.0-3' }} × {{ item.price | number:'1.2-2' }}</span>
                <span class="r-item-nett">-{{ item.nett | number:'1.' + dp + '-' + dp }}</span>
              </div>
            </div>
          }
        }
      </div>
      <div class="r-divider">================================</div>

      <!-- Totals -->
      <div class="r-totals">
        <div class="r-total-row bold"><span>TOTAL</span><span>{{ data.billTotal | number:'1.' + dp + '-' + dp }}</span></div>
      </div>
      <div class="r-divider">--------------------------------</div>

      <!-- Payments -->
      <div class="r-payments">
        @for (p of data.payments; track p.rowNo) {
          <div class="r-pay-row">
            <span>{{ p.descrip }}</span>
            <span>{{ p.amount | number:'1.2-2' }}</span>
          </div>
        }
        @if (data.change > 0) {
          <div class="r-pay-row change"><span>CHANGE</span><span>{{ data.change | number:'1.2-2' }}</span></div>
        }
      </div>
      <div class="r-divider">--------------------------------</div>

      <!-- Footer -->
      <div class="r-footer">
        @for (f of data.footerLines; track $index) {
          <div class="r-fline">{{ f }}</div>
        }
        <div class="r-fline r-zno">Z#: {{ data.zNo }}</div>
      </div>
    </div>
  `,
  styles: [`
    .receipt {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 302px;   /* 80mm ≈ 302px @96dpi */
      margin: 0 auto;
      padding: 8px 4px;
      background: #fff;
      color: #000;
    }
    .r-header { text-align: center; margin-bottom: 4px; }
    .r-hline { line-height: 1.4; }
    .bold, .r-hline.bold { font-weight: bold; font-size: 14px; }
    .r-divider { text-align: center; margin: 4px 0; font-size: 11px; }
    .r-meta { margin: 4px 0; }
    .r-meta-row { display: flex; justify-content: space-between; }
    .r-items { margin: 4px 0; }
    .r-item { margin-bottom: 4px; }
    .r-item.return { color: #555; }
    .r-item-name { font-weight: 600; }
    .r-item-calc { display: flex; justify-content: space-between; }
    .r-item-nett { font-weight: 600; }
    .r-item-disc { font-size: 11px; color: #777; padding-left: 8px; }
    .r-totals { margin: 4px 0; }
    .r-total-row { display: flex; justify-content: space-between; font-size: 13px; }
    .r-payments { margin: 4px 0; }
    .r-pay-row { display: flex; justify-content: space-between; }
    .r-pay-row.change { font-weight: bold; }
    .r-footer { text-align: center; margin-top: 4px; }
    .r-fline { line-height: 1.4; }
    .r-zno { margin-top: 4px; font-size: 11px; color: #555; }

    @media print {
      .receipt {
        width: 100%;
        font-size: 11pt;
        page-break-after: always;
      }
    }
  `]
})
export class ReceiptComponent {
  @Input() data!: ReceiptData;
  get dp() { return this.data?.decimalPoints ?? 2; }
}
