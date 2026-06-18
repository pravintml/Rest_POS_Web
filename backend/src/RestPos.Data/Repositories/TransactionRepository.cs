using Dapper;
using Microsoft.Data.SqlClient;
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
    Task<bool> ServiceChargeRemoveAsync(int locationID, int locationIDBilling, int tableID, long ticketID, long cashierID, string cashier);
    Task<bool> SaveTransactionAsync(int locationID, string receipt, int unitNo, long cashierID, int transStatus, string docNo);

    Task<BillSummaryDto> GetBillSummaryAsync(int locationID, int locationIDBilling, int tableID, long ticketID, int unitNo, string receipt, int documentID, int decimalPoints);
    Task<decimal> GetBillTotalAsync(int locationID, string receipt, int unitNo, int decimalPoints);
    Task<long> GetMaxRowNoAsync(int locationID, int unitNo, string receipt);

    Task<string> GetItemCommentAsync(int locationID, int locationIDBilling, int tableID, long ticketID, long rowNo, long productID);
    Task<bool> UpdateItemCommentAsync(ItemCommentRequest req);
    Task<bool> UpdateTagNoAsync(TagRequest req);
    Task<bool> UpdatePacksAsync(PacksRequest req);
    Task<bool> UpdateMobileNoAsync(MobileNoRequest req);

    Task<bool> MoveItemsAsync(MoveItemsRequest req);
    Task<bool> MergeTableAsync(MergeTableRequest req);
    Task<bool> ChangeTableAsync(ChangeTableRequest req);
    Task<bool> IsCustomerCopyPrintedAsync(int locationId, int unitNo, int locationIDBilling, int tableId, long ticketId);
    Task<bool> ShiftEndAsync(ShiftEndRequest req);
}

public class TransactionRepository(IDbConnectionFactory db) : ITransactionRepository
{
    public async Task<bool> AddItemAsync(AddItemRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spTempItemUpdate", new
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
        return result == "0";
    }

    public async Task<bool> DiscountUpdateAsync(DiscountRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spTempDiscountUpdate", new
        {
            r.LocationID, r.DocumentID, r.Receipt, r.CashierID, r.UnitNo,
            r.Discount, r.IsPercentage, r.IsSubTotal, r.DiscountID,
            r.NetAmount, r.BillTypeID, r.SaleTypeID, r.CustomerID, r.Cashier,
            DecimalPointsCurrency = r.DecimalPointsCurrency,
            r.CustomerType, r.TransStatus, r.IsPromotion,
            r.LocationIDBilling, r.TableID, r.TicketID, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> VoidItemAsync(VoidItemRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spItemVoid", new
        {
            r.LocationID, r.ProductID, r.Qty, r.DocumentID, r.Receipt,
            r.CashierID, r.Cashier, r.UnitNo, r.RowNo, isBillSeek = r.IsBillSeek,
            r.LocationIDBilling, r.TableID, r.TicketID, appUserName = r.AppUserName
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> ErrorCorrectAsync(ErrorCorrectRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spErrorCorrection", new
        {
            r.LocationID, r.ProductID, r.Qty, r.DocumentID, r.Receipt,
            r.CashierID, r.Cashier, r.UnitNo, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> ClearItemsAsync(VoidBillRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        await conn.QueryFirstOrDefaultAsync<string>("spClearItems", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID
        }, commandType: CommandType.StoredProcedure);
        await conn.QueryFirstOrDefaultAsync<string>("spClearPayment", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID
        }, commandType: CommandType.StoredProcedure);
        return true;
    }

    public async Task<bool> ChangePriceAsync(ChangePriceRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spChangePrice", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID,
            r.ProductID, r.RowNo, r.Price
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> DecreaseQtyAsync(DecreaseQtyRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spDecreseQty", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID,
            r.ProductID, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> SplitQtyAsync(SplitQtyRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spSplitQty", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID,
            r.ProductID, r.RowNo, r.Qty
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> DiscountRemoveAsync(DiscountRemoveRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spDiscountRemove", new
        {
            r.LocationID, r.ProductCode, r.LocationIDBilling, r.TableID, r.TicketID, r.RowNo
        }, commandType: CommandType.StoredProcedure);
        // Legacy executeCommand returns true for both empty resultset (null) and "0" — match that here.
        return result == null || result == "0";
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
        var result = await conn.QueryFirstOrDefaultAsync<string>("spServiceChargeUpdate", new
        {
            r.LocationID, r.Receipt, r.CashierID, r.Cashier, r.UnitNo,
            r.LocationIDBilling, r.TableID, r.TicketID,
            r.StewardID, r.StewardName, r.ServiceCharge,
            DecimalPointsCurrency = r.DecimalPointsCurrency
        }, commandType: CommandType.StoredProcedure);
        return result == null || result == "0";
    }

    public async Task<bool> ServiceChargeRemoveAsync(int locationID, int locationIDBilling, int tableID, long ticketID, long cashierID, string cashier)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spServiceChargeRemove", new
        {
            LocationID = locationID, CashierID = cashierID, Cashier = cashier,
            LocationIDBilling = locationIDBilling, TableID = tableID, TicketID = ticketID
        }, commandType: CommandType.StoredProcedure);
        return result == null || result == "0";
    }

    public async Task<bool> SaveTransactionAsync(int locationID, string receipt, int unitNo, long cashierID, int transStatus, string docNo)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spSaveTransaction", new
        {
            LocationID = locationID, Receipt = receipt, UnitNo = unitNo,
            CashierID = cashierID, TransStatus = transStatus, DocNo = docNo
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<BillSummaryDto> GetBillSummaryAsync(int locationID, int locationIDBilling, int tableID, long ticketID, int unitNo, string receipt, int documentID, int decimalPoints)
    {
        using var conn = db.Create();
        conn.Open();

        const string itemSql = @"
            SELECT ProductID, ProductCode,
                   CASE WHEN DocumentID = 6
                        THEN ISNULL((SELECT TOP 1 Descrip FROM DiscountType WHERE DId = SDID), 'DISCOUNT')
                        ELSE Descrip + CASE WHEN BatchNo<>'' THEN ' - '+BatchNo ELSE '' END
                                     + CASE WHEN SerialNo<>'' THEN ' - '+SerialNo ELSE '' END
                                     + CASE WHEN ExpiaryDate IS NULL THEN '' ELSE ' - '+CONVERT(varchar(10),ExpiaryDate,103) END
                   END Descrip,
                   Price, Qty, Amount,
                   IDis1, IDiscount1,
                   Nett, DocumentID, RowNo,
                   TaxAmount, IsTax, TaxPercentage, IsPrinted,
                   ISNULL(ItemComment,'') ItemComment,
                   ISNULL(TagNo,'') TagNo,
                   ISNULL(CAST(StewardID AS VARCHAR(10)),'0') StewardID, ISNULL(StewardName,'') StewardName,
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
            else if (docId == 6)              { billTotal -= (decimal)r.Nett; }   // subtotal discount
            else if (docId == 9 || docId == 10) { billTotal += (decimal)r.Nett; } // service charge

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

    public async Task<string> GetItemCommentAsync(int locationID, int locationIDBilling, int tableID, long ticketID, long rowNo, long productID)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT ISNULL(ItemComment,'')
            FROM TempItemDet
            WHERE LocationID=@LocationID AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID AND TicketID=@TicketID
              AND RowNo=@RowNo AND ProductID=@ProductID";
        return await conn.ExecuteScalarAsync<string>(sql, new
        {
            LocationID = locationID, LocationIDBilling = locationIDBilling,
            TableID = tableID, TicketID = ticketID, RowNo = rowNo, ProductID = productID
        }) ?? string.Empty;
    }

    public async Task<bool> UpdateItemCommentAsync(ItemCommentRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            UPDATE TempItemDet SET ItemComment=@ItemComment
            WHERE LocationID=@LocationID AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID AND TicketID=@TicketID
              AND RowNo=@RowNo AND ProductID=@ProductID";
        var rows = await conn.ExecuteAsync(sql, new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID,
            r.RowNo, r.ProductID, r.ItemComment
        });
        return rows >= 0;
    }

    public async Task<bool> UpdateTagNoAsync(TagRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            UPDATE TempItemDet SET TagNo=@TagNo
            WHERE LocationID=@LocationID AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID AND TicketID=@TicketID";
        var rows = await conn.ExecuteAsync(sql, new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID, r.TagNo
        });
        return rows >= 0;
    }

    public async Task<bool> UpdatePacksAsync(PacksRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            UPDATE TempItemDet SET Packs=@Packs
            WHERE LocationID=@LocationID AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID AND TicketID=@TicketID
              AND DocumentID IN (1) AND BillTypeID!=4";
        var rows = await conn.ExecuteAsync(sql, new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID, r.Packs
        });
        return rows >= 0;
    }

    public async Task<bool> UpdateMobileNoAsync(MobileNoRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            UPDATE TempItemDet SET MobileNo=@MobileNo
            WHERE LocationID=@LocationID AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID AND TicketID=@TicketID";
        var rows = await conn.ExecuteAsync(sql, new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID, r.MobileNo
        });
        return rows >= 0;
    }

    public async Task<bool> MoveItemsAsync(MoveItemsRequest r)
    {
        using var conn = (SqlConnection)db.Create();
        conn.Open();
        var dt = new DataTable();
        dt.Columns.Add("RowNo", typeof(int));
        dt.Rows.Add((int)r.RowNo);
        // SP returns null on success (no SELECT) or error message string on failure
        var result = await conn.QueryFirstOrDefaultAsync<string>("spMoveItems", new
        {
            r.LocationID, r.CashierID, r.LocationIDBilling, r.TableID, r.TicketID,
            RowList = dt.AsTableValuedParameter("dbo.RowList"),
            r.NewTicketID
        }, commandType: CommandType.StoredProcedure);
        return result == null;
    }

    public async Task<bool> MergeTableAsync(MergeTableRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spMergeTable", new
        {
            r.LocationID, r.CashierID, r.LocationIDBilling,
            r.TableID, r.TicketID,
            r.TableIDToBeMerged, r.LocationIDBillingToBeMerged, r.TicketIDToBeMerged
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> ChangeTableAsync(ChangeTableRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spChangeTable", new
        {
            r.LocationID, r.CashierID, r.LocationIDBilling,
            r.TableIDToBeChanged, r.TableID, r.TicketID,
            r.LocationIDBillingToBeChanged
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }

    public async Task<bool> IsCustomerCopyPrintedAsync(
        int locationId, int unitNo, int locationIDBilling, int tableId, long ticketId)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT IsCustomerCopy FROM TempItemDet
            WHERE LocationID=@LocationID AND UnitNo=@UnitNo
              AND DocumentID IN (1,2,3,4)
              AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID AND TicketID=@TicketID
              AND IsCustomerCopy=1";
        var rows = await conn.QueryAsync<int>(sql, new
        {
            LocationID = locationId, UnitNo = unitNo,
            LocationIDBilling = locationIDBilling,
            TableID = tableId, TicketID = ticketId
        });
        return rows.Any();
    }

    public async Task<bool> ShiftEndAsync(ShiftEndRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var result = await conn.QueryFirstOrDefaultAsync<string>("spShiftEnd", new
        {
            r.LocationID, r.CashierID, r.LocationIDBilling,
            r.Amount, DayEnd = r.DayEnd, r.UnitNo
        }, commandType: CommandType.StoredProcedure);
        return result == "0";
    }
}
