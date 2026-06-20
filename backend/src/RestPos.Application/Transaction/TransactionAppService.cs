using RestPos.Data.Repositories;
using RestPos.Domain.Dtos;

namespace RestPos.Application.Transaction;

/// <summary>
/// Application service — orchestrates repository calls for the POS transaction flow.
/// Mirrors the logic from legacy SVPOS.Service.TransactionService, ported verbatim
/// but without WinForms static state; context is passed explicitly per call.
/// </summary>
public class TransactionAppService(ITransactionRepository txRepo)
{
    public Task<bool> AddItemAsync(AddItemRequest req) =>
        txRepo.AddItemAsync(req);

    public Task<bool> DiscountUpdateAsync(DiscountRequest req) =>
        txRepo.DiscountUpdateAsync(req);

    public Task<bool> VoidItemAsync(VoidItemRequest req) =>
        txRepo.VoidItemAsync(req);

    public Task<bool> ErrorCorrectAsync(ErrorCorrectRequest req) =>
        txRepo.ErrorCorrectAsync(req);

    public Task<bool> VoidBillAsync(VoidBillRequest req) =>
        txRepo.ClearItemsAsync(req);

    public Task<bool> ChangePriceAsync(ChangePriceRequest req) =>
        txRepo.ChangePriceAsync(req);

    public Task<bool> DecreaseQtyAsync(DecreaseQtyRequest req) =>
        txRepo.DecreaseQtyAsync(req);

    public Task<bool> SplitQtyAsync(SplitQtyRequest req) =>
        txRepo.SplitQtyAsync(req);

    public Task<bool> DiscountRemoveAsync(DiscountRemoveRequest req) =>
        txRepo.DiscountRemoveAsync(req);

    public async Task<SaveInvoiceResult> SaveInvoiceAsync(SaveInvoiceRequest req)
    {
        var receiptNo = await txRepo.SaveInvoiceAsync(req);
        return string.IsNullOrEmpty(receiptNo)
            ? new SaveInvoiceResult(false, string.Empty, "spSaveInvoice returned no receipt number")
            : new SaveInvoiceResult(true, receiptNo);
    }

    public async Task<SaveInvoiceResult> CancelInvoiceAsync(CancelInvoiceRequest req)
    {
        var receiptNo = await txRepo.CancelInvoiceAsync(req);
        return string.IsNullOrEmpty(receiptNo)
            ? new SaveInvoiceResult(false, string.Empty, "spCancelInvoice returned no receipt number")
            : new SaveInvoiceResult(true, receiptNo);
    }

    public Task<bool> SendKotAsync(SendKotRequest req) =>
        txRepo.SendKotAsync(req);

    public Task<bool> LayawayAsync(LayawayRequest req) =>
        txRepo.LayawayAsync(req);

    public Task<CustomerCopyResult> CustomerCopyAsync(CustomerCopyRequest req) =>
        txRepo.CustomerCopyAsync(req);

    public Task<bool> ServiceChargeUpdateAsync(ServiceChargeRequest req) =>
        txRepo.ServiceChargeUpdateAsync(req);

    public Task<bool> ServiceChargeRemoveAsync(int locationID, int locationIDBilling, int tableID, long ticketID, long cashierID, string cashier) =>
        txRepo.ServiceChargeRemoveAsync(locationID, locationIDBilling, tableID, ticketID, cashierID, cashier);

    public Task<bool> SaveTransactionAsync(int locationID, string receipt, int unitNo, long cashierID, int transStatus, string docNo) =>
        txRepo.SaveTransactionAsync(locationID, receipt, unitNo, cashierID, transStatus, docNo);

    public Task<BillSummaryDto> GetBillSummaryAsync(int locationID, int locationIDBilling, int tableID, long ticketID, int unitNo, string receipt, int documentID, int decimalPoints) =>
        txRepo.GetBillSummaryAsync(locationID, locationIDBilling, tableID, ticketID, unitNo, receipt, documentID, decimalPoints);

    public Task<decimal> GetBillTotalAsync(int locationID, string receipt, int unitNo, int decimalPoints) =>
        txRepo.GetBillTotalAsync(locationID, receipt, unitNo, decimalPoints);

    public Task<string> GetItemCommentAsync(int locationID, int locationIDBilling, int tableID, long ticketID, long rowNo, long productID) =>
        txRepo.GetItemCommentAsync(locationID, locationIDBilling, tableID, ticketID, rowNo, productID);

    public Task<bool> UpdateItemCommentAsync(ItemCommentRequest req) =>
        txRepo.UpdateItemCommentAsync(req);

    public Task<bool> UpdateTagNoAsync(TagRequest req) =>
        txRepo.UpdateTagNoAsync(req);

    public Task<bool> UpdatePacksAsync(PacksRequest req) =>
        txRepo.UpdatePacksAsync(req);

    public Task<bool> UpdateMobileNoAsync(MobileNoRequest req) =>
        txRepo.UpdateMobileNoAsync(req);

    public Task<bool> MoveItemsAsync(MoveItemsRequest req) =>
        txRepo.MoveItemsAsync(req);

    public Task<bool> MergeTableAsync(MergeTableRequest req) =>
        txRepo.MergeTableAsync(req);

    public Task<bool> ChangeTableAsync(ChangeTableRequest req) =>
        txRepo.ChangeTableAsync(req);

    public Task<bool> IsCustomerCopyPrintedAsync(
        int locationId, int unitNo, int locationIDBilling, int tableId, long ticketId) =>
        txRepo.IsCustomerCopyPrintedAsync(locationId, unitNo, locationIDBilling, tableId, ticketId);

    public Task<bool> ShiftEndAsync(ShiftEndRequest req) =>
        txRepo.ShiftEndAsync(req);

    public Task<IEnumerable<InvoiceSummaryDto>> GetInvoiceListAsync(int locationID, int locationIDBilling, int unitNo) =>
        txRepo.GetInvoiceListAsync(locationID, locationIDBilling, unitNo);

    public Task<SavedInvoiceDto> GetSavedInvoiceDetailAsync(int locationID, int locationIDBilling, int unitNo, string receipt) =>
        txRepo.GetSavedInvoiceDetailAsync(locationID, locationIDBilling, unitNo, receipt);
}
