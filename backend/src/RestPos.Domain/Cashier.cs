namespace RestPos.Domain;

public class Cashier
{
    public long CashierID { get; set; }
    public string Code { get; set; } = string.Empty;
    public int LocationID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LogName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Encode { get; set; } = string.Empty;
    public int Type { get; set; }
}
