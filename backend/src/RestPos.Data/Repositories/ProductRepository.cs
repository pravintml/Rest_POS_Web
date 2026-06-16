using Dapper;
using RestPos.Domain;
using RestPos.Domain.Dtos;

namespace RestPos.Data.Repositories;

public interface IProductRepository
{
    Task<ProductMaster?> GetByCodeAsync(string code, int locationId, int billingLocationId = 0);
    Task<ProductMaster?> GetByBarcodeAsync(string barcode, int locationId, int billingLocationId = 0);
    Task<ProductMaster?> GetByIdAsync(long productId, int locationId, int billingLocationId);
    Task<IEnumerable<TouchProductDto>> GetTouchProductsAsync(long? layer1Id, long? layer2Id, int locationId);
}

public class ProductRepository(IDbConnectionFactory db) : IProductRepository
{
    // Base columns — uses actual DB column names (RefCode→ReferenceCode1, ItemLayer1ID/2 confirmed)
    private const string SelectCols = @"
        p.[ProductID],p.[LocationID],p.[ProductCode],
        p.[ReferenceCode1] AS RefCode,
        p.[BarCode],p.[BarCodeFull],
        p.[ProductName],p.[NameOnInvoice],
        p.[ItemLayer1ID],p.[ItemLayer2ID],
        p.[DepartmentID],p.[CategoryID],p.[SubCategoryID],p.[SubCategory2ID],
        p.[BaseUnitOfMeasureID],p.[UnitOfMeasureID],p.[UnitOfMeasureName],p.[ConvertFactor],
        CASE WHEN ISNULL(b.SellingPrice,0)>0 THEN b.SellingPrice ELSE p.SellingPrice END AS SellingPrice,
        p.[CostPrice],p.[AverageCost],
        p.[FixedDiscount],p.[MaximumDiscount],p.[FixedDiscountPercentage],p.[MaximumDiscountPercentage],
        p.[MinimumPrice],p.[MaximumPrice],p.[WholeSalePrice],
        p.[IsTax],p.[IsStock],p.[IsBatch],p.[IsSerial],p.[IsExpiary],
        p.[IsPromotion],p.[IsFreeIssue],p.[IsCountable],p.[IsActive],p.[OrderTerminalID]";

    // BillingLocationInfo join for per-counter price overrides (mirrors ProductService.GetProduct)
    private const string BilInfoJoin = @"
        LEFT JOIN BillingLocationInfo b
            ON b.ProductID=p.ProductID AND b.LocationID=p.LocationID
           AND ISNULL(b.BillingLocationID,@BillingLocationID)=@BillingLocationID";

    public Task<ProductMaster?> GetByCodeAsync(string code, int locationId, int billingLocationId = 0)
    {
        var sql = $@"SELECT TOP 1 {SelectCols}
            FROM ProductMaster p {BilInfoJoin}
            WHERE p.ProductCode=@Code AND p.LocationID=@LocationID AND p.IsActive=1";
        return db.QueryFirstOrDefaultAsync<ProductMaster>(sql,
            new { Code = code, LocationID = locationId, BillingLocationID = billingLocationId });
    }

    public Task<ProductMaster?> GetByBarcodeAsync(string barcode, int locationId, int billingLocationId = 0)
    {
        var sql = $@"SELECT TOP 1 {SelectCols}
            FROM ProductMaster p {BilInfoJoin}
            WHERE p.BarCode=@BarCode AND p.LocationID=@LocationID AND p.IsActive=1";
        return db.QueryFirstOrDefaultAsync<ProductMaster>(sql,
            new { BarCode = barcode, LocationID = locationId, BillingLocationID = billingLocationId });
    }

    public Task<ProductMaster?> GetByIdAsync(long productId, int locationId, int billingLocationId)
    {
        var sql = $@"SELECT TOP 1 {SelectCols}
            FROM ProductMaster p {BilInfoJoin}
            WHERE p.ProductID=@ProductID AND p.LocationID=@LocationID AND p.IsActive=1";
        return db.QueryFirstOrDefaultAsync<ProductMaster>(sql,
            new { ProductID = productId, LocationID = locationId, BillingLocationID = billingLocationId });
    }

    // Mirrors MasterFileService.GetProductForTouch — lightweight list for touch browser grid
    public async Task<IEnumerable<TouchProductDto>> GetTouchProductsAsync(
        long? layer1Id, long? layer2Id, int locationId)
    {
        using var conn = db.Create();
        conn.Open();
        string sql;
        object param;

        if (layer2Id.HasValue && layer2Id.Value > 0)
        {
            sql = @"SELECT ProductID, NameOnInvoice AS ProductName
                    FROM ProductMaster
                    WHERE IsActive=1 AND LocationID=@LocationID
                      AND ItemLayer1ID=@Layer1Id AND ItemLayer2ID=@Layer2Id
                    ORDER BY NameOnInvoice";
            param = new { LocationID = locationId, Layer1Id = layer1Id!.Value, Layer2Id = layer2Id.Value };
        }
        else if (layer1Id.HasValue && layer1Id.Value > 0)
        {
            sql = @"SELECT ProductID, NameOnInvoice AS ProductName
                    FROM ProductMaster
                    WHERE IsActive=1 AND LocationID=@LocationID AND ItemLayer1ID=@Layer1Id
                    ORDER BY NameOnInvoice";
            param = new { LocationID = locationId, Layer1Id = layer1Id.Value };
        }
        else
        {
            sql = @"SELECT ProductID, NameOnInvoice AS ProductName
                    FROM ProductMaster
                    WHERE IsActive=1 AND LocationID=@LocationID
                    ORDER BY NameOnInvoice";
            param = new { LocationID = locationId };
        }

        return await conn.QueryAsync<TouchProductDto>(sql, param);
    }
}
