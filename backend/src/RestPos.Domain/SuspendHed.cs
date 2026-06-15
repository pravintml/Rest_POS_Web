namespace RestPos.Domain;

public class SuspendHed
{
    public string SuspendNo { get; set; } = string.Empty;
    public int LocationID { get; set; }
    public int UnitNo { get; set; }
    public bool IsRecall { get; set; }
    public int RecallUnitNo { get; set; }
    public string RecallCashier { get; set; } = string.Empty;
    public string RecallReceipt { get; set; } = string.Empty;
    public int TransStatus { get; set; }
}
