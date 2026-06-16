namespace RestPos.Domain.Dtos;

// ── Request ──────────────────────────────────────────────────────────────────

public record SalesReadingRequest(
    int LocationID,
    int LocationIDBilling,
    int UnitNo,
    long CashierID,
    int ShiftNo,
    int ReportType   // 1=Cashier Reading, 2=X Reading (all cashiers)
);

// ── Responses ────────────────────────────────────────────────────────────────

public record MenuItemDto(int MenuID, string MenuName, int LNo);

public record PaymentLineItem(string PayType, decimal Amount, long Count);

public record SalesReadingDto(
    decimal GrossSale,
    decimal Refunds,
    long NRefunds,
    decimal ItemDiscount,
    decimal SubtotalDiscount,
    decimal ServiceCharge,
    decimal Voids,
    long NVoids,
    decimal Cancel,
    long NCancel,
    decimal NetSales,
    long NoOfBills,
    IEnumerable<PaymentLineItem> Payments,
    string GeneratedAt
);

public record BillWiseRow(string Receipt, string Cashier, decimal Amount, string PayType);

public record ItemWiseRow(string Category, string ItemName, decimal Qty, decimal Amount);

public record ReportSection(string Title, string[] Headers, List<string[]> Rows, string[]? Footer = null);
public record TableReportDto(string ReportTitle, ReportSection[] Sections, string GeneratedAt);
