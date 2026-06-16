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

    // ── helpers ──────────────────────────────────────────────────────────────
    private static string F(decimal v) => v.ToString("N2");
    private static string Fmt(object? v) => v is decimal d ? F(d) : v?.ToString() ?? "";
    private static TableReportDto EmptyReport(string title) =>
        new(title, [], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));

    // ── 1. Suspend Report ─────────────────────────────────────────────────────
    public async Task<TableReportDto> GetSuspendReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(LTRIM(RTRIM(sh.Receipt)),8) Receipt,
                       RIGHT(LTRIM(RTRIM(sh.SuspendNo)),4) SuspendNo,
                       LEFT(CAST(sh.STime AS TIME),5) STime,
                       LEFT(c.LogName,7) Cashier,
                       sh.Amount,
                       t.TransName,
                       ISNULL(SUM(CASE sd.DocumentID WHEN 1 THEN sd.Qty WHEN 2 THEN -sd.Qty WHEN 3 THEN sd.Qty WHEN 4 THEN -sd.Qty ELSE 0 END),0) Qty
                FROM SuspendHed sh
                INNER JOIN Cashier c ON sh.CashierID = c.CashierID
                INNER JOIN TransactionType t ON sh.TransStatus = t.TransID
                INNER JOIN SuspendDet sd ON sh.Receipt=sd.Receipt AND sh.SuspendNo=sd.SuspendNo AND sh.LocationID=sd.LocationID AND sh.UnitNo=sd.UnitNo AND sh.TransStatus=sd.TransStatus
                WHERE sh.UnitNo=@UnitNo AND sh.LocationID=@LocationID
                GROUP BY RIGHT(LTRIM(RTRIM(sh.Receipt)),8), RIGHT(LTRIM(RTRIM(sh.SuspendNo)),4),
                         LEFT(CAST(sh.STime AS TIME),5), LEFT(c.LogName,7), sh.Amount, t.TransName
                ORDER BY t.TransName, LEFT(CAST(sh.STime AS TIME),5)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, UnitNo = unitNo })).ToList();
            var section = new ReportSection(
                "Suspended Bills",
                ["Receipt", "Suspend No", "Time", "Cashier", "Amount", "Type", "Qty"],
                rows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.SuspendNo?.ToString() ?? "",
                    r.STime?.ToString() ?? "", r.Cashier?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m)), r.TransName?.ToString() ?? "",
                    ((decimal)(r.Qty ?? 0m)).ToString("N2")
                }).ToList()
            );
            return new TableReportDto("Suspend Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Suspend Report"); }
    }

    // ── 2. Pending Suspend ────────────────────────────────────────────────────
    public async Task<TableReportDto> GetPendingSuspendAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(LTRIM(RTRIM(sh.Receipt)),8) Receipt, RIGHT(LTRIM(RTRIM(sh.SuspendNo)),4) SuspendNo,
                       LEFT(CAST(sh.STime AS TIME),5) STime, LEFT(c.LogName,7) Cashier, sh.Amount, t.TransName
                FROM SuspendHed sh
                INNER JOIN Cashier c ON sh.CashierID=c.CashierID
                INNER JOIN TransactionType t ON sh.TransStatus=t.TransID
                WHERE sh.IsRecall=0 AND sh.UnitNo=@UnitNo AND sh.LocationID=@LocationID
                ORDER BY t.TransName, LEFT(CAST(sh.STime AS TIME),5)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, UnitNo = unitNo })).ToList();
            var section = new ReportSection(
                "Pending Suspended Bills",
                ["Receipt", "Suspend No", "Time", "Cashier", "Amount", "Type"],
                rows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.SuspendNo?.ToString() ?? "",
                    r.STime?.ToString() ?? "", r.Cashier?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m)), r.TransName?.ToString() ?? ""
                }).ToList()
            );
            return new TableReportDto("Pending Suspend Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Pending Suspend Report"); }
    }

    // ── 3. Suspend Recall ─────────────────────────────────────────────────────
    public async Task<TableReportDto> GetSuspendRecallAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(LTRIM(RTRIM(sh.SuspendNo)),4) SuspendNo,
                       RIGHT(LTRIM(RTRIM(sh.RecallReceipt)),8) Receipt,
                       RIGHT('0'+RTRIM(CAST(sh.RecallUnitNo AS VARCHAR)),2) RecallUnit,
                       LEFT(c.LogName,7) Cashier, t.TransName,
                       LEFT(CAST(sh.RecallTime AS TIME),5) RecallTime
                FROM SuspendHed sh
                INNER JOIN Cashier c ON sh.RecallCashierID=c.CashierID
                INNER JOIN TransactionType t ON sh.TransStatus=t.TransID
                WHERE sh.IsRecall=1 AND sh.LocationID=@LocationID AND sh.UnitNo=@UnitNo
                ORDER BY t.TransName";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, UnitNo = unitNo })).ToList();
            var section = new ReportSection(
                "Recalled Bills",
                ["Suspend No", "Receipt", "Unit", "Cashier", "Type", "Recall Time"],
                rows.Select(r => new string[] {
                    r.SuspendNo?.ToString() ?? "", r.Receipt?.ToString() ?? "",
                    r.RecallUnit?.ToString() ?? "", r.Cashier?.ToString() ?? "",
                    r.TransName?.ToString() ?? "", r.RecallTime?.ToString() ?? ""
                }).ToList()
            );
            return new TableReportDto("Suspend Recall Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Suspend Recall Report"); }
    }

    // ── 4. Bill Cancellation ──────────────────────────────────────────────────
    public async Task<TableReportDto> GetBillCancellationAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(td.Receipt,10) Receipt, LEFT(td.Cashier,7) Cashier,
                       SUM(ISNULL(CASE WHEN td.DocumentID IN (1,3,8) THEN td.Nett WHEN td.DocumentID IN (2,4,6) THEN -td.Nett ELSE td.Amount END,0)) Amount,
                       tt.TransName,
                       MAX(LEFT(CAST(td.StartTime AS TIME),8)) STime
                FROM TransactionDet td
                INNER JOIN TransactionType tt ON td.TransStatus=tt.TransID
                WHERE td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0 AND td.Status=0 AND td.BillTypeID!=4
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                GROUP BY RIGHT(td.Receipt,10), LEFT(td.Cashier,7), tt.TransName
                ORDER BY RIGHT(td.Receipt,10)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var section = new ReportSection(
                "Cancelled Bills",
                ["Receipt", "Cashier", "Amount", "Type", "Time"],
                rows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Cashier?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m)), r.TransName?.ToString() ?? "",
                    r.STime?.ToString() ?? ""
                }).ToList()
            );
            return new TableReportDto("Bill Cancellation Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Bill Cancellation Report"); }
    }

    // ── 5. Discount Report ────────────────────────────────────────────────────
    public async Task<TableReportDto> GetDiscountReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string itemDiscSql = @"
                SELECT RIGHT(td.Receipt,10) Receipt, LEFT(td.Cashier,7) Cashier, td.RowNo,
                       td.IDiscount1+td.IDiscount2+td.IDiscount3+td.IDiscount4+td.IDiscount5 TotalDisc,
                       td.IDis1+td.IDis2+td.IDis3+td.IDis4+td.IDis5 TotalPct,
                       CASE WHEN td.DocumentID IN (1,3) THEN 'Sale' ELSE 'Return' END DocType
                FROM TransactionDet td
                WHERE td.BillTypeID=1 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND (td.IDiscount1!=0 OR td.IDiscount2!=0 OR td.IDiscount3!=0 OR td.IDiscount4!=0 OR td.IDiscount5!=0)
                  AND td.DocumentID IN (1,2,3,4) AND td.Status=1 AND td.TransStatus=1
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(td.Receipt,10), td.RowNo";
            const string subDiscSql = @"
                SELECT RIGHT(td.Receipt,10) Receipt, LEFT(td.Cashier,7) Cashier,
                       ISNULL(dt.Pfx,'') Pfx, td.SDiscount, td.SDIs
                FROM TransactionDet td
                LEFT JOIN DiscountType dt ON td.SDID=dt.DId
                WHERE td.BillTypeID=1 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND td.SDID!=0 AND td.DocumentID=6 AND td.Status=1 AND td.TransStatus=1
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(td.Receipt,10)";
            var p = new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo };
            var itemRows = (await conn.QueryAsync<dynamic>(itemDiscSql, p)).ToList();
            var subRows  = (await conn.QueryAsync<dynamic>(subDiscSql, p)).ToList();
            var sec1 = new ReportSection(
                "Item Discounts",
                ["Receipt", "Cashier", "Row", "Discount", "Disc%", "Type"],
                itemRows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Cashier?.ToString() ?? "",
                    r.RowNo?.ToString() ?? "", F((decimal)(r.TotalDisc ?? 0m)),
                    F((decimal)(r.TotalPct ?? 0m)), r.DocType?.ToString() ?? ""
                }).ToList()
            );
            var sec2 = new ReportSection(
                "Subtotal Discounts",
                ["Receipt", "Cashier", "Type", "Discount", "Disc%"],
                subRows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Cashier?.ToString() ?? "",
                    r.Pfx?.ToString() ?? "", F((decimal)(r.SDiscount ?? 0m)),
                    F((decimal)(r.SDIs ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Discount Report", [sec1, sec2], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Discount Report"); }
    }

    // ── 6. Loyalty Report ─────────────────────────────────────────────────────
    public async Task<TableReportDto> GetLoyaltyReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(pd.Receipt,10) Receipt, LEFT(pd.CustomerCode,16) CustomerCode, pd.Amount
                FROM PaymentDet pd
                WHERE pd.BillTypeID=2 AND pd.UpdateUnitNo=@UnitNo AND pd.LocationID=@LocationID
                  AND pd.Status=1 AND pd.PayTypeID=17 AND pd.Amount!=0
                  AND (pd.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND pd.IsDayEnd=0
                  AND pd.ShiftNo=CASE WHEN @ShiftNo=0 THEN pd.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(pd.Receipt,10)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var section = new ReportSection(
                "Loyalty Points Earned",
                ["Receipt", "Customer", "Points"],
                rows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.CustomerCode?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Loyalty Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Loyalty Report"); }
    }

    // ── 7. Credit Card Report ─────────────────────────────────────────────────
    public async Task<TableReportDto> GetCreditCardReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            var p = new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo };
            const string sumSql = @"
                SELECT SUM(pd.Amount) Amount, pt.Descrip CardType, b.Bank,
                       CAST(COUNT(pd.PayTypeID) AS VARCHAR) Count
                FROM PaymentDet pd
                INNER JOIN Paytype pt ON pd.PayTypeID=pt.PaymentID
                INNER JOIN Bank b ON b.BankID=pd.BankId
                WHERE pd.BillTypeID=1 AND pd.UpdateUnitNo=@UnitNo AND pd.LocationID=@LocationID
                  AND (pd.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND pd.IsDayEnd=0 AND pd.Status=1 AND pt.[Type]=1 AND pd.SaleTypeID=1
                  AND pd.ShiftNo=CASE WHEN @ShiftNo=0 THEN pd.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                GROUP BY pt.Descrip, b.Bank
                ORDER BY b.Bank, pt.Descrip";
            const string detSql = @"
                SELECT RIGHT(pd.Receipt,10) Receipt, pd.Amount, pt.Descrip CardType, b.Bank, RIGHT(pd.RefNo,6) RefNo
                FROM PaymentDet pd
                INNER JOIN Paytype pt ON pd.PayTypeID=pt.PaymentID
                INNER JOIN Bank b ON b.BankID=pd.BankId
                WHERE (pd.BillTypeID=1 OR pd.BillTypeID=6) AND pd.UpdateUnitNo=@UnitNo AND pd.LocationID=@LocationID
                  AND pd.Status=1 AND pt.[Type]=1
                  AND (pd.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND pd.IsDayEnd=0
                  AND pd.ShiftNo=CASE WHEN @ShiftNo=0 THEN pd.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY b.Bank, pt.Descrip, RIGHT(pd.Receipt,10)";
            var sumRows = (await conn.QueryAsync<dynamic>(sumSql, p)).ToList();
            var detRows = (await conn.QueryAsync<dynamic>(detSql, p)).ToList();
            var sec1 = new ReportSection(
                "Summary by Bank/Card",
                ["Bank", "Card Type", "Count", "Amount"],
                sumRows.Select(r => new string[] {
                    r.Bank?.ToString() ?? "", r.CardType?.ToString() ?? "",
                    r.Count?.ToString() ?? "", F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            var sec2 = new ReportSection(
                "Detail",
                ["Receipt", "Bank", "Card Type", "Ref No", "Amount"],
                detRows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Bank?.ToString() ?? "",
                    r.CardType?.ToString() ?? "", r.RefNo?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Credit Card Report", [sec1, sec2], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Credit Card Report"); }
    }

    // ── 8. Non-Cash Report ────────────────────────────────────────────────────
    public async Task<TableReportDto> GetNonCashReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(pd.Receipt,10) Receipt, pd.Amount, pt.Descrip PayType, pd.RefNo
                FROM PaymentDet pd
                INNER JOIN Paytype pt ON pd.PayTypeID=pt.PaymentID
                WHERE (pd.BillTypeID=1 OR pd.BillTypeID=6) AND pd.UpdateUnitNo=@UnitNo AND pd.LocationID=@LocationID
                  AND (pd.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND pd.IsDayEnd=0 AND pd.Status=1 AND (pt.[Type]=5 OR pt.[Type]=6 OR pt.[Type]=7)
                  AND pd.ShiftNo=CASE WHEN @ShiftNo=0 THEN pd.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY pt.Descrip, RIGHT(pd.Receipt,10)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var section = new ReportSection(
                "Non-Cash Payments",
                ["Receipt", "Pay Type", "Ref No", "Amount"],
                rows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.PayType?.ToString() ?? "",
                    r.RefNo?.ToString() ?? "", F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Non-Cash Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Non-Cash Report"); }
    }

    // ── 9. Staff Purchase ─────────────────────────────────────────────────────
    public async Task<TableReportDto> GetStaffPurchaseAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(pd.Receipt,10) Receipt, RIGHT(pd.CustomerCode,16) CustomerCode,
                       pd.EnCodeName Name,
                       ISNULL(CASE WHEN pd.Amount>pd.Balance THEN pd.Balance ELSE pd.Amount END,0) Amount,
                       LEFT(pd.Descrip,12) PayType, RIGHT(pd.RefNo,4) RefNo
                FROM PaymentDet pd
                WHERE pd.BillTypeID=1 AND pd.UpdateUnitNo=@UnitNo AND pd.LocationID=@LocationID
                  AND pd.Status=1 AND pd.CustomerType=2
                  AND (pd.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND pd.IsDayEnd=0
                  AND pd.ShiftNo=CASE WHEN @ShiftNo=0 THEN pd.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(pd.Receipt,10)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var section = new ReportSection(
                "Staff Purchases",
                ["Receipt", "Code", "Name", "Pay Type", "Ref", "Amount"],
                rows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.CustomerCode?.ToString() ?? "",
                    r.Name?.ToString() ?? "", r.PayType?.ToString() ?? "",
                    r.RefNo?.ToString() ?? "", F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Staff Purchase Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Staff Purchase Report"); }
    }

    // ── 10. Gift Voucher ──────────────────────────────────────────────────────
    public async Task<TableReportDto> GetGiftVoucherAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            var p = new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo };
            const string soldSql = @"
                SELECT RIGHT(td.Receipt,10) Receipt, LEFT(td.ProductCode,15) Voucher,
                       td.Amount,
                       CASE WHEN td.DocumentID=6 THEN td.SDiscount ELSE 0 END SubDisc,
                       CASE WHEN td.DocumentID!=6 THEN td.Amount-td.Nett ELSE 0 END ItemDisc
                FROM TransactionDet td
                WHERE td.BillTypeID=1 AND td.SaleTypeID=2 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0 AND td.DocumentID IN (1,6) AND td.Status=1 AND td.TransStatus=1
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(td.Receipt,10)";
            const string redSql = @"
                SELECT RIGHT(pd.Receipt,10) Receipt, RIGHT(pd.RefNo,15) Voucher, pd.Amount
                FROM PaymentDet pd
                WHERE pd.BillTypeID=1 AND pd.UpdateUnitNo=@UnitNo AND pd.LocationID=@LocationID
                  AND (pd.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND pd.IsDayEnd=0 AND pd.Status=1 AND pd.PayTypeID=6
                  AND pd.ShiftNo=CASE WHEN @ShiftNo=0 THEN pd.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(pd.Receipt,10)";
            var soldRows = (await conn.QueryAsync<dynamic>(soldSql, p)).ToList();
            var redRows  = (await conn.QueryAsync<dynamic>(redSql, p)).ToList();
            var sec1 = new ReportSection(
                "Gift Vouchers Sold",
                ["Receipt", "Voucher", "Amount", "Sub Disc", "Item Disc"],
                soldRows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Voucher?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m)), F((decimal)(r.SubDisc ?? 0m)),
                    F((decimal)(r.ItemDisc ?? 0m))
                }).ToList()
            );
            var sec2 = new ReportSection(
                "Gift Vouchers Redeemed",
                ["Receipt", "Voucher", "Amount"],
                redRows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Voucher?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Gift Voucher Report", [sec1, sec2], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Gift Voucher Report"); }
    }

    // ── 11. Gift Card ─────────────────────────────────────────────────────────
    public async Task<TableReportDto> GetGiftCardAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            var p = new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo };
            const string soldSql = @"
                SELECT RIGHT(td.Receipt,10) Receipt, LEFT(td.ProductCode,15) Voucher,
                       td.Amount,
                       CASE WHEN td.DocumentID=6 THEN td.SDiscount ELSE 0 END SubDisc,
                       CASE WHEN td.DocumentID!=6 THEN td.Amount-td.Nett ELSE 0 END ItemDisc
                FROM TransactionDet td
                WHERE td.BillTypeID=1 AND td.SaleTypeID=7 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0 AND td.DocumentID IN (1,6) AND td.Status=1 AND td.TransStatus=1
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(td.Receipt,10)";
            const string redSql = @"
                SELECT RIGHT(pd.Receipt,10) Receipt, RIGHT(pd.RefNo,15) Voucher, pd.Amount
                FROM PaymentDet pd
                WHERE pd.BillTypeID=1 AND pd.UpdateUnitNo=@UnitNo AND pd.LocationID=@LocationID
                  AND (pd.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND pd.IsDayEnd=0 AND pd.Status=1 AND pd.PayTypeID=19
                  AND pd.ShiftNo=CASE WHEN @ShiftNo=0 THEN pd.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY RIGHT(pd.Receipt,10)";
            var soldRows = (await conn.QueryAsync<dynamic>(soldSql, p)).ToList();
            var redRows  = (await conn.QueryAsync<dynamic>(redSql, p)).ToList();
            var sec1 = new ReportSection(
                "Gift Cards Sold",
                ["Receipt", "Voucher", "Amount", "Sub Disc", "Item Disc"],
                soldRows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Voucher?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m)), F((decimal)(r.SubDisc ?? 0m)),
                    F((decimal)(r.ItemDisc ?? 0m))
                }).ToList()
            );
            var sec2 = new ReportSection(
                "Gift Cards Redeemed",
                ["Receipt", "Voucher", "Amount"],
                redRows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.Voucher?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Gift Card Report", [sec1, sec2], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Gift Card Report"); }
    }

    // ── 12. Paid Out ──────────────────────────────────────────────────────────
    public async Task<TableReportDto> GetPaidoutReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(td.Receipt,10) Receipt, LEFT(CAST(td.StartTime AS TIME),8) STime,
                       LEFT(c.LogName,7) Cashier, LEFT(UPPER(td.Descrip),25) Descrip, td.Nett Amount,
                       UPPER(pt.[DESCRIPTION]) PoutType
                FROM TransactionDet td
                INNER JOIN PaidOutType pt ON td.ProductID=pt.PaidOutTypeID
                INNER JOIN Cashier c ON c.CashierID=td.CashierID
                WHERE td.BillTypeID=3 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0 AND td.DocumentID=8 AND td.Status=1 AND td.TransStatus=1
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY pt.PaidOutTypeID, RIGHT(td.Receipt,10)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var dataRows = rows.Select(r => new string[] {
                r.Receipt?.ToString() ?? "", r.STime?.ToString() ?? "",
                r.Cashier?.ToString() ?? "", r.Descrip?.ToString() ?? "",
                r.PoutType?.ToString() ?? "", F((decimal)(r.Amount ?? 0m))
            }).ToList();
            var total = dataRows.Sum(r => decimal.TryParse(r[5], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0);
            var footer = new string[] { "", "", "", "", "TOTAL", F(total) };
            var section = new ReportSection(
                "Paid Out",
                ["Receipt", "Time", "Cashier", "Description", "Type", "Amount"],
                dataRows,
                footer
            );
            return new TableReportDto("Paid Out Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Paid Out Report"); }
    }

    // ── 13. Paid In ───────────────────────────────────────────────────────────
    public async Task<TableReportDto> GetPaidInReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(td.Receipt,10) Receipt, LEFT(CAST(td.StartTime AS TIME),8) STime,
                       LEFT(c.LogName,7) Cashier, LEFT(UPPER(td.Descrip),25) Descrip, td.Nett Amount,
                       UPPER(pit.[DESCRIPTION]) PinType
                FROM TransactionDet td
                INNER JOIN PaidInType pit ON td.ProductID=pit.PaidInTypeID
                INNER JOIN Cashier c ON c.CashierID=td.CashierID
                WHERE td.BillTypeID=6 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0 AND td.DocumentID=9 AND td.Status=1 AND td.TransStatus=1
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                ORDER BY pit.PaidInTypeID, RIGHT(td.Receipt,10)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var dataRows = rows.Select(r => new string[] {
                r.Receipt?.ToString() ?? "", r.STime?.ToString() ?? "",
                r.Cashier?.ToString() ?? "", r.Descrip?.ToString() ?? "",
                r.PinType?.ToString() ?? "", F((decimal)(r.Amount ?? 0m))
            }).ToList();
            var total = dataRows.Sum(r => decimal.TryParse(r[5], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0);
            var footer = new string[] { "", "", "", "", "TOTAL", F(total) };
            var section = new ReportSection(
                "Paid In",
                ["Receipt", "Time", "Cashier", "Description", "Type", "Amount"],
                dataRows,
                footer
            );
            return new TableReportDto("Paid In Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Paid In Report"); }
    }

    // ── 14. Salesman Report ───────────────────────────────────────────────────
    public async Task<TableReportDto> GetSalesmanReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT LEFT(s.Name,12) Name,
                       ISNULL(SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Amount ELSE 0 END),0) GrossSale,
                       ISNULL(SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Qty ELSE 0 END),0) SoldQty,
                       ISNULL(SUM(CASE WHEN td.DocumentID IN (2,4) THEN td.Amount ELSE 0 END),0) Refund,
                       ISNULL(SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.IDiscount1+td.IDiscount2+td.IDiscount3+td.IDiscount4+td.IDiscount5 ELSE 0 END),0) IDiscount,
                       ISNULL(SUM(CASE WHEN td.DocumentID=6 THEN td.SDiscount ELSE 0 END),0) SDiscount,
                       ISNULL(SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Nett WHEN td.DocumentID IN (2,4) THEN -td.Nett WHEN td.DocumentID=6 THEN -td.SDiscount ELSE 0 END),0) NetAmount
                FROM TransactionDet td
                INNER JOIN Salesman s ON td.SalesmanID=s.SalesManID
                WHERE td.BillTypeID=1 AND td.SaleTypeID=1 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND td.IsDayEnd=0 AND td.DocumentID IN (1,2,3,4,6) AND td.SalesmanID!=0
                  AND td.Status=1 AND td.TransStatus=1
                  AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                GROUP BY LEFT(s.Name,12)
                ORDER BY LEFT(s.Name,12)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var section = new ReportSection(
                "Salesman Summary",
                ["Salesman", "Gross Sale", "Qty", "Refund", "Item Disc", "Sub Disc", "Net Amount"],
                rows.Select(r => new string[] {
                    r.Name?.ToString() ?? "", F((decimal)(r.GrossSale ?? 0m)),
                    ((decimal)(r.SoldQty ?? 0m)).ToString("N2"),
                    F((decimal)(r.Refund ?? 0m)), F((decimal)(r.IDiscount ?? 0m)),
                    F((decimal)(r.SDiscount ?? 0m)), F((decimal)(r.NetAmount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Salesman Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Salesman Report"); }
    }

    // ── 15. Non-Sales Report ──────────────────────────────────────────────────
    public async Task<TableReportDto> GetNonSalesReportAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT RIGHT(LTRIM(RTRIM(sh.Receipt)),8) Receipt,
                       LEFT(CAST(MAX(sh.StartTime) AS TIME),5) STime,
                       LEFT(c.LogName,6) Cashier,
                       ISNULL(SUM(CASE sh.DocumentID WHEN 1 THEN sh.Nett WHEN 2 THEN -sh.Nett WHEN 3 THEN sh.Nett WHEN 4 THEN -sh.Nett WHEN 6 THEN -sh.Nett ELSE 0 END),0) Amount,
                       t.TransName,
                       ISNULL(SUM(CASE sh.DocumentID WHEN 1 THEN sh.Qty WHEN 2 THEN -sh.Qty WHEN 3 THEN sh.Qty WHEN 4 THEN -sh.Qty ELSE 0 END),0) Qty
                FROM TransactionDet sh
                INNER JOIN Cashier c ON sh.CashierID=c.CashierID
                INNER JOIN TransactionType t ON sh.TransStatus=t.TransID
                WHERE sh.UpdateUnitNo=@UnitNo AND sh.LocationID=@LocationID
                  AND (sh.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                  AND t.TransID!=1 AND sh.BillTypeID!=4 AND sh.IsDayEnd=0
                  AND sh.ShiftNo=CASE WHEN @ShiftNo=0 THEN sh.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                GROUP BY RIGHT(LTRIM(RTRIM(sh.Receipt)),8), LEFT(c.LogName,6), t.TransName
                ORDER BY t.TransName, RIGHT(LTRIM(RTRIM(sh.Receipt)),8)";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var section = new ReportSection(
                "Non-Sales Transactions",
                ["Receipt", "Time", "Cashier", "Type", "Qty", "Amount"],
                rows.Select(r => new string[] {
                    r.Receipt?.ToString() ?? "", r.STime?.ToString() ?? "",
                    r.Cashier?.ToString() ?? "", r.TransName?.ToString() ?? "",
                    ((decimal)(r.Qty ?? 0m)).ToString("N2"), F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Non-Sales Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Non-Sales Report"); }
    }

    // ── 16. Pending Item-Wise ─────────────────────────────────────────────────
    public async Task<TableReportDto> GetPendingItemWiseAsync(
        int locationID, int locationIDBilling, int unitNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT ISNULL(d.DepartmentName,'Other') + ' - ' + ISNULL(cat.InvCategoryName,'Other') Category,
                       LEFT(pm.NameOnInvoice,30) ItemName,
                       SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Qty WHEN td.DocumentID IN (2,4) THEN -td.Qty ELSE 0 END) Qty,
                       SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Nett WHEN td.DocumentID IN (2,4) THEN -td.Nett ELSE 0 END) Amount
                FROM TempItemDet td
                JOIN ProductMaster pm ON pm.ProductID=td.ProductID AND pm.LocationID=td.LocationID
                LEFT JOIN InvDepartment d ON d.InvDepartmentID=pm.DepartmentID
                LEFT JOIN InvCategory cat ON cat.InvCategoryID=pm.CategoryID
                WHERE td.BillTypeID=1 AND td.UnitNo=@UnitNo AND td.LocationID=@LocationID
                  AND td.DocumentID IN (1,2,3,4) AND td.TransStatus=1
                  AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                GROUP BY ISNULL(d.DepartmentName,'Other') + ' - ' + ISNULL(cat.InvCategoryName,'Other'),
                         LEFT(pm.NameOnInvoice,30)
                ORDER BY Category, ItemName";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo })).ToList();
            var dataRows = rows.Select(r => new string[] {
                r.Category?.ToString() ?? "", r.ItemName?.ToString() ?? "",
                ((decimal)(r.Qty ?? 0m)).ToString("N2"), F((decimal)(r.Amount ?? 0m))
            }).ToList();
            var totalQty = dataRows.Sum(r => decimal.TryParse(r[2], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0);
            var totalAmt = dataRows.Sum(r => decimal.TryParse(r[3], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0);
            var footer = new string[] { "", "TOTAL", F(totalQty), F(totalAmt) };
            var section = new ReportSection(
                "Pending Items",
                ["Category", "Item", "Qty", "Amount"],
                dataRows,
                footer
            );
            return new TableReportDto("Pending Item-Wise Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Pending Item-Wise Report"); }
    }

    // ── 17. Sales Including Pending ───────────────────────────────────────────
    public async Task<TableReportDto> GetSalesIncludingPendingAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo)
    {
        try
        {
            using var conn = db.Create();
            conn.Open();
            const string sql = @"
                SELECT Category, ItemName, SUM(Qty) Qty, SUM(Amount) Amount FROM (
                    SELECT ISNULL(d.DepartmentName,'Other') + ' - ' + ISNULL(cat.InvCategoryName,'Other') Category,
                           LEFT(pm.NameOnInvoice,30) ItemName,
                           SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Qty WHEN td.DocumentID IN (2,4) THEN -td.Qty ELSE 0 END) Qty,
                           SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Nett WHEN td.DocumentID IN (2,4) THEN -td.Nett ELSE 0 END) Amount,
                           'C' Source
                    FROM TransactionDet td
                    JOIN ProductMaster pm ON pm.ProductID=td.ProductID AND pm.LocationID=td.LocationID
                    LEFT JOIN InvDepartment d ON d.InvDepartmentID=pm.DepartmentID
                    LEFT JOIN InvCategory cat ON cat.InvCategoryID=pm.CategoryID
                    WHERE td.BillTypeID=1 AND td.UpdateUnitNo=@UnitNo AND td.LocationID=@LocationID
                      AND td.DocumentID IN (1,2,3,4) AND td.Status=1 AND td.TransStatus=1
                      AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                      AND td.IsDayEnd=0
                      AND td.ShiftNo=CASE WHEN @ShiftNo=0 THEN td.ShiftNo WHEN @ShiftNo=-1 THEN 0 ELSE @ShiftNo END
                    GROUP BY ISNULL(d.DepartmentName,'Other') + ' - ' + ISNULL(cat.InvCategoryName,'Other'),
                             LEFT(pm.NameOnInvoice,30)
                    UNION ALL
                    SELECT ISNULL(d.DepartmentName,'Other') + ' - ' + ISNULL(cat.InvCategoryName,'Other') Category,
                           LEFT(pm.NameOnInvoice,30) ItemName,
                           SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Qty WHEN td.DocumentID IN (2,4) THEN -td.Qty ELSE 0 END) Qty,
                           SUM(CASE WHEN td.DocumentID IN (1,3) THEN td.Nett WHEN td.DocumentID IN (2,4) THEN -td.Nett ELSE 0 END) Amount,
                           'P' Source
                    FROM TempItemDet td
                    JOIN ProductMaster pm ON pm.ProductID=td.ProductID AND pm.LocationID=td.LocationID
                    LEFT JOIN InvDepartment d ON d.InvDepartmentID=pm.DepartmentID
                    LEFT JOIN InvCategory cat ON cat.InvCategoryID=pm.CategoryID
                    WHERE td.BillTypeID=1 AND td.UnitNo=@UnitNo AND td.LocationID=@LocationID
                      AND td.DocumentID IN (1,2,3,4) AND td.TransStatus=1
                      AND (td.LocationIDBilling=@LocationIDBilling OR @LocationIDBilling=0)
                    GROUP BY ISNULL(d.DepartmentName,'Other') + ' - ' + ISNULL(cat.InvCategoryName,'Other'),
                             LEFT(pm.NameOnInvoice,30)
                ) x
                GROUP BY Category, ItemName
                ORDER BY Category, ItemName";
            var rows = (await conn.QueryAsync<dynamic>(sql, new { LocationID = locationID, LocationIDBilling = locationIDBilling, UnitNo = unitNo, ShiftNo = shiftNo })).ToList();
            var section = new ReportSection(
                "Sales Including Pending",
                ["Category", "Item", "Qty", "Amount"],
                rows.Select(r => new string[] {
                    r.Category?.ToString() ?? "", r.ItemName?.ToString() ?? "",
                    ((decimal)(r.Qty ?? 0m)).ToString("N2"), F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Sales Including Pending Report", [section], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Sales Including Pending Report"); }
    }

    // ── 18. Day Book ──────────────────────────────────────────────────────────
    public async Task<TableReportDto> GetDayBookReportAsync(int locationID, int unitNo)
    {
        try
        {
            using var conn = (SqlConnection)db.Create();
            conn.Open();
            using var multi = await conn.QueryMultipleAsync(
                "sp_rpt_getdaybook",
                new { LocationID = locationID, UnitNo = unitNo, IsDaySummary = false },
                commandType: CommandType.StoredProcedure);
            var cashflow    = (await multi.ReadAsync<dynamic>()).ToList();
            var deptSummary = (await multi.ReadAsync<dynamic>()).ToList();
            var invoices    = (await multi.ReadAsync<dynamic>()).ToList();
            var sec1 = new ReportSection(
                "Cash Flow",
                ["Group", "Description", "In", "Out"],
                cashflow.Select(r => new string[] {
                    r.Group1?.ToString() ?? "", r.Description?.ToString() ?? "",
                    F((decimal)(r.Amount ?? 0m)), F((decimal)(r.Amount1 ?? 0m))
                }).ToList()
            );
            var sec2 = new ReportSection(
                "Department Summary",
                ["Department", "Gross", "Disc", "Service Ch", "Net"],
                deptSummary.Select(r => new string[] {
                    r.Description?.ToString() ?? "", F((decimal)(r.Amount ?? 0m)),
                    F((decimal)(r.ItemDiscount ?? 0m)), F((decimal)(r.ServiceCharge ?? 0m)),
                    F((decimal)(r.Amount1 ?? 0m))
                }).ToList()
            );
            var sec3 = new ReportSection(
                "Invoices",
                ["Location", "Receipt", "Pay Type", "Amount"],
                invoices.Select(r => new string[] {
                    r.BillingLocation?.ToString() ?? "", r.Receipt?.ToString() ?? "",
                    r.Description?.ToString() ?? "", F((decimal)(r.Amount ?? 0m))
                }).ToList()
            );
            return new TableReportDto("Day Book Report", [sec1, sec2, sec3], DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"));
        }
        catch (SqlException) { return EmptyReport("Day Book Report"); }
    }

    // ── 19. Z Reading ─────────────────────────────────────────────────────────
    public async Task<SalesReadingDto> GetZReadingAsync(SalesReadingRequest r)
    {
        using var conn = db.Create();
        conn.Open();

        // Z Reading shows all cashiers
        long cashierFilter = 0;

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
              AND IsDayEnd            = 1
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
              AND pd.IsDayEnd     = 1
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
}
