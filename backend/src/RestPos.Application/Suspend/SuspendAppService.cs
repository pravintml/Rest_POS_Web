using RestPos.Data.Repositories;
using RestPos.Domain;
using RestPos.Domain.Dtos;

namespace RestPos.Application.Suspend;

public class SuspendAppService(ISuspendRepository suspendRepo)
{
    public async Task<SuspendResult> SuspendInvoiceAsync(SuspendRequest req)
    {
        var suspendNo = await suspendRepo.SuspendInvoiceAsync(req);
        return string.IsNullOrEmpty(suspendNo)
            ? new SuspendResult(false, string.Empty, "spSuspendInvoice returned no suspend number")
            : new SuspendResult(true, suspendNo);
    }

    public async Task<RecallResult> RecallAsync(RecallRequest req)
    {
        // Validate: check suspend header exists and has not been recalled
        var hed = await suspendRepo.GetSuspendHedAsync(req.LocationID, req.RecallNo, req.RecallUnitNo);
        if (hed == null)
            return new RecallResult(false, "Suspended invoice not found");
        if (hed.IsRecall)
            return new RecallResult(false, "This invoice has already been recalled");

        var ok = await suspendRepo.RecallSuspendedInvoiceAsync(req);
        return ok ? new RecallResult(true) : new RecallResult(false, "Failed to recall suspended invoice");
    }

    public Task<IEnumerable<SuspendListItem>> GetSuspendListAsync(int locationID, int unitNo) =>
        suspendRepo.GetSuspendListAsync(locationID, unitNo);

    public Task<bool> IsExistsSuspendAsync(int locationID, int unitNo) =>
        suspendRepo.IsExistsSuspendAsync(locationID, unitNo);
}
