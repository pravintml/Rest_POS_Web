namespace RestPos.Domain.Dtos;

// ── Requests ────────────────────────────────────────────────────────────────

public record AddItemRequest(
    int LocationID,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    long ProductID,
    string ProductCode,
    string RefCode,
    long BarCodeFull,
    string Descrip,
    decimal Cost,
    decimal Price,
    decimal Qty,
    int DocumentID,       // 1=Sale, 2=Return, 3=ExchSale, 4=ExchReturn
    string Receipt,
    long CashierID,
    string Cashier,
    int UnitNo,
    int BillTypeID,
    int SaleTypeID,
    long BaseUnitID,
    long UnitOfMeasureID,
    string UnitOfMeasureName,
    decimal ConvertFactor,
    string BatchNo,
    string SerialNo,
    DateTime? ExpiaryDate,
    bool IsTax,
    decimal TaxPercentage,
    long SalesmanID,
    string Salesman,
    long CustomerID,
    string Customer,
    bool IsStock,
    int CustomerType,
    int TransStatus,
    bool IsPromotion,
    decimal FixedDiscount,
    decimal FixedDiscountPercentage,
    long PromotionID,
    long OrderTerminalID,
    long OrderNo,
    bool IsNew,
    int StewardID,
    string StewardName,
    int CurrentRowNo,
    string TagNo,
    string MobileNo
);

public record DiscountRequest(
    int LocationID,
    int DocumentID,
    string Receipt,
    long CashierID,
    string Cashier,
    int UnitNo,
    decimal Discount,
    bool IsPercentage,
    bool IsSubTotal,
    int DiscountID,       // 1-5=line level, 0=subtotal
    decimal NetAmount,
    int BillTypeID,
    int SaleTypeID,
    long CustomerID,
    int DecimalPointsCurrency,
    int CustomerType,
    int TransStatus,
    bool IsPromotion,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    long RowNo
);

public record VoidItemRequest(
    int LocationID,
    long ProductID,
    decimal Qty,
    int DocumentID,
    string Receipt,
    long CashierID,
    string Cashier,
    int UnitNo,
    long RowNo,
    bool IsBillSeek,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    string AppUserName
);

public record ErrorCorrectRequest(
    int LocationID,
    long ProductID,
    decimal Qty,
    int DocumentID,
    string Receipt,
    long CashierID,
    string Cashier,
    int UnitNo,
    long RowNo
);

public record VoidBillRequest(
    int LocationID,
    int LocationIDBilling,
    int TableID,
    long TicketID
);

public record ChangePriceRequest(
    int LocationID,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    long ProductID,
    long RowNo,
    decimal Price
);

public record DecreaseQtyRequest(
    int LocationID,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    long ProductID,
    long RowNo
);

public record SplitQtyRequest(
    int LocationID,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    long ProductID,
    long RowNo,
    decimal Qty
);

public record DiscountRemoveRequest(
    int LocationID,
    string ProductCode,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    long RowNo
);

public record SuspendRequest(
    int LocationID,
    string Receipt,
    int UnitNo,
    long CashierID,
    decimal Amount,
    int TransStatus
);

public record RecallRequest(
    int LocationID,
    string Receipt,
    int UnitNo,
    long CashierID,
    string Cashier,
    string RecallNo,
    int RecallUnitNo
);

public record SaveInvoiceRequest(
    int LocationID,
    string Receipt,
    int UnitNo,
    long CashierID,
    long CustomerID,
    int CustomerType,
    string CustomerCode,
    decimal Amount,
    int LoyaltyType,
    string EncodedName,
    int LocationIDBilling,
    int TableID,
    long TicketID
);

public record CancelInvoiceRequest(
    int LocationID,
    int UnitNo,
    long CashierID,
    int LocationIDBilling,
    int TableID,
    long TicketID
);

public record SendKotRequest(
    int LocationID,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    long OrderTerminalID
);

public record ServiceChargeRequest(
    int LocationID,
    string Receipt,
    long CashierID,
    string Cashier,
    int UnitNo,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    int StewardID,
    string StewardName,
    decimal ServiceCharge,
    int DecimalPointsCurrency
);

// ── Responses ───────────────────────────────────────────────────────────────

public record OrderLineDto(
    long ProductID,
    string ProductCode,
    string Descrip,
    decimal Price,
    decimal Qty,
    decimal Discount,
    decimal DiscountPct,
    decimal Nett,
    int DocumentID,
    long RowNo,
    bool IsPrinted,
    decimal TaxAmount,
    bool IsTax,
    decimal TaxPercentage,
    string ItemComment,
    string TagNo
);

public record BillSummaryDto(
    IEnumerable<OrderLineDto> Items,
    decimal BillTotal,
    string StewardID,
    string StewardName,
    string OrderStart,
    string TagNo,
    string MobileNo,
    long Pieces,
    long SoldQty,
    int Packs
);

public record SaveInvoiceResult(bool Success, string ReceiptNo, string Error = "");
public record SuspendResult(bool Success, string SuspendNo, string Error = "");
public record RecallResult(bool Success, string Error = "");

public record SuspendListItem(
    string SuspendNo,
    int UnitNo,
    decimal Amount,
    string SuspendTime,
    int TransStatus
);
