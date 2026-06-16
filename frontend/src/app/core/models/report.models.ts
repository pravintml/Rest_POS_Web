export interface MenuItemDto {
  menuID: number;
  menuName: string;
  lNo: number;
}

export interface PaymentLineItem {
  payType: string;
  amount: number;
  count: number;
}

export interface SalesReadingDto {
  grossSale: number;
  refunds: number;
  nRefunds: number;
  itemDiscount: number;
  subtotalDiscount: number;
  serviceCharge: number;
  voids: number;
  nVoids: number;
  cancel: number;
  nCancel: number;
  netSales: number;
  noOfBills: number;
  payments: PaymentLineItem[];
  generatedAt: string;
}

export interface BillWiseRow {
  receipt: string;
  cashier: string;
  amount: number;
  payType: string;
}

export interface ItemWiseRow {
  category: string;
  itemName: string;
  qty: number;
  amount: number;
}

// Report type constants matching backend ReportType param
export const REPORT_CASHIER_READING = 1;
export const REPORT_X_READING       = 2;
