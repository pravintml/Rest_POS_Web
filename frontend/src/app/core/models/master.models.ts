export interface BillingLocation {
  locationId: number;
  name: string;
}

export interface TableInfo {
  tableID: number;
  tableName: string;
}

export interface Steward {
  stewardID: number;
  stewardName: string;
}

export interface ItemLayer1 {
  itemLayer1ID: number;
  itemLayer1Name: string;
}

export interface ItemLayer2 {
  itemLayer2ID: number;
  itemLayer2Name: string;
}

export interface TicketInfo {
  ticketID: number;
  amount: number;
  stewardID: number;
  stewardName: string;
}

export interface TouchProduct {
  productID: number;
  productName: string;
}

export interface ItemCommentOption {
  commentID: number;
  comment: string;
}
