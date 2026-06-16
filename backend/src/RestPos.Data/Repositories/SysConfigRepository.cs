using RestPos.Domain;

namespace RestPos.Data.Repositories;

public interface ISysConfigRepository
{
    Task<SysConfig?> GetOnLoadAsync(int locationId, int unitNo);
    Task<SysConfig?> GetPrintHeaderAsync(int locationId, int unitNo);
    Task<SysConfig?> GetPrintFooterAsync(int locationId, int unitNo);
    Task<SysConfig?> GetCounterConfigAsync(int billingLocationId);
}

public class SysConfigRepository(IDbConnectionFactory db) : ISysConfigRepository
{
    // Mirrors the SQL from SysConfigService.GetSysConfig(OnLoad)
    // Only columns that exist in all supported DB versions are selected here;
    // optional new columns (IsLargeFontInKOTBOT, ServiceCharge, IsOrderTakingUnit) use C# defaults.
    private const string OnLoadSql = @"
        SELECT TOP 1
            [LocationID],[LocationCode],[LocationName],[Zno],[Receipt],[Suspend],[Invoice],
            [UnitNo],[Display],Printer,CashDrawer,[Localhost],[Exchange],[Outlet],[Loyalty],
            [MultipleExch],[KeyBoard],[KeyboardLayer],[CashierPwdMaxLen],[LoyaltyLen],
            LoyaltyPreFix,VoucherLen,VoucherPreFix,VoucherPreFixLen,IsVoucherSaleWithItem,
            [LogoPrint],[AllowMinus],[AutoSOff],[ValidateCCD],[ValidateVou],
            [IsTouchVersion],[ExchangeCounter],[VOUonCashSale],[IsPromotion],[Xno],
            BoldSubTotal,BarCodeLen,DecimalPointsCurrency,DecimalPointsQty,
            IsEdcIntergration,DefaultBankID,DefaultBankTerminal,DefaultCardType,
            LoyaltyCaption,Loyaltypoints,GiftCardLen,GiftCardPreFix,[LFAftePrint],[LFAfteAutoCut],
            IsCrystalReport,IsPrePrintInvoice,IsAllowTransactionAfterCustCopy,
            IsShowDayBookonShiftEnd,IsRePrintDiscountedInvoice,
            [StockOnLIne],[ReceiptInit],[SwpCcd],BankTerminal,[UseCardBank],IsKot,
            KotPrinterPort,KotInvoice,SharedKotInvoice,
            PrintItemsOnSus,PrintItemsOnCnl,PrintOffLine,
            Head1,Head2,Head3,Head4,Head5,Tail1,Tail2,Tail3,Tail4,Tail5
        FROM SysConfig
        WHERE LocationID=@LocationID AND UnitNo=@UnitNo";

    private const string PrintHeaderSql = @"
        SELECT TOP 1 [LocationName],
            [Head1],[Head2],[Head3],[Head4],[Head5],[Head6],[Head7],[Head8],[Head9],[Head10]
        FROM SysConfig WHERE LocationID=@LocationID AND UnitNo=@UnitNo";

    private const string PrintFooterSql = @"
        SELECT TOP 1
            [Tail1],[Tail2],[Tail3],[Tail4],[Tail5],[Tail6],[Tail7],[Tail8],[Tail9],[Tail10],
            [LFAftePrint],[LFAfteAutoCut]
        FROM SysConfig WHERE LocationID=@LocationID AND UnitNo=@UnitNo";

    // Mirrors SysConfigService.GetCounterConfig — reads operative POS config from Counters row
    // Only columns verified to exist in Counters table (differs from SysConfig — no IsCrystalReport etc.)
    private const string CounterConfigSql = @"
        SELECT TOP 1
            [LocationID],[LocationCode],[LocationName],[Zno],[Receipt],[Suspend],[Invoice],
            [UnitNo],[Display],Printer,CashDrawer,[Localhost],[Exchange],[Outlet],[Loyalty],
            [MultipleExch],[KeyBoard],[KeyboardLayer],[CashierPwdMaxLen],[LoyaltyLen],
            LoyaltyPreFix,VoucherLen,VoucherPreFix,VoucherPreFixLen,IsVoucherSaleWithItem,
            [LogoPrint],[AllowMinus],[AutoSOff],[ValidateCCD],[ValidateVou],
            [IsTouchVersion],[ExchangeCounter],[VOUonCashSale],[IsPromotion],[Xno],
            BoldSubTotal,BarCodeLen,DecimalPointsCurrency,DecimalPointsQty,
            IsEdcIntergration,DefaultBankID,DefaultBankTerminal,DefaultCardType,
            LoyaltyCaption,Loyaltypoints,GiftCardLen,GiftCardPreFix,[LFAftePrint],[LFAfteAutoCut],
            [StockOnLIne],[ReceiptInit],[SwpCcd],BankTerminal,[UseCardBank],IsKot,
            KotPrinterPort,KotInvoice,SharedKotInvoice,
            PrintItemsOnSus,PrintItemsOnCnl,PrintOffLine,
            Head1,Head2,Head3,Head4,Head5,Tail1,Tail2,Tail3,Tail4,Tail5,
            Head6,Head7,Head8,Head9,Head10,Tail6,Tail7,Tail8,Tail9,Tail10,
            IsLoadSteward,ServiceCharge,IsLayaway,IsPrintInvoice
        FROM Counters
        WHERE LocationID=@LocationID";

    public Task<SysConfig?> GetOnLoadAsync(int locationId, int unitNo) =>
        db.QueryFirstOrDefaultAsync<SysConfig>(OnLoadSql, new { LocationID = locationId, UnitNo = unitNo });

    public Task<SysConfig?> GetPrintHeaderAsync(int locationId, int unitNo) =>
        db.QueryFirstOrDefaultAsync<SysConfig>(PrintHeaderSql, new { LocationID = locationId, UnitNo = unitNo });

    public Task<SysConfig?> GetPrintFooterAsync(int locationId, int unitNo) =>
        db.QueryFirstOrDefaultAsync<SysConfig>(PrintFooterSql, new { LocationID = locationId, UnitNo = unitNo });

    public Task<SysConfig?> GetCounterConfigAsync(int billingLocationId) =>
        db.QueryFirstOrDefaultAsync<SysConfig>(CounterConfigSql, new { LocationID = billingLocationId });
}
