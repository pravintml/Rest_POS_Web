// ── Order line as returned by GET /api/transaction/bill ─────────────────────
export interface OrderLineDto {
  productID: number;
  productCode: string;
  descrip: string;
  price: number;
  qty: number;
  discount: number;
  discountPct: number;
  nett: number;
  documentID: number;
  rowNo: number;
  isPrinted: boolean;
  taxAmount: number;
  isTax: boolean;
  taxPercentage: number;
  itemComment: string;
  tagNo: string;
}

export interface BillSummaryDto {
  items: OrderLineDto[];
  billTotal: number;
  stewardID: string;
  stewardName: string;
  orderStart: string;
  tagNo: string;
  mobileNo: string;
  pieces: number;
  soldQty: number;
  packs: number;
}

// ── Request bodies ────────────────────────────────────────────────────────────
export interface AddItemRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  productID: number;
  productCode: string;
  refCode: string;
  barCodeFull: number;
  descrip: string;
  cost: number;
  price: number;
  qty: number;
  documentID: number;       // 1=Sale, 2=Return
  receipt: string;
  cashierID: number;
  cashier: string;
  unitNo: number;
  billTypeID: number;
  saleTypeID: number;
  baseUnitID: number;
  unitOfMeasureID: number;
  unitOfMeasureName: string;
  convertFactor: number;
  batchNo: string;
  serialNo: string;
  expiaryDate: string | null;
  isTax: boolean;
  taxPercentage: number;
  salesmanID: number;
  salesman: string;
  customerID: number;
  customer: string;
  isStock: boolean;
  customerType: number;
  transStatus: number;
  isPromotion: boolean;
  fixedDiscount: number;
  fixedDiscountPercentage: number;
  promotionID: number;
  orderTerminalID: number;
  orderNo: number;
  isNew: boolean;
  stewardID: number;
  stewardName: string;
  currentRowNo: number;
  tagNo: string;
  mobileNo: string;
}

export interface DiscountRequest {
  locationID: number;
  documentID: number;
  receipt: string;
  cashierID: number;
  cashier: string;
  unitNo: number;
  discount: number;
  isPercentage: boolean;
  isSubTotal: boolean;
  discountID: number;
  netAmount: number;
  billTypeID: number;
  saleTypeID: number;
  customerID: number;
  decimalPointsCurrency: number;
  customerType: number;
  transStatus: number;
  isPromotion: boolean;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  rowNo: number;
}

export interface VoidItemRequest {
  locationID: number;
  productID: number;
  qty: number;
  documentID: number;
  receipt: string;
  cashierID: number;
  cashier: string;
  unitNo: number;
  rowNo: number;
  isBillSeek: boolean;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  appUserName: string;
}

export interface ErrorCorrectRequest {
  locationID: number;
  productID: number;
  qty: number;
  documentID: number;
  receipt: string;
  cashierID: number;
  cashier: string;
  unitNo: number;
  rowNo: number;
}

export interface VoidBillRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
}

export interface ChangePriceRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  productID: number;
  rowNo: number;
  price: number;
}

export interface SaveInvoiceRequest {
  locationID: number;
  receipt: string;
  unitNo: number;
  cashierID: number;
  customerID: number;
  customerType: number;
  customerCode: string;
  amount: number;
  loyaltyType: number;
  encodedName: string;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
}

export interface CancelInvoiceRequest {
  locationID: number;
  unitNo: number;
  cashierID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
}

export interface SendKotRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  orderTerminalID: number;
}

export interface LayawayRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
}

export interface CustomerCopyRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
}

export interface DecreaseQtyRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  productID: number;
  rowNo: number;
}

export interface SplitQtyRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  productID: number;
  rowNo: number;
  qty: number;
}

export interface DiscountRemoveRequest {
  locationID: number;
  productCode: string;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  rowNo: number;
  receipt: string;
  stewardID: number;
  stewardName: string;
  serviceCharge: number;
  decimalPointsCurrency: number;
}

/** Sent to POST /api/transaction/service-charge. LocationID/CashierID/Cashier/UnitNo are overridden from JWT on the backend. */
export interface ServiceChargeUpdateRequest {
  cashier: string;              // '' — overridden from JWT
  receipt: string;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  stewardID: number;
  stewardName: string;
  serviceCharge: number;
  decimalPointsCurrency: number;
}

export interface ItemCommentRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  rowNo: number;
  productID: number;
  itemComment: string;
}

export interface TagRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  tagNo: string;
}

export interface PacksRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  packs: number;
}

export interface MobileNoRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  mobileNo: string;
}

export interface MoveItemsRequest {
  locationID: number;
  cashierID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  rowNo: number;
  newTicketID: number;
}

export interface MergeTableRequest {
  locationID: number;
  cashierID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
  tableIDToBeMerged: number;
  locationIDBillingToBeMerged: number;
  ticketIDToBeMerged: number;
}

export interface ChangeTableRequest {
  locationID: number;
  cashierID: number;
  locationIDBilling: number;
  tableIDToBeChanged: number;
  tableID: number;
  ticketID: number;
  locationIDBillingToBeChanged: number;
}

export interface ShiftEndRequest {
  locationID: number;
  cashierID: number;
  locationIDBilling: number;
  amount: number;
  dayEnd: string;
  unitNo: number;
}
