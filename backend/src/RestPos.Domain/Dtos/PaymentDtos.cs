namespace RestPos.Domain.Dtos;

public record AddPaymentRequest(
    int LocationID,
    string Receipt,
    int UnitNo,
    int BillTypeID,
    int SaleTypeID,
    long CashierID,
    int PayTypeID,
    decimal Amount,
    decimal Balance,          // remaining balance after this tender
    string RefNo,
    long BankID,
    int TerminalID,
    DateTime? ChequeDate,
    bool IsRecallAdv,
    string RecallNo,
    string Descrip,           // payment type name
    string EnCodeName,
    int LocationIDBilling,
    int TableID,
    long TicketID
);

public record PaymentSummaryDto(
    decimal TotalPaid,
    decimal BillTotal,
    decimal Change,
    IEnumerable<PaymentLineDto> Lines
);

public record PaymentLineDto(
    int PayTypeID,
    string Descrip,
    decimal Amount,
    string RefNo,
    long RowNo
);

public record PayTypeDto(
    int PayTypeID,
    string PayTypeName,
    bool IsActive,
    int Type,       // 0=Cash, 1=Card(needs RefNo), 6=Other
    bool IsSwipe    // card must be swiped (not manually entered)
);

public record PaymentNoteDto(int Note);

public record ClearPaymentRequest(
    int LocationID,
    int LocationIDBilling,
    int TableID,
    long TicketID
);

public record PaidInOutRequest(
    int LocationID,
    long ProductID,
    string ProductCode,
    string Descrip,
    decimal Amount,
    int DocumentID,    // 9=PaidIn, 10=PaidOut
    string Receipt,
    long CashierID,
    string Cashier,
    int UnitNo,
    int BillTypeID,
    int SaleTypeID,
    int TransStatus,
    int LocationIDBilling,
    int TableID,
    long TicketID,
    int PaidOutTypeID
);
