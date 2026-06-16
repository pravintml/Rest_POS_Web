export interface PayTypeDto {
  payTypeID: number;
  payTypeName: string;
  isActive: boolean;
  type: number;     // 0=Cash, 1=Card(needs RefNo), 6=Other
  isSwipe: boolean;
}

export interface PaymentNoteDto {
  note: number;
}

export interface PaymentLineDto {
  payTypeID: number;
  descrip: string;
  amount: number;
  refNo: string;
  rowNo: number;
}

export interface PaymentSummaryDto {
  totalPaid: number;
  billTotal: number;
  change: number;
  lines: PaymentLineDto[];
}

export interface AddPaymentRequest {
  locationID: number;
  receipt: string;
  unitNo: number;
  billTypeID: number;
  saleTypeID: number;
  cashierID: number;
  payTypeID: number;
  amount: number;
  balance: number;
  refNo: string;
  bankID: number;
  terminalID: number;
  chequeDate: string | null;
  isRecallAdv: boolean;
  recallNo: string;
  descrip: string;
  enCodeName: string;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
}

export interface ClearPaymentRequest {
  locationID: number;
  locationIDBilling: number;
  tableID: number;
  ticketID: number;
}

export interface SuspendRequest {
  locationID: number;
  receipt: string;
  unitNo: number;
  cashierID: number;
  amount: number;
  transStatus: number;
}

export interface RecallRequest {
  locationID: number;
  receipt: string;
  unitNo: number;
  cashierID: number;
  cashier: string;
  recallNo: string;
  recallUnitNo: number;
}

export interface SuspendListItem {
  suspendNo: string;
  unitNo: number;
  amount: number;
  suspendTime: string;
  transStatus: number;
}
