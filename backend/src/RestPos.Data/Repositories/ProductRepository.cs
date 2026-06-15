using RestPos.Domain;

namespace RestPos.Data.Repositories;

public interface IProductRepository
{
    Task<ProductMaster?> GetByCodeAsync(string code, int locationId);
    Task<ProductMaster?> GetByBarcodeAsync(string barcode, int locationId);
    Task<IEnumerable<ProductMaster>> GetByCategoryAsync(long categoryId, int locationId);
}

public class ProductRepository(IDbConnectionFactory db) : IProductRepository
{
    private const string SelectCols = @"
        [ProductID],[LocationID],[ProductCode],[RefCode],[BarCode],[ProductName],[NameOnInvoice],
        [DepartmentID],[CategoryID],[SubCategoryID],[SellingPrice],[CostPrice],[AverageCost],
        [FixedDiscount],[MaximumDiscount],[FixedDiscountPercentage],[MaximumDiscountPercentage],
        [MinimumPrice],[MaximumPrice],[WholeSalePrice],[IsTax],[IsStock],[IsBatch],[IsSerial],
        [IsExpiary],[IsPromotion],[IsFreeIssue],[IsCountable],[IsActive],[OrderTerminalID],
        [UnitOfMeasureID],[ConvertFactor]";

    public Task<ProductMaster?> GetByCodeAsync(string code, int locationId) =>
        db.QueryFirstOrDefaultAsync<ProductMaster>(
            $"SELECT TOP 1 {SelectCols} FROM ProductMaster WHERE ProductCode=@Code AND LocationID=@LocationID AND IsActive=1",
            new { Code = code, LocationID = locationId });

    public Task<ProductMaster?> GetByBarcodeAsync(string barcode, int locationId) =>
        db.QueryFirstOrDefaultAsync<ProductMaster>(
            $"SELECT TOP 1 {SelectCols} FROM ProductMaster WHERE BarCode=@BarCode AND LocationID=@LocationID AND IsActive=1",
            new { BarCode = barcode, LocationID = locationId });

    public Task<IEnumerable<ProductMaster>> GetByCategoryAsync(long categoryId, int locationId) =>
        db.QueryAsync<ProductMaster>(
            $"SELECT {SelectCols} FROM ProductMaster WHERE CategoryID=@CategoryID AND LocationID=@LocationID AND IsActive=1 ORDER BY ProductName",
            new { CategoryID = categoryId, LocationID = locationId });
}
