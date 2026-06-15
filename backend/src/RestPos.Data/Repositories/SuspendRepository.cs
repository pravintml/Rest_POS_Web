using Dapper;
using RestPos.Domain;
using RestPos.Domain.Dtos;
using System.Data;

namespace RestPos.Data.Repositories;

public interface ISuspendRepository
{
    Task<string> SuspendInvoiceAsync(SuspendRequest req);
    Task<bool> RecallSuspendedInvoiceAsync(RecallRequest req);
    Task<SuspendHed?> GetSuspendHedAsync(int locationID, string recallNo, int recallUnitNo);
    Task<IEnumerable<SuspendListItem>> GetSuspendListAsync(int locationID, int unitNo);
    Task<bool> IsExistsSuspendAsync(int locationID, int unitNo);
}

public class SuspendRepository(IDbConnectionFactory db) : ISuspendRepository
{
    public async Task<string> SuspendInvoiceAsync(SuspendRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var p = new DynamicParameters();
        p.Add("@LocationID", r.LocationID);
        p.Add("@Receipt", r.Receipt);
        p.Add("@UnitNo", r.UnitNo);
        p.Add("@CashierID", r.CashierID);
        p.Add("@Amount", r.Amount);
        p.Add("@TransStatus", r.TransStatus);
        p.Add("@suspendNo", dbType: DbType.String, size: 13, direction: ParameterDirection.Output);
        await conn.ExecuteAsync("spSuspendInvoice", p, commandType: CommandType.StoredProcedure);
        return p.Get<string>("@suspendNo") ?? string.Empty;
    }

    public async Task<bool> RecallSuspendedInvoiceAsync(RecallRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spRecallSuspendedInvoice", new
        {
            r.LocationID, r.Receipt, r.UnitNo, r.CashierID,
            r.RecallNo, RecallCashier = r.Cashier, r.RecallUnitNo
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<SuspendHed?> GetSuspendHedAsync(int locationID, string recallNo, int recallUnitNo)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT TOP 1 IsRecall, ISNULL(RecallUnitNo,0) RecallUnitNo,
                   ISNULL(RecallCashier,'') RecallCashier,
                   ISNULL(RecallReceipt,'') RecallReceipt, TransStatus
            FROM SuspendHed
            WHERE LocationID=@LocationID AND SuspendNo=@RecallNo AND UnitNo=@RecallUnitNo";
        return await conn.QueryFirstOrDefaultAsync<SuspendHed>(sql, new
        {
            LocationID = locationID, RecallNo = recallNo, RecallUnitNo = recallUnitNo
        });
    }

    public async Task<IEnumerable<SuspendListItem>> GetSuspendListAsync(int locationID, int unitNo)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT SuspendNo, UnitNo, ISNULL(Amount,0) Amount,
                   CONVERT(varchar(20), SuspendTime, 120) SuspendTime, TransStatus
            FROM SuspendHed
            WHERE LocationID=@LocationID AND IsRecall=0
            ORDER BY SuspendTime DESC";
        return await conn.QueryAsync<SuspendListItem>(sql, new { LocationID = locationID });
    }

    public async Task<bool> IsExistsSuspendAsync(int locationID, int unitNo)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = "SELECT TOP 1 1 FROM SuspendHed WHERE LocationID=@LocationID AND UnitNo=@UnitNo AND IsRecall=0";
        var result = await conn.ExecuteScalarAsync<int?>(sql, new { LocationID = locationID, UnitNo = unitNo });
        return result.HasValue;
    }
}
