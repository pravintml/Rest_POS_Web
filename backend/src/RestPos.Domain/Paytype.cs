namespace RestPos.Domain;

public class Paytype
{
    public int PaymentID { get; set; }
    public string Descrip { get; set; } = string.Empty;
    public bool IsSwipe { get; set; }
    public int Type { get; set; }
    public decimal Rate { get; set; }
    public bool IsRefundable { get; set; }
    public bool IsActive { get; set; }
    public bool IsBillCopy { get; set; }
    public string PreFix { get; set; } = string.Empty;
    public int MaxLength { get; set; }
}
