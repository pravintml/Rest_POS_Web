namespace RestPos.Domain;

public class TempItemDet
{
    public int LocationID { get; set; }
    public long ProductID { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string RefCode { get; set; } = string.Empty;
    public long BarCodeFull { get; set; }
    public string Descrip { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public decimal Price { get; set; }
    public decimal Qty { get; set; }
    public decimal Amount { get; set; }
    public int DocumentID { get; set; }
    public string Receipt { get; set; } = string.Empty;
    public long CashierID { get; set; }
    public string Cashier { get; set; } = string.Empty;
    public int UnitNo { get; set; }
    public decimal Stock { get; set; }
    public string BatchNo { get; set; } = string.Empty;
    public DateTime? ExpiaryDate { get; set; }
    public string SerialNo { get; set; } = string.Empty;
    public long UnitOfMeasureID { get; set; }
    public string UnitOfMeasureName { get; set; } = string.Empty;
    public decimal ConvertFactor { get; set; }
    public int BillTypeID { get; set; }
    public int SaleTypeID { get; set; }
    public bool IsTax { get; set; }
    public decimal TaxPercentage { get; set; }
    public long SalesmanID { get; set; }
    public string Salesman { get; set; } = string.Empty;
    public long CustomerID { get; set; }
    public string Customer { get; set; } = string.Empty;
    public long RowNo { get; set; }
    public bool IsRecall { get; set; }
    public bool IsSDis { get; set; }
    public decimal IDiscount1 { get; set; }
    public decimal IDiscount2 { get; set; }
    public decimal IDiscount3 { get; set; }
    public decimal IDiscount4 { get; set; }
    public decimal IDiscount5 { get; set; }
    public decimal SDiscount { get; set; }
    public bool IsVoid { get; set; }
    public decimal NetAmount { get; set; }
    public decimal DiscountPer { get; set; }
    public int PayTypeID { get; set; }
    public string RefNo { get; set; } = string.Empty;
    public long BankID { get; set; }
    public int BankTerminal { get; set; }
    public DateTime? ChequeDate { get; set; }
    public bool IsRecallAdv { get; set; }
    public string RecallNo { get; set; } = string.Empty;
    public string EncodedName { get; set; } = string.Empty;
    public int RecallUnitNo { get; set; }
    public int PaidOutTypeID { get; set; }
    public string Remarks { get; set; } = string.Empty;
    public int CustomerType { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public int LoyaltyType { get; set; }
    public long Zno { get; set; }
    public int TransStatus { get; set; }
    public string TransName { get; set; } = string.Empty;
    public bool IsPromotion { get; set; }
    public bool IsBankTerminal { get; set; }
    public bool IsTouchVersion { get; set; }
    public long PromotionID { get; set; }
    public int LocationIDBilling { get; set; }
    public int TableID { get; set; }
    public int OrderTerminalID { get; set; }
    public long TicketID { get; set; }
    public long OrderNo { get; set; }
    public bool IsNew { get; set; }
    public string ItemComment { get; set; } = string.Empty;
    public int StewardID { get; set; }
    public string StewardName { get; set; } = string.Empty;
    public string TagNo { get; set; } = string.Empty;
    public string MobileNo { get; set; } = string.Empty;
    public string AppUserName { get; set; } = string.Empty;
}
