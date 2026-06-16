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

    public Task<TableReportDto> GetSuspendReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetSuspendReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetPendingSuspendAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetPendingSuspendAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetSuspendRecallAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetSuspendRecallAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetBillCancellationAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetBillCancellationAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetDiscountReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetDiscountReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetLoyaltyReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetLoyaltyReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetCreditCardReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetCreditCardReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetNonCashReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetNonCashReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetStaffPurchaseAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetStaffPurchaseAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetGiftVoucherAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetGiftVoucherAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetGiftCardAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetGiftCardAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetPaidoutReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetPaidoutReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetPaidInReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetPaidInReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetSalesmanReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetSalesmanReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetNonSalesReportAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetNonSalesReportAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetPendingItemWiseAsync(int locationID, int locationIDBilling, int unitNo) =>
        reportRepo.GetPendingItemWiseAsync(locationID, locationIDBilling, unitNo);

    public Task<TableReportDto> GetSalesIncludingPendingAsync(int locationID, int locationIDBilling, int unitNo, int shiftNo) =>
        reportRepo.GetSalesIncludingPendingAsync(locationID, locationIDBilling, unitNo, shiftNo);

    public Task<TableReportDto> GetDayBookReportAsync(int locationID, int unitNo) =>
        reportRepo.GetDayBookReportAsync(locationID, unitNo);

    public Task<SalesReadingDto> GetZReadingAsync(SalesReadingRequest req) =>
        reportRepo.GetZReadingAsync(req);
}
