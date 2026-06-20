import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  BillingLocation, TableInfo, Steward,
  ItemLayer1, ItemLayer2, TicketInfo, ItemCommentOption, DiscountType
} from '../models/master.models';

@Injectable({ providedIn: 'root' })
export class MasterService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/master`;

  getBillingLocations() {
    return this.http.get<BillingLocation[]>(`${this.base}/billing-locations`);
  }

  getTables(billingLocationId: number) {
    return this.http.get<TableInfo[]>(`${this.base}/tables`, {
      params: { billingLocationId }
    });
  }

  getStewards() {
    return this.http.get<Steward[]>(`${this.base}/stewards`);
  }

  getItemComments() {
    return this.http.get<ItemCommentOption[]>(`${this.base}/item-comments`);
  }

  getItemLayer1() {
    return this.http.get<ItemLayer1[]>(`${this.base}/item-layer1`);
  }

  getItemLayer2(layer1Id: number) {
    return this.http.get<ItemLayer2[]>(`${this.base}/item-layer2`, {
      params: { layer1Id }
    });
  }

  getTickets(billingLocationId: number, tableId: number) {
    return this.http.get<TicketInfo[]>(`${this.base}/tickets`, {
      params: { billingLocationId, tableId }
    });
  }

  allocateTicket() {
    return this.http.post<{ ticketId: number }>(`${this.base}/new-ticket`, {});
  }

  getDiscountTypes() {
    return this.http.get<DiscountType[]>(`${this.base}/discount-types`);
  }
}
