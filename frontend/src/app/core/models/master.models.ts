export interface BillingLocation {
  locationId: number;
  name: string;
}

// Mirrors RefreshTables() legacy coloring: Available=0, Occupied=1, MultiOccupied=2, Printed=3
export enum TableStatus { Available = 0, Occupied = 1, MultiOccupied = 2, Printed = 3 }

export interface TableInfo {
  tableID: number;
  tableName: string;
  status: TableStatus;
  tickets: number;
  stewardName: string;
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
