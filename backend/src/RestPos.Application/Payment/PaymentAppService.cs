using RestPos.Data.Repositories;
using RestPos.Domain.Dtos;

namespace RestPos.Application.Payment;

/// <summary>
/// Application service for the payment / tender flow.
/// Mirrors SVPOS.Service.PaymentService, sans WinForms state.
/// </summary>
public class PaymentAppService(IPaymentRepository payRepo)
{
    public Task<bool> AddPaymentAsync(AddPaymentRequest req) =>
        payRepo.AddPaymentAsync(req);

    public Task<bool> ClearPaymentAsync(ClearPaymentRequest req) =>
        payRepo.ClearPaymentAsync(req);

    public async Task<PaymentSummaryDto> GetPaymentSummaryAsync(
        int locationID, int locationIDBilling, int tableID, long ticketID,
        string receipt, int unitNo, decimal billTotal)
    {
        var lines = await payRepo.GetPaymentLinesAsync(locationID, locationIDBilling, tableID, ticketID);
        var totalPaid = await payRepo.GetPaidTotalAsync(locationID, receipt, unitNo);
        var change = Math.Max(0, totalPaid - billTotal);
        return new PaymentSummaryDto(totalPaid, billTotal, change, lines);
    }

    public Task<decimal> GetPaidTotalAsync(int locationID, string receipt, int unitNo, int? payTypeID = null) =>
        payRepo.GetPaidTotalAsync(locationID, receipt, unitNo, payTypeID);

    public Task<IEnumerable<PayTypeDto>> GetPayTypesAsync(int locationID) =>
        payRepo.GetPayTypesAsync(locationID);

    public Task<IEnumerable<PaymentNoteDto>> GetPaymentNotesAsync() =>
        payRepo.GetPaymentNotesAsync();
}
