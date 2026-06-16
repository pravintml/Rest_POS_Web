import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MenuItemDto, SalesReadingDto, BillWiseRow, ItemWiseRow,
  TableReportDto, ReportSection
} from '../models/report.models';

const BASE = `${environment.apiUrl}/api/report`;
const fmt2 = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  getZReading(locationIDBilling: number, shiftNo: number): Observable<SalesReadingDto> {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('shiftNo', shiftNo);
    return this.http.get<SalesReadingDto>(`${BASE}/z-reading`, { params });
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

  // ── Generic table report ─────────────────────────────────────────────────
  getTableReport(path: string, locationIDBilling: number, shiftNo: number): Observable<TableReportDto> {
    const params = new HttpParams()
      .set('locationIDBilling', locationIDBilling)
      .set('shiftNo', shiftNo);
    return this.http.get<TableReportDto>(`${BASE}/${path}`, { params });
  }

  getPendingItemWise(locationIDBilling: number): Observable<TableReportDto> {
    const params = new HttpParams().set('locationIDBilling', locationIDBilling);
    return this.http.get<TableReportDto>(`${BASE}/pending-item-wise`, { params });
  }

  getDayBook(): Observable<TableReportDto> {
    return this.http.get<TableReportDto>(`${BASE}/day-book`);
  }

  // ── Adapters: convert existing typed endpoints to TableReportDto ──────────
  getBillWiseAsTable(locationIDBilling: number, shiftNo: number): Observable<TableReportDto> {
    return this.getBillWise(locationIDBilling, shiftNo).pipe(map(rows => ({
      reportTitle: 'Bill Wise Report',
      generatedAt: new Date().toLocaleString(),
      sections: [{
        title: 'Bills',
        headers: ['Receipt', 'Cashier', 'Pay Type', 'Amount'],
        rows: rows.map(r => [r.receipt, r.cashier, r.payType, fmt2(r.amount)]),
        footer: ['', '', 'TOTAL', fmt2(rows.reduce((s, r) => s + r.amount, 0))]
      } as ReportSection]
    })));
  }

  getItemWiseAsTable(locationIDBilling: number, shiftNo: number): Observable<TableReportDto> {
    return this.getItemWise(locationIDBilling, shiftNo).pipe(map(rows => ({
      reportTitle: 'Item Wise Sales Report',
      generatedAt: new Date().toLocaleString(),
      sections: [{
        title: 'Items',
        headers: ['Category', 'Item', 'Qty', 'Amount'],
        rows: rows.map(r => [r.category, r.itemName, r.qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }), fmt2(r.amount)]),
        footer: ['', 'TOTAL', '', fmt2(rows.reduce((s, r) => s + r.amount, 0))]
      } as ReportSection]
    })));
  }
}
