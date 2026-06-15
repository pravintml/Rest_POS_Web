using Dapper;
using RestPos.Domain;
using System.Data;

namespace RestPos.Data.Repositories;

public interface ICashierRepository
{
    Task<Cashier?> GetByPasswordAsync(string password, int locationId);
    Task<Cashier?> GetByEncodeAsync(string encode, int locationId);
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
}
