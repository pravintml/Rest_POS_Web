namespace RestPos.Domain.Dtos;

public record BillingLocationDto(int LocationId, string Name);
public record TableInfoDto(int TableID, string TableName);
public record StewardDto(int StewardID, string StewardName);
public record ItemLayer1Dto(long ItemLayer1ID, string ItemLayer1Name);
public record ItemLayer2Dto(long ItemLayer2ID, string ItemLayer2Name);
public record TicketDto(long TicketID, decimal Amount, int StewardID, string StewardName);
public record TouchProductDto(long ProductID, string ProductName);
public record ItemCommentOptionDto(int CommentID, string Comment);
