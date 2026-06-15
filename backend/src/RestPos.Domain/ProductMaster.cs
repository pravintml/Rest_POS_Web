namespace RestPos.Domain;

public class ProductMaster
{
    public long ProductID { get; set; }
    public int LocationID { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string RefCode { get; set; } = string.Empty;
    public string BarCode { get; set; } = string.Empty;
    public long BarCodeFull { get; set; }
    public string BatchNo { get; set; } = string.Empty;
    public DateTime ExpiaryDate { get; set; }
    public string SerialNo { get; set; } = string.Empty;
    public string UnitOfMeasureName { get; set; } = string.Empty;
    public decimal ConvertFactor { get; set; }
    public string ReferenceCode1 { get; set; } = string.Empty;
    public string ReferenceCode2 { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string NameOnInvoice { get; set; } = string.Empty;
    public long DepartmentID { get; set; }
    public long CategoryID { get; set; }
    public long SubCategoryID { get; set; }
    public long SubCategory2ID { get; set; }
    public long SupplierID { get; set; }
    public long BaseUnitOfMeasureID { get; set; }
    public long UnitOfMeasureID { get; set; }
    public string PackSize { get; set; } = string.Empty;
    public decimal CostPrice { get; set; }
    public decimal AverageCost { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal WholeSalePrice { get; set; }
    public decimal MinimumPrice { get; set; }
    public decimal FixedDiscount { get; set; }
    public decimal MaximumDiscount { get; set; }
    public decimal MaximumPrice { get; set; }
    public decimal FixedDiscountPercentage { get; set; }
    public decimal MaximumDiscountPercentage { get; set; }
    public bool IsActive { get; set; }
    public bool IsBatch { get; set; }
    public bool IsPromotion { get; set; }
    public bool IsFreeIssue { get; set; }
    public bool IsExpiary { get; set; }
    public bool IsCountable { get; set; }
    public bool IsTax { get; set; }
    public bool IsSerial { get; set; }
    public bool IsStock { get; set; }
    public int OrderTerminalID { get; set; }
}
