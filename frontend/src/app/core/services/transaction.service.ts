import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  AddItemRequest, BillSummaryDto, DiscountRequest,
  VoidItemRequest, ErrorCorrectRequest, VoidBillRequest,
  ChangePriceRequest, SaveInvoiceRequest, CancelInvoiceRequest, SendKotRequest,
  DecreaseQtyRequest, SplitQtyRequest, DiscountRemoveRequest
} from '../models/transaction.models';

const BASE = `${environment.apiUrl}/api/transaction`;

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);

  getBill(locationIDBilling: number, tableID: number, ticketID: number, receipt: string, decimalPoints = 2) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('tableID', tableID)
      .set('ticketID', ticketID)
      .set('receipt', receipt)
      .set('decimalPoints', decimalPoints);
    return this.http.get<BillSummaryDto>(`${BASE}/bill`, { params });
  }

  getBillTotal(receipt: string, decimalPoints = 2) {
    const params = new HttpParams().set('receipt', receipt).set('decimalPoints', decimalPoints);
    return this.http.get<{ total: number }>(`${BASE}/bill-total`, { params });
  }

  addItem(req: AddItemRequest) {
    return this.http.post<void>(`${BASE}/add-item`, req);
  }

  applyDiscount(req: DiscountRequest) {
    return this.http.post<void>(`${BASE}/discount`, req);
  }

  voidItem(req: VoidItemRequest) {
    return this.http.post<void>(`${BASE}/void-item`, req);
  }

  errorCorrect(req: ErrorCorrectRequest) {
    return this.http.post<void>(`${BASE}/error-correct`, req);
  }

  voidBill(req: VoidBillRequest) {
    return this.http.post<void>(`${BASE}/void-bill`, req);
  }

  changePrice(req: ChangePriceRequest) {
    return this.http.post<void>(`${BASE}/change-price`, req);
  }

  saveInvoice(req: SaveInvoiceRequest) {
    return this.http.post<{ receiptNo: string }>(`${BASE}/save-invoice`, req);
  }

  cancelInvoice(req: CancelInvoiceRequest) {
    return this.http.post<{ receiptNo: string }>(`${BASE}/cancel-invoice`, req);
  }

  sendKot(req: SendKotRequest) {
    return this.http.post<void>(`${BASE}/send-kot`, req);
  }

  decreaseQty(req: DecreaseQtyRequest) {
    return this.http.post<void>(`${BASE}/decrease-qty`, req);
  }

  splitQty(req: SplitQtyRequest) {
    return this.http.post<void>(`${BASE}/split-qty`, req);
  }

  removeDiscount(req: DiscountRemoveRequest) {
    return this.http.post<void>(`${BASE}/remove-discount`, req);
  }

  removeServiceCharge(locationIDBilling: number, tableID: number, ticketID: number) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('tableID', tableID)
      .set('ticketID', ticketID);
    return this.http.delete<void>(`${BASE}/service-charge`, { params });
  }

  saveStatus(receipt: string, transStatus: number, docNo = '') {
    return this.http.post<void>(`${BASE}/save-status`, { receipt, transStatus, docNo });
  }
}
