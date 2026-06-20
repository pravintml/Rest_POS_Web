namespace RestPos.Domain.Dtos;

public record BillingLocationDto(int LocationId, string Name);

// 0=Available, 1=Occupied(1 ticket), 2=MultiOccupied(2+ tickets), 3=Printed
// Mirrors RefreshTables() color logic in legacy FrmPOS.cs
public enum TableStatus { Available = 0, Occupied = 1, MultiOccupied = 2, Printed = 3 }

public record TableInfoDto(int TableID, string TableName, int Status, int Tickets, string StewardName);
public record StewardDto(int StewardID, string StewardName);
public record ItemLayer1Dto(long ItemLayer1ID, string ItemLayer1Name);
public record ItemLayer2Dto(long ItemLayer2ID, string ItemLayer2Name);
public record TicketDto(long TicketID, decimal Amount, int StewardID, string StewardName);
public record TouchProductDto(long ProductID, string ProductName);
public record ItemCommentOptionDto(int CommentID, string Comment);
public record DiscountTypeDto(int DId, string Descrip, string Pfx, decimal MaxDiscount, bool IsActive);
