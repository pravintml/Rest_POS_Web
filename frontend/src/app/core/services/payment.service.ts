import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  PayTypeDto, PaymentSummaryDto, AddPaymentRequest,
  ClearPaymentRequest, SuspendRequest, RecallRequest, SuspendListItem
} from '../models/payment.models';

const BASE = `${environment.apiUrl}/api/payment`;

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  getPayTypes() {
    return this.http.get<PayTypeDto[]>(`${BASE}/types`);
  }

  getPaymentSummary(locationIDBilling: number, tableID: number, ticketID: number, receipt: string, billTotal: number) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('tableID', tableID)
      .set('ticketID', ticketID)
      .set('receipt', receipt)
      .set('billTotal', billTotal);
    return this.http.get<PaymentSummaryDto>(`${BASE}/summary`, { params });
  }

  addPayment(req: AddPaymentRequest) {
    return this.http.post<void>(`${BASE}/add`, req);
  }

  clearPayment(req: ClearPaymentRequest) {
    return this.http.post<void>(`${BASE}/clear`, req);
  }

  // ── Suspend / Recall ──────────────────────────────────────────────────────
  getSuspendList() {
    return this.http.get<SuspendListItem[]>(`${BASE}/suspend/list`);
  }

  suspendInvoice(req: SuspendRequest) {
    return this.http.post<{ suspendNo: string }>(`${BASE}/suspend`, req);
  }

  recallInvoice(req: RecallRequest) {
    return this.http.post<void>(`${BASE}/recall`, req);
  }
}
