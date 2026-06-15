using Dapper;
using RestPos.Domain.Dtos;
using System.Data;

namespace RestPos.Data.Repositories;

public interface IPaymentRepository
{
    Task<bool> AddPaymentAsync(AddPaymentRequest req);
    Task<bool> ClearPaymentAsync(ClearPaymentRequest req);
    Task<decimal> GetPaidTotalAsync(int locationID, string receipt, int unitNo, int? payTypeID = null);
    Task<IEnumerable<PaymentLineDto>> GetPaymentLinesAsync(int locationID, int locationIDBilling, int tableID, long ticketID);
    Task<IEnumerable<PayTypeDto>> GetPayTypesAsync(int locationID);
}

public class PaymentRepository(IDbConnectionFactory db) : IPaymentRepository
{
    public async Task<bool> AddPaymentAsync(AddPaymentRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spTempPaymentUpdate", new
        {
            r.LocationID, r.Receipt, r.UnitNo,
            r.BillTypeID, r.SaleTypeID, r.CashierID, r.PayTypeID,
            r.Amount, Balance = r.Balance, r.RefNo, r.BankID,
            TerminalID = r.TerminalID, ChequeDate = r.ChequeDate,
            r.IsRecallAdv, r.RecallNo, r.Descrip, EnCodeName = r.EnCodeName,
            r.LocationIDBilling, r.TableID, r.TicketID
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<bool> ClearPaymentAsync(ClearPaymentRequest r)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.ExecuteAsync("spClearPayment", new
        {
            r.LocationID, r.LocationIDBilling, r.TableID, r.TicketID
        }, commandType: CommandType.StoredProcedure);
        return rows >= 0;
    }

    public async Task<decimal> GetPaidTotalAsync(int locationID, string receipt, int unitNo, int? payTypeID = null)
    {
        using var conn = db.Create();
        conn.Open();
        string sql = payTypeID.HasValue
            ? "SELECT ISNULL(SUM(Amount),0) FROM TempPaymentDet WHERE LocationID=@LocationID AND Receipt=@Receipt AND UnitNo=@UnitNo AND PayTypeID=@PayTypeID"
            : "SELECT ISNULL(SUM(Amount),0) FROM TempPaymentDet WHERE LocationID=@LocationID AND Receipt=@Receipt AND UnitNo=@UnitNo";
        return await conn.ExecuteScalarAsync<decimal>(sql, new { LocationID = locationID, Receipt = receipt, UnitNo = unitNo, PayTypeID = payTypeID });
    }

    public async Task<IEnumerable<PaymentLineDto>> GetPaymentLinesAsync(int locationID, int locationIDBilling, int tableID, long ticketID)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT PayTypeID, ISNULL(Descrip,'') Descrip, Amount, ISNULL(RefNo,'') RefNo, RowNo
            FROM TempPaymentDet
            WHERE LocationID=@LocationID AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID AND TicketID=@TicketID
            ORDER BY RowNo";
        return await conn.QueryAsync<PaymentLineDto>(sql, new
        {
            LocationID = locationID, LocationIDBilling = locationIDBilling,
            TableID = tableID, TicketID = ticketID
        });
    }

    public async Task<IEnumerable<PayTypeDto>> GetPayTypesAsync(int locationID)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT PayTypeID, PayTypeName, CAST(1 AS BIT) IsActive
            FROM PayTypeMaster
            WHERE LocationID=@LocationID AND IsActive=1
            ORDER BY SortOrder, PayTypeName";
        return await conn.QueryAsync<PayTypeDto>(sql, new { LocationID = locationID });
    }
}
