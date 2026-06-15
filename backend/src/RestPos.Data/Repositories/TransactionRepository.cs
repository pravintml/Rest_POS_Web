using Dapper;
using RestPos.Domain;
using RestPos.Domain.Dtos;
using System.Data;

namespace RestPos.Data.Repositories;

public interface ITransactionRepository
{
    Task<bool> AddItemAsync(AddItemRequest req);
    Task<bool> DiscountUpdateAsync(DiscountRequest req);
    Task<bool> VoidItemAsync(VoidItemRequest req);
    Task<bool> ErrorCorrectAsync(ErrorCorrectRequest req);
    Task<bool> ClearItemsAsync(VoidBillRequest req);
    Task<bool> ChangePriceAsync(ChangePriceRequest req);
    Task<bool> DecreaseQtyAsync(DecreaseQtyRequest req);
    Task<bool> SplitQtyAsync(SplitQtyRequest req);
    Task<bool> DiscountRemoveAsync(DiscountRemoveRequest req);
    Task<string> SaveInvoiceAsync(SaveInvoiceRequest req);
    Task<string> CancelInvoiceAsync(CancelInvoiceRequest req);
    Task<bool> SendKotAsync(SendKotRequest req);
    Task<bool> ServiceChargeUpdateAsync(ServiceChargeRequest req);
    Task<bool> ServiceChargeRemoveAsync(int locationID, int locationIDBilling, int tableID, long ticketID);
    Task<bool> SaveTransactionAsync(int locationID, string receipt, int unitNo, long cashierID, int transStatus, string docNo);

    Task<BillSummaryDto> GetBillSummaryAsync(int locationID, int locationIDBilling, int tableID, long ticketID, int unitNo, string receipt, int documentID, int decimalPoints);
    Task<decimal> GetBillTotalAsync(int locationID, string receipt, int unitNo, int decimalPoints);
    Task<long> GetMaxRowNoAsync(int locationID, int unitNo, string receipt);
}

public class TransactionRepository(IDbConnectionFactory db) : ITransactionRepository
{
    public async Task<bool> AddItemAsync(AddItemRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spTempItemUpdate", new
        {
            r.LocationID, r.ProductID, r.ProductCode, r.RefCode, r.BarCodeFull, r.Descrip,
            Cost = r.Cost, Price = r.Price, Qty = r.Qty,
            r.DocumentID, r.Receipt, r.CashierID, r.Cashier, r.UnitNo,
            r.BillTypeID, r.SaleTypeID, BaseUnitID = r.BaseUnitID,
            r.UnitOfMeasureID, r.UnitOfMeasureName, r.ConvertFactor,
            r.BatchNo, r.SerialNo, ExpiaryDate = r.ExpiaryDate,
            r.IsTax, r.TaxPercentage, r.SalesmanID, r.Salesman,
            r.CustomerID, r.Customer, r.IsStock, r.CustomerType, r.TransStatus,
            r.IsPromotion, r.FixedDiscount, r.FixedDiscountPercentage, r.PromotionID,
            r.LocationIDBilling, r.TableID, OrderTerminalID = r.OrderTerminalID,
            r.TicketID, r.OrderNo, r.IsNew,
            r.StewardID, r.StewardName,
            CurrentRowNo = r.CurrentRowNo, r.TagNo, r.MobileNo, IsApp = 0
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> DiscountUpdateAsync(DiscountRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spTempDiscountUpdate", new
        {
            r.LocationID, r.DocumentID, r.Receipt, r.CashierID, r.UnitNo,
            r.Discount, r.IsPercentage, r.IsSubTotal, r.DiscountID,
            r.NetAmount, r.BillTypeID, r.SaleTypeID, r.CustomerID, r.Cashier,
            DecimalPointsCurrency = r.DecimalPointsCurrency,
            r.CustomerType, r.TransStatus, r.IsPromotion,
            r.LocationIDBilling, r.TableID, r.TicketID, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> VoidItemAsync(VoidItemRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spItemVoid", new
        {
            r.LocationID, r.ProductID, r.Qty, r.DocumentID, r.Receipt,
            r.CashierID, r.Cashier, r.UnitNo, r.RowNo, isBillSeek = r.IsBillSeek,
            r.LocationIDBilling, r.TableID, r.TicketID, appUserName = r.AppUserName
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> ErrorCorrectAsync(ErrorCorrectRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spErrorCorrection", new
        {
            r.LocationID, r.ProductID, r.Qty, r.DocumentID, r.Receipt,
            r.CashierID, r.Cashier, r.UnitNo, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> ClearItemsAsync(VoidBillRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        // Clear items and payment in one connection
        await conn.ExecuteAsync("spClearItems", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID
        }, commandType: CommandType.StoredProcedure);
        await conn.ExecuteAsync("spClearPayment", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID
        }, commandType: CommandType.StoredProcedure);
        return true;
    }

    public async Task<bool> ChangePriceAsync(ChangePriceRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spChangePrice", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID,
            r.ProductID, r.RowNo, r.Price
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> DecreaseQtyAsync(DecreaseQtyRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spDecreseQty", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID,
            r.ProductID, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> SplitQtyAsync(SplitQtyRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spSplitQty", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID,
            r.ProductID, r.RowNo, r.Qty
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> DiscountRemoveAsync(DiscountRemoveRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spDiscountRemove", new
        {
            r.LocationID, r.ProductCode, r.LocationIDBilling, r.TableID, r.TicketID, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<string> SaveInvoiceAsync(SaveInvoiceRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var p = new DynamicParameters();
        p.Add("@LocationID", r.LocationID);
        p.Add("@Receipt", r.Receipt);
        p.Add("@UnitNo", r.UnitNo);
        p.Add("@CashierID", r.CashierID);
        p.Add("@CustomerID", r.CustomerID);
        p.Add("@CustomerType", r.CustomerType);
        p.Add("@CustomerCode", r.CustomerCode);
        p.Add("@Amount", r.Amount);
        p.Add("@LoyaltyType", r.LoyaltyType);
        p.Add("@EnCodeName", r.EncodedName);
        p.Add("@LocationIDBilling", r.LocationIDBilling);
        p.Add("@TableID", r.TableID);
        p.Add("@TicketID", r.TicketID);
        p.Add("@ReceiptNoRet", dbType: DbType.String, size: 20, direction: ParameterDirection.Output);
        await conn.ExecuteAsync("spSaveInvoice", p, commandType: CommandType.StoredProcedure);
        return p.Get<string>("@ReceiptNoRet") ?? string.Empty;
    }

    public async Task<string> CancelInvoiceAsync(CancelInvoiceRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var p = new DynamicParameters();
        p.Add("@LocationID", r.LocationID);
        p.Add("@UnitNo", r.UnitNo);
        p.Add("@CashierID", r.CashierID);
        p.Add("@LocationIDBilling", r.LocationIDBilling);
        p.Add("@TableID", r.TableID);
        p.Add("@TicketID", r.TicketID);
        p.Add("@ReceiptNoRet", dbType: DbType.String, size: 20, direction: ParameterDirection.Output);
        await conn.ExecuteAsync("spCancelInvoice", p, commandType: CommandType.StoredProcedure);
        return p.Get<string>("@ReceiptNoRet") ?? string.Empty;
    }

    public async Task<bool> SendKotAsync(SendKotRequest r)
    {
        // Sets IsReadyForKOT=1 and IsApp=1 on unprinted items so SoftVinzOrderPrinter picks them up
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            UPDATE TempItemDet
            SET IsApp = 1, IsReadyForKOT = 1
            WHERE LocationID = @LocationID
              AND DocumentID IN (1,2,3,4,6,8,9) AND BillTypeID != 4
              AND LocationIDBilling = @LocationIDBilling
              AND TableID = @TableID AND TicketID = @TicketID
              AND OrderTerminalID = @OrderTerminalID
              AND IsPrinted = 0";
        var rows = await conn.ExecuteAsync(sql, new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID, r.OrderTerminalID
        });
        return rows >= 0;
    }

    public async Task<bool> ServiceChargeUpdateAsync(ServiceChargeRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spServiceChargeUpdate", new
        {
            r.LocationID, r.Receipt, r.CashierID, r.Cashier, r.UnitNo,
            r.LocationIDBilling, r.TableID, r.TicketID,
            r.StewardID, r.StewardName, r.ServiceCharge,
            DecimalPointsCurrency = r.DecimalPointsCurrency
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> ServiceChargeRemoveAsync(int locationID, int locationIDBilling, int tableID, long ticketID)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spServiceChargeRemove", new
        {
            LocationID = locationID, LocationIDBilling = locationIDBilling,
            TableID = tableID, TicketID = ticketID
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> SaveTransactionAsync(int locationID, string receipt, int unitNo, long cashierID, int transStatus, string docNo)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spSaveTransaction", new
        {
            LocationID = locationID, Receipt = receipt, UnitNo = unitNo,
            CashierID = cashierID, TransStatus = transStatus, DocNo = docNo
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<BillSummaryDto> GetBillSummaryAsync(int locationID, int locationIDBilling, int tableID, long ticketID, int unitNo, string receipt, int documentID, int decimalPoints)
    {
        using var conn = db.Create();
        conn.Open();

        const string itemSql = @"
            SELECT ProductID, ProductCode,
                   Descrip + CASE WHEN BatchNo<>'' THEN ' - '+BatchNo ELSE '' END
                           + CASE WHEN SerialNo<>'' THEN ' - '+SerialNo ELSE '' END
                           + CASE WHEN ExpiaryDate IS NULL THEN '' ELSE ' - '+CONVERT(varchar(10),ExpiaryDate,103) END Descrip,
                   Price, Qty, Amount,
                   IDis1, IDiscount1,
                   Nett, DocumentID, RowNo,
                   TaxAmount, IsTax, TaxPercentage, IsPrinted,
                   ISNULL(ItemComment,'') ItemComment,
                   ISNULL(TagNo,'') TagNo,
                   ISNULL(StewardID,'0') StewardID, ISNULL(StewardName,'') StewardName,
                   ISNULL(Packs,1) Packs, StartTime, RecDate,
                   ISNULL(MobileNo,'') MobileNo
            FROM TempItemDet
            WHERE LocationID = @LocationID
              AND DocumentID IN (1,2,3,4,6,8,9,10) AND BillTypeID != 4
              AND LocationIDBilling = @LocationIDBilling
              AND TableID = @TableID AND TicketID = @TicketID
            ORDER BY RowNo";

        var rows = await conn.QueryAsync<dynamic>(itemSql, new
        {
            LocationID = locationID, LocationIDBilling = locationIDBilling,
            TableID = tableID, TicketID = ticketID
        });

        var items = new List<OrderLineDto>();
        decimal billTotal = 0;
        long pieces = 0, soldQty = 0;
        int packs = 1;
        string stewardID = "", stewardName = "", tagNo = "", mobileNo = "";

        foreach (var r in rows)
        {
            int docId = (int)r.DocumentID;
            if ((int)r.Packs != 0) packs = (int)r.Packs;
            if (stewardID == "" || stewardID == "0") { stewardID = ((string)r.StewardID).Trim(); stewardName = ((string)r.StewardName).Trim(); }
            if (tagNo == "") tagNo = ((string)r.TagNo).Trim();
            if (mobileNo == "") mobileNo = ((string)r.MobileNo).Trim();

            if (docId == 1 || docId == 3) { billTotal += (decimal)r.Nett; pieces += (long)(decimal)r.Qty; soldQty++; }
            else if (docId == 2 || docId == 4) { billTotal -= (decimal)r.Nett; soldQty++; }

            items.Add(new OrderLineDto(
                ProductID: (long)r.ProductID,
                ProductCode: ((string)r.ProductCode).Trim(),
                Descrip: ((string)r.Descrip).Trim(),
                Price: (decimal)r.Price,
                Qty: (decimal)r.Qty,
                Discount: (decimal)r.IDiscount1,
                DiscountPct: (decimal)r.IDis1,
                Nett: (decimal)r.Nett,
                DocumentID: docId,
                RowNo: (long)r.RowNo,
                IsPrinted: (bool)r.IsPrinted,
                TaxAmount: (decimal)r.TaxAmount,
                IsTax: (bool)r.IsTax,
                TaxPercentage: (decimal)r.TaxPercentage,
                ItemComment: ((string)r.ItemComment).Trim(),
                TagNo: ((string)r.TagNo).Trim()
            ));
        }

        string orderStart = DateTime.Now.ToString("dd/MM/yyyy - HH:mm:ss");

        return new BillSummaryDto(items, billTotal, stewardID, stewardName, orderStart, tagNo, mobileNo, pieces, soldQty, packs);
    }

    public async Task<decimal> GetBillTotalAsync(int locationID, string receipt, int unitNo, int decimalPoints)
    {
        using var conn = db.Create();
        conn.Open();
        var sql = $@"
            SELECT CAST((ISNULL(SUM(CASE
                WHEN DocumentID=1 OR DocumentID=3 THEN ((Qty*Price)-(IDiscount1+IDiscount2+IDiscount3+IDiscount4+IDiscount5)+TaxAmount)
                WHEN DocumentID=2 OR DocumentID=4 THEN -((Qty*Price)-(IDiscount1+IDiscount2+IDiscount3+IDiscount4+IDiscount5)+TaxAmount)
                WHEN DocumentID=6 THEN -Nett
                WHEN DocumentID=9 OR DocumentID=10 THEN Nett
                ELSE 0 END),0)) AS DECIMAL(18,{decimalPoints})) Amount
            FROM TempItemDet
            WHERE LocationID=@LocationID AND Receipt=@Receipt AND UnitNo=@UnitNo
              AND BillTypeID!=4 AND DocumentID IN(1,2,3,4,6)";
        return await conn.ExecuteScalarAsync<decimal>(sql, new { LocationID = locationID, Receipt = receipt, UnitNo = unitNo });
    }

    public async Task<long> GetMaxRowNoAsync(int locationID, int unitNo, string receipt)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = "SELECT ISNULL(MAX(RowNo),0) FROM TempItemDet WHERE LocationID=@LocationID AND UnitNo=@UnitNo AND Receipt=@Receipt";
        return await conn.ExecuteScalarAsync<long>(sql, new { LocationID = locationID, UnitNo = unitNo, Receipt = receipt });
    }
}
