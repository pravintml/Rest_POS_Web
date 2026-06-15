namespace RestPos.Domain;

public class SysConfig
{
    public int LocationID { get; set; }
    public string LocationCode { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public long Zno { get; set; }
    public string LogPath { get; set; } = string.Empty;
    public string JnlPath { get; set; } = string.Empty;
    public long Receipt { get; set; }
    public long Suspend { get; set; }
    public long Tog { get; set; }
    public long Dmg { get; set; }
    public long Ret { get; set; }
    public long Van { get; set; }
    public long CrNote { get; set; }
    public long Invoice { get; set; }
    public int UnitNo { get; set; }
    public decimal StDisc1 { get; set; }
    public decimal StDisc2 { get; set; }
    public decimal LoyaltyScale { get; set; }
    public decimal GoldCardScale { get; set; }
    public decimal StpScale { get; set; }
    public string Head1 { get; set; } = string.Empty;
    public string Head2 { get; set; } = string.Empty;
    public string Head3 { get; set; } = string.Empty;
    public string Head4 { get; set; } = string.Empty;
    public string Head5 { get; set; } = string.Empty;
    public string Head6 { get; set; } = string.Empty;
    public string Head7 { get; set; } = string.Empty;
    public string Head8 { get; set; } = string.Empty;
    public string Head9 { get; set; } = string.Empty;
    public string Head10 { get; set; } = string.Empty;
    public string Tail1 { get; set; } = string.Empty;
    public string Tail2 { get; set; } = string.Empty;
    public string Tail3 { get; set; } = string.Empty;
    public string Tail4 { get; set; } = string.Empty;
    public string Tail5 { get; set; } = string.Empty;
    public string Tail6 { get; set; } = string.Empty;
    public string Tail7 { get; set; } = string.Empty;
    public string Tail8 { get; set; } = string.Empty;
    public string Tail9 { get; set; } = string.Empty;
    public string Tail10 { get; set; } = string.Empty;
    public int Lpc { get; set; }
    public int Lpc2 { get; set; }
    public bool DispDate { get; set; }
    public bool DispTime { get; set; }
    public string PPort { get; set; } = string.Empty;
    public string DPort { get; set; } = string.Empty;
    public int BRate { get; set; }
    public bool AutoCut { get; set; }
    public decimal OpMsgValue { get; set; }
    public string OPMsg { get; set; } = string.Empty;
    public string OpMsg2 { get; set; } = string.Empty;
    public string DisplayMsg { get; set; } = string.Empty;
    public int DisplayTime { get; set; }
    public bool Display { get; set; }
    public bool Printer { get; set; }
    public bool CashDrawer { get; set; }
    public decimal RelId { get; set; }
    public string Localhost { get; set; } = string.Empty;
    public string Exchange { get; set; } = string.Empty;
    public string Outlet { get; set; } = string.Empty;
    public string Loyalty { get; set; } = string.Empty;
    public bool NetWork { get; set; }
    public int Sleep { get; set; }
    public int InitSpace { get; set; }
    public bool ZnoOnRpt { get; set; }
    public bool ZOnJnl { get; set; }
    public int LFAftePrint { get; set; }
    public int LFAfteAutoCut { get; set; }
    public bool MultipleExch { get; set; }
    public bool KeyBoard { get; set; }
    public bool BcodeOnAdv { get; set; }
    public bool BcodeOnSus { get; set; }
    public bool PrintItemsOnSus { get; set; }
    public bool PrintItemsOnCnl { get; set; }
    public bool PrintOffLine { get; set; }
    public bool StockOnLine { get; set; }
    public bool ReceiptInit { get; set; }
    public bool SwpCcd { get; set; }
    public bool BankTerminal { get; set; }
    public bool UseCardBank { get; set; }
    public decimal RAcc { get; set; }
    public int LoyaltyLen { get; set; }
    public string LoyaltyPreFix { get; set; } = string.Empty;
    public int VoucherLen { get; set; }
    public string VoucherPreFix { get; set; } = string.Empty;
    public int VoucherPreFixLen { get; set; }
    public bool IsVoucherSaleWithItem { get; set; }
    public bool LogoPrint { get; set; }
    public bool ExisSys { get; set; }
    public bool AllowMinus { get; set; }
    public bool AutoBackup { get; set; }
    public int BackupTime { get; set; }
    public string QtyFmt { get; set; } = string.Empty;
    public bool AutoSOff { get; set; }
    public int BackGround { get; set; }
    public bool ValidateCCD { get; set; }
    public bool ValidateVou { get; set; }
    public bool DispDiscount { get; set; }
    public bool PrintLPT { get; set; }
    public string RepPath { get; set; } = string.Empty;
    public bool IsTouchVersion { get; set; }
    public DateTime Rdate { get; set; }
    public bool ExchangeCounter { get; set; }
    public bool LogStatus { get; set; }
    public bool CRCashDrawer { get; set; }
    public bool USBDisplay { get; set; }
    public bool IsKot { get; set; }
    public string KotPrinterPort { get; set; } = string.Empty;
    public decimal KotInvoice { get; set; }
    public string KHead1 { get; set; } = string.Empty;
    public string KHead2 { get; set; } = string.Empty;
    public string KHead3 { get; set; } = string.Empty;
    public string KHead4 { get; set; } = string.Empty;
    public string KHead5 { get; set; } = string.Empty;
    public decimal ExLoyalAmount { get; set; }
    public decimal ExLoyalPoints { get; set; }
    public decimal ExMinLoyalAmount { get; set; }
    public bool SelectPrinter { get; set; }
    public decimal BronzeScale { get; set; }
    public bool SuspendPrint { get; set; }
    public bool SharedKotInvoice { get; set; }
    public bool SelectLoyaltyType { get; set; }
    public bool VOUonCashSale { get; set; }
    public bool SmallChar { get; set; }
    public bool Tax { get; set; }
    public bool IsPromotion { get; set; }
    public long Xno { get; set; }
    public string VidPath { get; set; } = string.Empty;
    public decimal Type { get; set; }
    public string DateFormat { get; set; } = string.Empty;
    public int KeyboardLayer { get; set; }
    public int CashierPwdMaxLen { get; set; }
    public bool BoldSubTotal { get; set; }
    public int BarCodeLen { get; set; }
    public int DecimalPointsCurrency { get; set; }
    public int DecimalPointsQty { get; set; }
    public bool IsEdcIntergration { get; set; }
    public int DefaultBankID { get; set; }
    public int DefaultBankTerminal { get; set; }
    public int DefaultCardType { get; set; }
    public string LoyaltyCaption { get; set; } = string.Empty;
    public decimal Loyaltypoints { get; set; }
    public int GiftCardLen { get; set; }
    public string GiftCardPreFix { get; set; } = string.Empty;
    public bool IsLoadSteward { get; set; }
    public decimal ServiceCharge { get; set; }
    public int PrintLength { get; set; }
    public bool IsLayaway { get; set; }
    public bool IsAutoLayaway { get; set; }
    public bool PrintPrice { get; set; }
    public bool IsPrintInvoice { get; set; }
    public bool IsLargeFontInKOTBOT { get; set; }
    public bool IsCrystalReport { get; set; }
    public bool IsPrePrintInvoice { get; set; }
    public bool IsAllowTransactionAfterCustCopy { get; set; }
    public bool IsAllowDayEndWithPendingInvoice { get; set; }
    public bool IsShowDayBookonShiftEnd { get; set; }
    public bool IsPrintCounterSaleOnReading { get; set; }
    public bool IsRePrintDiscountedInvoice { get; set; }
}
