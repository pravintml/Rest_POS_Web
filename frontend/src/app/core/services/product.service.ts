import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProductMaster } from '../models/product.models';
import { TouchProduct } from '../models/master.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/product`;

  getByCode(code: string, billingLocationId = 0) {
    return this.http.get<ProductMaster>(
      `${this.base}/by-code/${encodeURIComponent(code)}`,
      { params: { billingLocationId } }
    );
  }

  getByBarcode(barcode: string, billingLocationId = 0) {
    return this.http.get<ProductMaster>(
      `${this.base}/by-barcode/${encodeURIComponent(barcode)}`,
      { params: { billingLocationId } }
    );
  }

  getById(productId: number, billingLocationId: number) {
    return this.http.get<ProductMaster>(
      `${this.base}/by-id/${productId}`,
      { params: { billingLocationId } }
    );
  }

  getTouchProducts(layer1Id?: number, layer2Id?: number) {
    const params: Record<string, number> = {};
    if (layer1Id) params['layer1Id'] = layer1Id;
    if (layer2Id) params['layer2Id'] = layer2Id;
    return this.http.get<TouchProduct[]>(`${this.base}/touch`, { params });
  }
}
