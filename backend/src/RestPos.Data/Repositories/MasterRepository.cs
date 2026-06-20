using Dapper;
using RestPos.Domain.Dtos;
using System.Data;

namespace RestPos.Data.Repositories;

public interface IMasterRepository
{
    Task<IEnumerable<BillingLocationDto>> GetBillingLocationsAsync(int unitNo);
    Task<IEnumerable<TableInfoDto>> GetTablesAsync(int locationId, int billingLocationId);
    Task<IEnumerable<StewardDto>> GetStewardsAsync();
    Task<IEnumerable<ItemLayer1Dto>> GetItemLayer1Async();
    Task<IEnumerable<ItemLayer2Dto>> GetItemLayer2Async(long layer1Id);
    Task<IEnumerable<TicketDto>> GetAvailableTicketsAsync(int locationId, int billingLocationId, int tableId);
    Task<long> AllocateTicketAsync(int locationId);
    Task<IEnumerable<ItemCommentOptionDto>> GetItemCommentsAsync();
    Task<IEnumerable<DiscountTypeDto>> GetDiscountTypesAsync();
}

public class MasterRepository(IDbConnectionFactory db) : IMasterRepository
{
    // Mirrors FrmPOS.LoadLocations / MasterFileService.GetLocationsForTouch
    public async Task<IEnumerable<BillingLocationDto>> GetBillingLocationsAsync(int unitNo)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT LOCATIONID AS LocationId, LOCATIONNAME AS Name
            FROM Counters WHERE UnitNo=@UnitNo
            ORDER BY LocationCode";
        return await conn.QueryAsync<BillingLocationDto>(sql, new { UnitNo = unitNo });
    }

    // Mirrors FrmPOS.LoadTables + RefreshTables() coloring logic:
    //   Available=0, Occupied(1 ticket)=1, MultiOccupied(2+)=2, Printed(all KOT sent)=3
    public async Task<IEnumerable<TableInfoDto>> GetTablesAsync(int locationId, int billingLocationId)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT
                td.TableID,
                td.TableName,
                CASE
                    WHEN pr.TableID IS NOT NULL       THEN 3
                    WHEN ISNULL(occ.Tickets, 0) > 1   THEN 2
                    WHEN ISNULL(occ.Tickets, 0) = 1   THEN 1
                    ELSE 0
                END AS Status,
                ISNULL(occ.Tickets, 0)      AS Tickets,
                ISNULL(occ.StewardName, '') AS StewardName
            FROM TableDetails td
            LEFT JOIN (
                SELECT TableID,
                       COUNT(DISTINCT TicketID)      AS Tickets,
                       MAX(ISNULL(StewardName, ''))  AS StewardName
                FROM TempItemDet
                WHERE LocationID          = @LocationID
                  AND LocationIDBilling   = @LocationIDBilling
                  AND DocumentID IN (1,2,3,4,10)
                GROUP BY TableID
            ) occ ON td.TableID = occ.TableID
            LEFT JOIN (
                SELECT DISTINCT TableID
                FROM TempItemDet
                WHERE LocationID          = @LocationID
                  AND LocationIDBilling   = @LocationIDBilling
                  AND DocumentID IN (1,2,3,4)
                  AND TicketID NOT IN (
                      SELECT TicketID FROM TempItemDet
                      WHERE LocationID          = @LocationID
                        AND LocationIDBilling   = @LocationIDBilling
                        AND DocumentID IN (1,2,3,4)
                        AND IsCustomerCopy      = 0
                  )
            ) pr ON td.TableID = pr.TableID
            WHERE td.LocationID = @LocationIDBilling
            ORDER BY td.TableCode";
        return await conn.QueryAsync<TableInfoDto>(sql, new
        {
            LocationID         = locationId,
            LocationIDBilling  = billingLocationId
        });
    }

    // Mirrors MasterFileService.GetStewardForTouch
    public async Task<IEnumerable<StewardDto>> GetStewardsAsync()
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = "SELECT StewardID, StewardName FROM Steward ORDER BY OrderNo";
        return await conn.QueryAsync<StewardDto>(sql);
    }

    // Mirrors MasterFileService.GetItemCommentsForTouch (predefined item-comment buttons)
    public async Task<IEnumerable<ItemCommentOptionDto>> GetItemCommentsAsync()
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = "SELECT CommentID, Comment FROM ItemComment ORDER BY CommentID";
        return await conn.QueryAsync<ItemCommentOptionDto>(sql);
    }

    public async Task<IEnumerable<DiscountTypeDto>> GetDiscountTypesAsync()
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT DId, Descrip, Pfx, MaxDiscount, IsActive
            FROM DiscountType WHERE IsActive=1 ORDER BY DId";
        return await conn.QueryAsync<DiscountTypeDto>(sql);
    }

    // Mirrors MasterFileService.GetItemLayer1
    public async Task<IEnumerable<ItemLayer1Dto>> GetItemLayer1Async()
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = "SELECT ItemLayer1ID, ItemLayer1Name FROM ItemLayer1 ORDER BY OrderNo";
        return await conn.QueryAsync<ItemLayer1Dto>(sql);
    }

    // Mirrors MasterFileService.GetItemLayer2
    public async Task<IEnumerable<ItemLayer2Dto>> GetItemLayer2Async(long layer1Id)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT ItemLayer2ID, ItemLayer2Name FROM ItemLayer2
            WHERE ItemLayer1ID=@Layer1Id ORDER BY OrderNo";
        return await conn.QueryAsync<ItemLayer2Dto>(sql, new { Layer1Id = layer1Id });
    }

    // Mirrors TransactionService.GetAvailableTicketsForCurrentTable
    public async Task<IEnumerable<TicketDto>> GetAvailableTicketsAsync(
        int locationId, int billingLocationId, int tableId)
    {
        using var conn = db.Create();
        conn.Open();
        const string sql = @"
            SELECT
                TicketID,
                SUM(CASE WHEN DocumentID IN (1,3,8,10) THEN Nett
                         WHEN DocumentID IN (2,6)      THEN -Nett
                         ELSE 0 END) AS Amount,
                ISNULL(MAX(StewardID), 0)    AS StewardID,
                ISNULL(MAX(StewardName), '') AS StewardName
            FROM TempItemDet
            WHERE LocationID=@LocationID
              AND LocationIDBilling=@LocationIDBilling
              AND TableID=@TableID
              AND DocumentID IN (1,2,3,4,6,8,10)
              AND SaleTypeID=1
              AND BillTypeID=1
            GROUP BY TicketID
            ORDER BY TicketID";
        return await conn.QueryAsync<TicketDto>(sql, new
        {
            LocationID = locationId,
            LocationIDBilling = billingLocationId,
            TableID = tableId
        });
    }

    // Mirrors CommonService.getTicketID — atomic read + increment in one transaction
    public async Task<long> AllocateTicketAsync(int locationId)
    {
        using var conn = db.Create();
        conn.Open();
        using var tx = conn.BeginTransaction();
        var ticketId = await conn.ExecuteScalarAsync<long>(
            "SELECT TOP 1 ISNULL(TicketID,1) FROM SysConfig WHERE LocationID=@LocationID",
            new { LocationID = locationId }, tx);
        await conn.ExecuteAsync(
            "UPDATE SysConfig SET TicketID=ISNULL(TicketID,1)+1 WHERE LocationID=@LocationID",
            new { LocationID = locationId }, tx);
        tx.Commit();
        return ticketId;
    }
}
