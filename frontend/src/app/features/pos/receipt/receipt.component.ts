import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderLineDto } from '../../../core/models/transaction.models';
import { PaymentLineDto } from '../../../core/models/payment.models';

export interface ReceiptData {
  receiptNo: string;
  zNo: number;
  date: string;
  time?: string;
  cashier: string;
  unitNo: number;
  tableNo?: string;
  stewardName?: string;
  tagNo?: string;
  ticketID?: number;
  type?: string;         // billing location name e.g. 'TAKE AWAY' — shown as TYPE row
  label?: string;        // 'COPY' | 'REPRINTED' | '' — shown centred bold after divider
  headerLines: string[];
  footerLines: string[];
  items: OrderLineDto[];
  payments: PaymentLineDto[];
  billTotal: number;
  totalPaid: number;
  change: number;
  decimalPoints: number;
  soldQty?: number;
  pieces?: number;
  totalDiscount?: number;
}

interface Row {
  k: 'txt' | 'pair' | 'div' | 'chr' | 'nm' | 'itm' | 'dsc' | 'sub' | 'pay' | 'bal';
  v?: string;          // txt, nm
  center?: boolean;    // txt
  bold?: boolean;      // txt, pair
  l?: string;          // pair
  r?: string;          // pair
  nm?: string;         // itm
  pr?: number;         // itm
  qt?: number;         // itm
  am?: number;         // itm, dsc, sub, pay, bal
  neg?: boolean;       // itm, dsc
  lb?: string;         // dsc, pay
  pct?: number;        // dsc
  ref?: string;        // pay
  pid?: number;        // pay
}

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="receipt" id="receipt-print">
      @for (row of rows; track $index) {
        @switch (row.k) {

          @case ('txt') {
            <div class="r-txt"
                 [class.r-center]="row.center"
                 [class.r-bold]="row.bold">{{ row.v }}</div>
          }

          @case ('pair') {
            <div class="r-pair" [class.r-bold]="row.bold">
              <span>{{ row.l }}</span><span>{{ row.r }}</span>
            </div>
          }

          @case ('div') {
            <div class="r-div">----------------------------------------</div>
          }

          @case ('chr') {
            <div class="r-chr r-cols">
              <span class="c-nm">ITEM</span>
              <span class="c-pr">PRICE</span>
              <span class="c-qt">QTY</span>
              <span class="c-am">AMOUNT</span>
            </div>
          }

          @case ('nm') {
            <div class="r-nm">{{ row.v }}</div>
          }

          @case ('itm') {
            <div class="r-cols" [class.r-neg]="row.neg">
              <span class="c-nm">{{ row.nm }}</span>
              <span class="c-pr">{{ row.pr | number:'1.'+dp+'-'+dp }}</span>
              <span class="c-qt">{{ row.qt | number:'1.0-3' }}</span>
              <span class="c-am">{{ row.neg ? '-' : '' }}{{ row.am | number:'1.'+dp+'-'+dp }}</span>
            </div>
          }

          @case ('dsc') {
            <div class="r-dsc">
              <span class="c-dl">{{ row.lb }}</span>
              <span class="c-dp">{{ row.pct ? (row.pct | number:'1.0-2') + '%' : '' }}</span>
              <span class="c-da">{{ row.neg ? '-' : '' }}{{ row.am | number:'1.'+dp+'-'+dp }}</span>
            </div>
          }

          @case ('sub') {
            <div class="r-sub">
              <span>SUB TOTAL</span>
              <span>{{ row.am | number:'1.'+dp+'-'+dp }}</span>
            </div>
          }

          @case ('pay') {
            <div class="r-pay">
              <span>{{ row.lb }}{{ row.ref ? '  ' + row.ref : '' }}</span>
              <span>{{ row.am | number:'1.'+dp+'-'+dp }}</span>
            </div>
          }

          @case ('bal') {
            <div class="r-pay r-bold">
              <span>BALANCE</span>
              <span>{{ row.am | number:'1.'+dp+'-'+dp }}</span>
            </div>
          }

        }
      }
    </div>
  `,
  styles: [`
    .receipt {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 302px;
      margin: 0 auto;
      padding: 8px 4px;
      background: #fff;
      color: #000;
      line-height: 1.5;
    }

    /* ── generic helpers ─────────────────────── */
    .r-bold  { font-weight: bold; }
    .r-center { text-align: center; }
    .r-neg   { color: #555; }

    /* ── text row ───────────────────────────── */
    .r-txt { line-height: 1.4; }

    /* ── two-column pair ────────────────────── */
    .r-pair { display: flex; justify-content: space-between; white-space: pre; }

    /* ── divider ────────────────────────────── */
    .r-div { text-align: center; font-size: 11px; margin: 1px 0; }

    /* ── column header + item rows ──────────── */
    .r-cols {
      display: grid;
      grid-template-columns: 12ch 10ch 7ch 1fr;
    }
    .r-chr { font-size: 11px; margin-bottom: 1px; }
    .c-nm { overflow: hidden; text-overflow: clip; white-space: nowrap; }
    .c-pr { text-align: right; }
    .c-qt { text-align: right; }
    .c-am { text-align: right; }

    /* ── overflow item name row ─────────────── */
    .r-nm { padding-left: 0; }

    /* ── discount / SC line ─────────────────── */
    .r-dsc {
      display: grid;
      grid-template-columns: 1fr 8ch 9ch;
      padding-left: 2ch;
      font-size: 11px;
    }
    .c-dl { overflow: hidden; white-space: nowrap; }
    .c-dp { text-align: right; }
    .c-da { text-align: right; }

    /* ── SUB TOTAL row ──────────────────────── */
    .r-sub {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
    }

    /* ── payment / balance rows ─────────────── */
    .r-pay {
      display: flex;
      justify-content: space-between;
    }

    /* ── print media ────────────────────────── */
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

  get dp(): number { return this.data?.decimalPoints ?? 2; }

  get rows(): Row[] {
    const d = this.data;
    if (!d) return [];
    const dp = this.dp;
    const rows: Row[] = [];

    // ── HEADER (Head1-N, centered; first line bold) ──────────────────────
    d.headerLines.forEach((h, i) =>
      rows.push({ k: 'txt', v: h, center: true, bold: i === 0 })
    );

    // ── META ─────────────────────────────────────────────────────────────
    rows.push({
      k: 'pair',
      l: `CASHIER  : ${d.cashier}`,
      r: d.stewardName ? `STEWARD: ${d.stewardName}` : ''
    });
    rows.push({
      k: 'pair',
      l: `UNIT   : ${d.unitNo}`,
      r: `RECEIPT: ${d.receiptNo}`
    });
    if (d.type) {
      rows.push({ k: 'div' });
      rows.push({
        k: 'pair',
        l: `TYPE    : ${d.type}`,
        r: d.tableNo ? `TABLE: ${d.tableNo}` : ''
      });
    } else if (d.tableNo) {
      rows.push({ k: 'pair', l: `TABLE   : ${d.tableNo}`, r: '' });
    }
    if (d.tagNo !== undefined || d.ticketID !== undefined) {
      rows.push({
        k: 'pair',
        l: `TAG #   : ${d.tagNo ?? ''}`,
        r: `REF # : ${d.ticketID ?? 0}`
      });
    }

    // ── DIVIDER + optional COPY / REPRINTED label ─────────────────────────
    rows.push({ k: 'div' });
    if (d.label) {
      rows.push({ k: 'txt', v: d.label, center: true, bold: true });
      rows.push({ k: 'txt', v: '' });
    }

    // ── COLUMN HEADER ─────────────────────────────────────────────────────
    rows.push({ k: 'chr' });
    rows.push({ k: 'div' });

    // ── ITEMS ─────────────────────────────────────────────────────────────
    let running = 0;
    for (const item of d.items) {
      const doc = item.documentID;

      if (doc === 1 || doc === 3) {
        // Sale: name on its own line when > 12 chars
        if (item.descrip.length > 12) {
          rows.push({ k: 'nm', v: item.descrip });
          rows.push({ k: 'itm', nm: '', pr: item.price, qt: item.qty, am: item.price * item.qty, neg: false });
        } else {
          rows.push({ k: 'itm', nm: item.descrip, pr: item.price, qt: item.qty, am: item.price * item.qty, neg: false });
        }
        if (item.discount > 0) {
          rows.push({ k: 'dsc', lb: 'DISCOUNT', pct: item.discountPct, am: item.discount, neg: true });
        }
        running += item.nett;

      } else if (doc === 2 || doc === 4) {
        // Return
        if (item.descrip.length > 12) {
          rows.push({ k: 'nm', v: item.descrip });
          rows.push({ k: 'itm', nm: '', pr: item.price, qt: item.qty, am: item.price * item.qty, neg: true });
        } else {
          rows.push({ k: 'itm', nm: item.descrip, pr: item.price, qt: item.qty, am: item.price * item.qty, neg: true });
        }
        running -= item.nett;

      } else if (doc === 6) {
        // Bill-level discount — show SUB TOTAL first, then discount line
        rows.push({ k: 'div' });
        rows.push({ k: 'sub', am: running });
        rows.push({ k: 'dsc', lb: item.descrip || 'DISCOUNT', pct: item.discountPct, am: item.nett, neg: true });
        running -= item.nett;

      } else if (doc === 10) {
        // Service charge — show SUB TOTAL first, then SC line
        rows.push({ k: 'div' });
        rows.push({ k: 'sub', am: running });
        rows.push({
          k: 'dsc',
          lb: item.descrip || 'SERVICE CHARGE',
          pct: item.taxPercentage || item.discountPct,
          am: item.nett,
          neg: false
        });
        running += item.nett;
      }
    }

    // ── PAYMENTS (SUB TOTAL before each tender) ───────────────────────────
    let balance = running;   // equals d.billTotal after items loop
    let lastPid = 0;
    for (const pay of d.payments) {
      const refLabel = pay.refNo ? pay.refNo.slice(-4).padStart(4, 'X') : '';
      rows.push({ k: 'div' });
      rows.push({ k: 'sub', am: balance });
      rows.push({ k: 'pay', lb: pay.descrip, ref: refLabel, pid: pay.payTypeID, am: pay.amount });
      balance -= pay.amount;
      lastPid = pay.payTypeID;
    }

    // BALANCE — only for CASH (payTypeID=1) when balance <= 0
    if (d.payments.length > 0 && balance <= 0 && lastPid === 1) {
      rows.push({ k: 'div' });
      rows.push({ k: 'bal', am: Math.abs(balance) });
    } else {
      rows.push({ k: 'div' });
    }

    // ── SUMMARY ───────────────────────────────────────────────────────────
    rows.push({ k: 'txt', v: '' });
    const soldQty = d.soldQty
      ?? d.items.filter(i => i.documentID === 1 || i.documentID === 3).length;
    const pieces = d.pieces
      ?? d.items
           .filter(i => i.documentID === 1 || i.documentID === 3)
           .reduce((s, i) => s + i.qty, 0);
    rows.push({ k: 'pair', l: `No Of Items : ${soldQty}`, r: `No Of Pcs : ${pieces}` });
    rows.push({ k: 'pair', l: `Date : ${d.date}`, r: d.time ? `Time : ${d.time}` : '' });

    if (d.totalDiscount && d.totalDiscount > 0) {
      rows.push({ k: 'txt', v: '' });
      rows.push({ k: 'txt', v: `YOUR SAVINGS  ${d.totalDiscount.toFixed(dp)}`, center: true, bold: true });
    }

    // ── FOOTER ────────────────────────────────────────────────────────────
    if (d.footerLines.length) {
      rows.push({ k: 'div' });
      d.footerLines.forEach(f => rows.push({ k: 'txt', v: f, center: true }));
    }
    rows.push({ k: 'txt', v: '' });
    rows.push({ k: 'txt', v: `Z# : ${d.zNo}`, center: true });
    rows.push({ k: 'txt', v: '(c) 2017 SOFTVINZ', center: true });

    return rows;
  }
}
