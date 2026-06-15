export interface ProductMaster {
  productID: number;
  locationID: number;
  productCode: string;
  refCode: string;
  barCode: string;
  productName: string;
  nameOnInvoice: string;
  departmentID: number;
  categoryID: number;
  subCategoryID: number;
  sellingPrice: number;
  costPrice: number;
  minimumPrice: number;
  fixedDiscount: number;
  maximumDiscount: number;
  fixedDiscountPercentage: number;
  maximumDiscountPercentage: number;
  isTax: boolean;
  isActive: boolean;
  isBatch: boolean;
  isPromotion: boolean;
  orderTerminalID: number;
}

export interface OrderItem {
  productID: number;
  productCode: string;
  productName: string;
  qty: number;
  price: number;
  discount: number;
  discountPct: number;
  tax: number;
  lineTotal: number;
  isTax: boolean;
  orderTerminalID: number;
}
