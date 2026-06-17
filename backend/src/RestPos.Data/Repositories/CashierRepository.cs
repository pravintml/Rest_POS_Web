using Dapper;
using RestPos.Domain;
using System.Data;

namespace RestPos.Data.Repositories;

public interface ICashierRepository
{
    Task<Cashier?> GetByPasswordAsync(string password, int locationId);
    Task<Cashier?> GetByEncodeAsync(string encode, int locationId);
    Task<Dictionary<string, bool>> GetPermissionsAsync(long cashierId, int locationId);
}

public class CashierRepository(IDbConnectionFactory db) : ICashierRepository
{
    private const string SelectCols = "[CashierID],[Code],[LocationID],[Name],[LogName],[Password],[Encode],[Type]";

    public Task<Cashier?> GetByPasswordAsync(string password, int locationId) =>
        db.QueryFirstOrDefaultAsync<Cashier>(
            $"SELECT TOP 1 {SelectCols} FROM Cashier WHERE [Password]=@Password AND [LocationID]=@LocationID",
            new { Password = password, LocationID = locationId });

    public Task<Cashier?> GetByEncodeAsync(string encode, int locationId) =>
        db.QueryFirstOrDefaultAsync<Cashier>(
            $"SELECT TOP 1 {SelectCols} FROM Cashier WHERE [Encode]=@Encode AND [LocationID]=@LocationID",
            new { Encode = encode, LocationID = locationId });

    public async Task<Dictionary<string, bool>> GetPermissionsAsync(long cashierId, int locationId)
    {
        using var conn = db.Create();
        conn.Open();
        var rows = await conn.QueryAsync<PermissionRow>(
            "SELECT DISTINCT FunctName, CAST(IsAccess AS BIT) AS IsAccess FROM CashierPermission WHERE CashierID=@CashierID AND LocationID=@LocationID",
            new { CashierID = cashierId, LocationID = locationId });
        return rows.ToDictionary(r => r.FunctName, r => r.IsAccess);
    }

    private record PermissionRow(string FunctName, bool IsAccess);
}
