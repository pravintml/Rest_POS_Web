import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProductMaster } from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getByCode(code: string) {
    return this.http.get<ProductMaster>(`${environment.apiUrl}/api/product/by-code/${encodeURIComponent(code)}`);
  }

  getByBarcode(barcode: string) {
    return this.http.get<ProductMaster>(`${environment.apiUrl}/api/product/by-barcode/${encodeURIComponent(barcode)}`);
  }

  getByCategory(categoryId: number) {
    return this.http.get<ProductMaster[]>(`${environment.apiUrl}/api/product/by-category/${categoryId}`);
  }
}
