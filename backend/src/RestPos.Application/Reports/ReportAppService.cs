using RestPos.Data.Repositories;
using RestPos.Domain.Dtos;

namespace RestPos.Application.Reports;

public class ReportAppService(IReportRepository reportRepo)
{
    public Task<IEnumerable<MenuItemDto>> GetMenuItemsAsync(long cashierID) =>
        reportRepo.GetMenuItemsAsync(cashierID);

    public Task<SalesReadingDto> GetSalesReadingAsync(SalesReadingRequest req) =>
        reportRepo.GetSalesReadingAsync(req);

    public Task<IEnumerable<BillWiseRow>> GetBillWiseAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo, long cashierID) =>
        reportRepo.GetBillWiseAsync(locationID, locationIDBilling, unitNo, shiftNo, cashierID);

    public Task<IEnumerable<ItemWiseRow>> GetItemWiseAsync(
        int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetItemWiseAsync(locationID, locationIDBilling, unitNo, shiftNo);
}
