import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  MenuItemDto, SalesReadingDto, BillWiseRow, ItemWiseRow
} from '../models/report.models';

const BASE = `${environment.apiUrl}/api/report`;

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  getMenuItems() {
    return this.http.get<MenuItemDto[]>(`${BASE}/menu-items`);
  }

  getSalesReading(locationIDBilling: number, shiftNo: number, reportType: number) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('shiftNo', shiftNo)
      .set('reportType', reportType);
    return this.http.get<SalesReadingDto>(`${BASE}/sales-reading`, { params });
  }

  getBillWise(locationIDBilling: number, shiftNo: number) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('shiftNo', shiftNo);
    return this.http.get<BillWiseRow[]>(`${BASE}/bill-wise`, { params });
  }

  getItemWise(locationIDBilling: number, shiftNo: number) {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('shiftNo', shiftNo);
    return this.http.get<ItemWiseRow[]>(`${BASE}/item-wise`, { params });
  }
}
