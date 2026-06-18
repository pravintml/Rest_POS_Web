import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  AddItemRequest, BillSummaryDto, DiscountRequest,
  VoidItemRequest, ErrorCorrectRequest, VoidBillRequest,
  ChangePriceRequest, SaveInvoiceRequest, CancelInvoiceRequest, SendKotRequest,
  DecreaseQtyRequest, SplitQtyRequest, DiscountRemoveRequest,
  ItemCommentRequest, TagRequest, PacksRequest, MobileNoRequest,
  MoveItemsRequest, MergeTableRequest, ChangeTableRequest, ShiftEndRequest,
  ServiceChargeUpdateRequest
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

  updateServiceCharge(req: ServiceChargeUpdateRequest) {
    return this.http.post<void>(`${BASE}/service-charge`, req);
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

  getItemComment(locationIDBilling: number, tableID: number, ticketID: number, rowNo: number, productID: number) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('tableID', tableID)
      .set('ticketID', ticketID)
      .set('rowNo', rowNo)
      .set('productID', productID);
    return this.http.get<{ comment: string }>(`${BASE}/item-comment`, { params });
  }

  updateItemComment(req: ItemCommentRequest) {
    return this.http.put<void>(`${BASE}/item-comment`, req);
  }

  updateTag(req: TagRequest) {
    return this.http.post<void>(`${BASE}/tag`, req);
  }

  updatePacks(req: PacksRequest) {
    return this.http.post<void>(`${BASE}/packs`, req);
  }

  updateMobileNo(req: MobileNoRequest) {
    return this.http.post<void>(`${BASE}/mobile-no`, req);
  }

  moveItems(req: MoveItemsRequest) {
    return this.http.post<void>(`${BASE}/move-items`, req);
  }

  mergeTable(req: MergeTableRequest) {
    return this.http.post<void>(`${BASE}/merge-table`, req);
  }

  changeTable(req: ChangeTableRequest) {
    return this.http.post<void>(`${BASE}/change-table`, req);
  }

  isCustomerCopyPrinted(locationIDBilling: number, tableID: number, ticketID: number) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('tableID', tableID)
      .set('ticketID', ticketID);
    return this.http.get<{ printed: boolean }>(`${BASE}/customer-copy-printed`, { params });
  }

  shiftEnd(req: ShiftEndRequest) {
    return this.http.post<void>(`${BASE}/shift-end`, req);
  }
}
