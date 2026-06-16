using Dapper;
using Microsoft.Data.SqlClient;
using RestPos.Domain.Dtos;
using System.Data;

namespace RestPos.Data.Repositories;

public interface IReportRepository
{
    Task<IEnumerable<MenuItemDto>> GetMenuItemsAsync(long cashierID);
    Task<SalesReadingDto> GetSalesReadingAsync(SalesReadingRequest req);
    Task<IEnumerable<BillWiseRow>> GetBillWiseAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo, long cashierID);
    Task<IEnumerable<ItemWiseRow>> GetItemWiseAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetSuspendReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetPendingSuspendAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetSuspendRecallAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetBillCancellationAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetDiscountReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetLoyaltyReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetCreditCardReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetNonCashReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetStaffPurchaseAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetGiftVoucherAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetGiftCardAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetPaidoutReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetPaidInReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetSalesmanReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetNonSalesReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetPendingItemWiseAsync(int locationID, int locationIDBilling, int unitNo);
    Task<TableReportDto> GetSalesIncludingPendingAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo);
    Task<TableReportDto> GetDayBookReportAsync(int locationID, int unitNo);
    Task<SalesReadingDto> GetZReadingAsync(SalesReadingRequest req);
}

public class ReportRepository(IDbConnectionFactory db) : IReportRepository
{
    // Returns all active reportable menu items. If the cashier has explicit
    // permission entries we honour them; otherwise we show all (new installs
    // often have no CashierPermission rows yet).
    public async Task<IEnumerable<MenuItemDto>> GetMenuItemsAsync(long cashierID)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            DECLARE @HasPerms BIT = 0
            IF EXISTS (SELECT 1 FROM CashierPermission WHERE CashierID=@CashierID AND FunctName LIKE 'R%')
                SET @HasPerms = 1

            SELECT m.MenuID, m.MenuName, m.LNo
            FROM MenuItems m
            WHERE m.IsActive = 1
              AND m.MenuID < 90          -- exclude system commands (Refresh/Restart/ShutDown/Exit)
              AND (
                   @HasPerms = 0         -- no permission rows → show all
                OR EXISTS (
                     SELECT 1 FROM CashierPermission c
                     WHERE c.CashierID = @CashierID
                       AND c.FunctName = 'R' + CAST(m.MenuID AS VARCHAR(10))
                       AND c.IsAccess = 1
                   )
              )
            ORDER BY m.LNo";
        return await conn.QueryAsync<MenuItemDto>(sql, new { CashierID = cashierID });
    }

    public async Task<SalesReadingDto> GetSalesReadingAsync(SalesReadingRequest r)
    {
        using var conn = db.Create();
        conn.Open();

        // ReportType 1 = Cashier Reading (filter by CashierID)
        // ReportType 2 = X Reading (all cashiers, CashierID = 0)
        long cashierFilter = r.ReportType == 1 ? r.CashierID : 0;

        const string summarySql = @"
            SELECT
              ISNULL(SUM(CASE WHEN DocumentID IN (1,3) THEN Amount         ELSE 0 END),0) AS GrossSale,
              ISNULL(SUM(CASE WHEN DocumentID IN (2,4) THEN Nett           ELSE 0 END),0) AS Refunds,
              ISNULL(SUM(CASE WHEN DocumentID IN (2,4) THEN 1              ELSE 0 END),0) AS NRefunds,
              ISNULL(SUM(CASE WHEN DocumentID IN (1,3) THEN IDiscount1+IDiscount2+IDiscount3+IDiscount4+IDiscount5 ELSE 0 END),0) AS ItemDiscount,
              ISNULL(SUM(CASE WHEN DocumentID IN (1,3) THEN SDiscount      ELSE 0 END),0) AS SubtotalDiscount,
              ISNULL(SUM(CASE WHEN DocumentID IN (1,3) THEN ServiceCharge  ELSE 0 END),0) AS ServiceCharge,
              ISNULL(SUM(CASE WHEN DocumentID = 5      THEN Nett           ELSE 0 END),0) AS Voids,
              ISNULL(SUM(CASE WHEN DocumentID = 5      THEN 1              ELSE 0 END),0) AS NVoids,
              ISNULL(SUM(CASE WHEN DocumentID = 6      THEN Nett           ELSE 0 END),0) AS Cancel,
              ISNULL(SUM(CASE WHEN DocumentID = 6      THEN 1              ELSE 0 END),0) AS NCancel,
              ISNULL(SUM(CASE WHEN DocumentID IN (1,3) THEN Nett
                              WHEN DocumentID IN (2,4) THEN -Nett ELSE 0 END),0) AS NetSales,
              ISNULL(COUNT_BIG(DISTINCT CASE WHEN DocumentID IN (1,3) THEN Receipt ELSE NULL END),0) AS NoOfBills
            FROM TransactionDet
            WHERE LocationID          = @LocationID
              AND UpdateUnitNo        = @UnitNo
              AND BillTypeID          = 1
              AND Status              = 1
              AND TransStatus         = 1
              AND IsDayEnd            = 0
              AND (@ShiftNo = 0 OR ShiftNo = @ShiftNo)
              AND (@CashierID = 0 OR CashierID = @CashierID)
              AND (@LocationIDBilling = 0 OR LocationIDBilling = @LocationIDBilling)";

        var summary = await conn.QueryFirstOrDefaultAsync<dynamic>(summarySql, new
        {
            r.LocationID, r.UnitNo, r.ShiftNo,
            CashierID = cashierFilter,
            r.LocationIDBilling
        });

        const string paymentSql = @"
            SELECT
              ISNULL(pt.Descrip, pd.Descrip) AS PayType,
              ISNULL(SUM(CASE WHEN pd.Amount > pd.Balance THEN pd.Balance ELSE pd.Amount END),0) AS Amount,
              COUNT_BIG(*) AS [Count]
            FROM PaymentDet pd
            LEFT JOIN PayType pt ON pt.PaymentID = pd.PayTypeID
            WHERE pd.LocationID   = @LocationID
              AND pd.UpdateUnitNo = @UnitNo
              AND pd.BillTypeID   = 1
              AND pd.Status       = 1
              AND pd.IsDayEnd     = 0
              AND (@ShiftNo = 0 OR pd.ShiftNo = @ShiftNo)
              AND (@CashierID = 0 OR pd.UpdatedBy = @CashierID)
              AND (@LocationIDBilling = 0 OR pd.LocationIDBilling = @LocationIDBilling)
            GROUP BY ISNULL(pt.Descrip, pd.Descrip)
            ORDER BY ISNULL(pt.Descrip, pd.Descrip)";

        var payments = await conn.QueryAsync<PaymentLineItem>(paymentSql, new
        {
            r.LocationID, r.UnitNo, r.ShiftNo,
            CashierID = cashierFilter,
            r.LocationIDBilling
        });

        return new SalesReadingDto(
            GrossSale:        (decimal)(summary?.GrossSale      ?? 0m),
            Refunds:          (decimal)(summary?.Refunds         ?? 0m),
            NRefunds:         (long)(summary?.NRefunds           ?? 0L),
            ItemDiscount:     (decimal)(summary?.ItemDiscount    ?? 0m),
            SubtotalDiscount: (decimal)(summary?.SubtotalDiscount ?? 0m),
            ServiceCharge:    (decimal)(summary?.ServiceCharge   ?? 0m),
            Voids:            (decimal)(summary?.Voids           ?? 0m),
            NVoids:           (long)(summary?.NVoids             ?? 0L),
            Cancel:           (decimal)(summary?.Cancel          ?? 0m),
            NCancel:          (long)(summary?.NCancel            ?? 0L),
            NetSales:         (decimal)(summary?.NetSales        ?? 0m),
            NoOfBills:        (long)(summary?.NoOfBills          ?? 0L),
            Payments:         payments,
            GeneratedAt:      DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss")
        );
    }

    public async Task<IEnumerable<BillWiseRow>> GetBillWiseAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo, long cashierID)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT
              RIGHT(pd.Receipt, 10)  AS Receipt,
              ISNULL(LEFT(c.LogName, 12), 'CASHIER') AS Cashier,
              SUM(ISNULL(CASE WHEN pd.Amount > pd.Balance THEN pd.Balance ELSE pd.Amount END, 0)) AS Amount,
              LEFT(pd.Descrip, 12)   AS PayType
            FROM PaymentDet pd
            LEFT JOIN Cashier c ON c.CashierID = pd.UpdatedBy
            WHERE pd.BillTypeID   = 1
              AND pd.UpdateUnitNo = @UnitNo
              AND pd.LocationID   = @LocationID
              AND pd.Status       = 1
              AND (@LocationIDBilling = 0 OR pd.LocationIDBilling = @LocationIDBilling)
              AND pd.IsDayEnd     = 0
              AND (@ShiftNo = 0 OR pd.ShiftNo = @ShiftNo OR (@ShiftNo = -1 AND pd.ShiftNo = 0))
              AND (@CashierID = 0 OR pd.UpdatedBy = @CashierID)
            GROUP BY RIGHT(pd.Receipt, 10),
                     ISNULL(LEFT(c.LogName, 12), 'CASHIER'),
                     LEFT(pd.Descrip, 12)
            ORDER BY RIGHT(pd.Receipt, 10)";
        return await conn.QueryAsync<BillWiseRow>(sql, new
        {
            LocationID = locationID, LocationIDBilling = locationIDBilling,
            UnitNo = unitNo, ShiftNo = shiftNo, CashierID = cashierID
        });
    }

    public async Task<IEnumerable<ItemWiseRow>> GetItemWiseAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT
              ISNULL(d.DepartmentName, 'Other') + ' - ' +
              ISNULL(cat.InvCategoryName, 'Other') AS Category,
              LEFT(pm.NameOnInvoice, 30) AS ItemName,
              SUM(CASE WHEN td.DocumentID IN (1,3) THEN  td.Qty
                       WHEN td.DocumentID IN (2,4) THEN -td.Qty ELSE 0 END) AS Qty,
              SUM(CASE WHEN td.DocumentID IN (1,3) THEN  td.Nett
                       WHEN td.DocumentID IN (2,4) THEN -td.Nett ELSE 0 END) AS Amount
            FROM TransactionDet td
            JOIN ProductMaster pm ON pm.ProductID = td.ProductID AND pm.LocationID = td.LocationID
            LEFT JOIN InvDepartment d   ON d.InvDepartmentID = pm.DepartmentID
            LEFT JOIN InvCategory   cat ON cat.InvCategoryID  = pm.CategoryID
            WHERE td.LocationID   = @LocationID
              AND td.UpdateUnitNo = @UnitNo
              AND td.BillTypeID   = 1
              AND td.Status       = 1
              AND td.TransStatus  = 1
              AND td.DocumentID IN (1,2,3,4)
              AND td.IsDayEnd     = 0
              AND (@LocationIDBilling = 0 OR td.LocationIDBilling = @LocationIDBilling)
              AND (@ShiftNo = 0 OR td.ShiftNo = @ShiftNo OR (@ShiftNo = -1 AND td.ShiftNo = 0))
            GROUP BY
              ISNULL(d.DepartmentName, 'Other') + ' - ' + ISNULL(cat.InvCategoryName, 'Other'),
              LEFT(pm.NameOnInvoice, 30)
            ORDER BY Category, ItemName";
        return await conn.QueryAsync<ItemWiseRow>(sql, new
        {
            LocationID = locationID, LocationIDBilling = locationIDBilling,
            UnitNo = unitNo, ShiftNo = shiftNo
        });
    }
}
