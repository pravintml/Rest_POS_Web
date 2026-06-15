using Dapper;
using System.Data;

namespace RestPos.Data;

/// <summary>
/// Thin helpers that open-and-close a connection per call, mirroring the
/// legacy CommonDataAccess.getDataTable / executeCommand pattern but without
/// the static shared-connection antipattern.
/// </summary>
public static class DapperExtensions
{
    public static async Task<IEnumerable<T>> QueryAsync<T>(
        this IDbConnectionFactory factory,
        string sql,
        object? param = null,
        CommandType commandType = CommandType.Text)
    {
        using var conn = factory.Create();
        conn.Open();
        return await conn.QueryAsync<T>(sql, param, commandType: commandType);
    }

    public static async Task<T?> QueryFirstOrDefaultAsync<T>(
        this IDbConnectionFactory factory,
        string sql,
        object? param = null,
        CommandType commandType = CommandType.Text)
    {
        using var conn = factory.Create();
        conn.Open();
        return await conn.QueryFirstOrDefaultAsync<T>(sql, param, commandType: commandType);
    }

    public static async Task<int> ExecuteAsync(
        this IDbConnectionFactory factory,
        string sql,
        object? param = null,
        CommandType commandType = CommandType.StoredProcedure)
    {
        using var conn = factory.Create();
        conn.Open();
        return await conn.ExecuteAsync(sql, param, commandType: commandType);
    }

    public static async Task<T?> ExecuteScalarAsync<T>(
        this IDbConnectionFactory factory,
        string sql,
        object? param = null,
        CommandType commandType = CommandType.StoredProcedure)
    {
        using var conn = factory.Create();
        conn.Open();
        return await conn.ExecuteScalarAsync<T>(sql, param, commandType: commandType);
    }
}
