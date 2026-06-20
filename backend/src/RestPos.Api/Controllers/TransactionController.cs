using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestPos.Application.Transaction;
using RestPos.Domain.Dtos;
using System.Security.Claims;

namespace RestPos.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionController(TransactionAppService txSvc) : ControllerBase
{
    private int LocationId => int.Parse(User.FindFirstValue("locationId")!);
    private int UnitNo => int.Parse(User.FindFirstValue("unitNo")!);
    private long CashierId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CashierName => User.FindFirstValue(ClaimTypes.Name) ?? "";

    // ── GET: bill items (load current order) ────────────────────────────
    [HttpGet("bill")]
    public async Task<IActionResult> GetBill(
        [FromQuery] int locationIDBilling, [FromQuery] int tableID,
        [FromQuery] long ticketID, [FromQuery] string receipt,
        [FromQuery] int documentID = 1, [FromQuery] int decimalPoints = 2)
    {
        var summary = await txSvc.GetBillSummaryAsync(
            LocationId, locationIDBilling, tableID, ticketID,
            UnitNo, receipt, documentID, decimalPoints);
        return Ok(summary);
    }

    // ── GET: bill total ─────────────────────────────────────────────────
    [HttpGet("bill-total")]
    public async Task<IActionResult> GetBillTotal(
        [FromQuery] string receipt, [FromQuery] int decimalPoints = 2)
    {
        var total = await txSvc.GetBillTotalAsync(LocationId, receipt, UnitNo, decimalPoints);
        return Ok(new { total });
    }

    // ── POST: add item ───────────────────────────────────────────────────
    [HttpPost("add-item")]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequest req)
    {
        var ok = await txSvc.AddItemAsync(req with { CashierID = CashierId, Cashier = CashierName, UnitNo = UnitNo, LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to add item" });
    }

    // ── POST: discount (item-level or subtotal) ──────────────────────────
    [HttpPost("discount")]
    public async Task<IActionResult> Discount([FromBody] DiscountRequest req)
    {
        var ok = await txSvc.DiscountUpdateAsync(req with { CashierID = CashierId, Cashier = CashierName, UnitNo = UnitNo, LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to apply discount" });
    }

    // ── POST: void item (after KOT, writes spItemVoid) ───────────────────
    [HttpPost("void-item")]
    public async Task<IActionResult> VoidItem([FromBody] VoidItemRequest req)
    {
        var ok = await txSvc.VoidItemAsync(req with { CashierID = CashierId, Cashier = CashierName, UnitNo = UnitNo, LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to void item" });
    }

    // ── POST: error-correct (before KOT) ────────────────────────────────
    [HttpPost("error-correct")]
    public async Task<IActionResult> ErrorCorrect([FromBody] ErrorCorrectRequest req)
    {
        var ok = await txSvc.ErrorCorrectAsync(req with { CashierID = CashierId, Cashier = CashierName, UnitNo = UnitNo, LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to error-correct item" });
    }

    // ── POST: void entire bill ───────────────────────────────────────────
    [HttpPost("void-bill")]
    public async Task<IActionResult> VoidBill([FromBody] VoidBillRequest req)
    {
        var ok = await txSvc.VoidBillAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to void bill" });
    }

    // ── POST: change price ───────────────────────────────────────────────
    [HttpPost("change-price")]
    public async Task<IActionResult> ChangePrice([FromBody] ChangePriceRequest req)
    {
        var ok = await txSvc.ChangePriceAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to change price" });
    }

    // ── POST: decrease qty ───────────────────────────────────────────────
    [HttpPost("decrease-qty")]
    public async Task<IActionResult> DecreaseQty([FromBody] DecreaseQtyRequest req)
    {
        var ok = await txSvc.DecreaseQtyAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to decrease qty" });
    }

    // ── POST: split qty ──────────────────────────────────────────────────
    [HttpPost("split-qty")]
    public async Task<IActionResult> SplitQty([FromBody] SplitQtyRequest req)
    {
        var ok = await txSvc.SplitQtyAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to split qty" });
    }

    // ── POST: remove discount ────────────────────────────────────────────
    [HttpPost("remove-discount")]
    public async Task<IActionResult> RemoveDiscount([FromBody] DiscountRemoveRequest req)
    {
        var ok = await txSvc.DiscountRemoveAsync(req with { LocationID = LocationId });
        if (!ok) return BadRequest(new { error = "Failed to remove discount" });
        // Mirror legacy RunDiscountRemove: always call ServiceChargeUpdate after removal
        await txSvc.ServiceChargeUpdateAsync(new ServiceChargeRequest(
            LocationId, req.Receipt, CashierId, CashierName, UnitNo,
            req.LocationIDBilling, req.TableID, req.TicketID,
            req.StewardID, req.StewardName, req.ServiceCharge, req.DecimalPointsCurrency));
        return Ok();
    }

    // ── POST: save invoice (completes sale) ──────────────────────────────
    [HttpPost("save-invoice")]
    public async Task<IActionResult> SaveInvoice([FromBody] SaveInvoiceRequest req)
    {
        var result = await txSvc.SaveInvoiceAsync(req with { CashierID = CashierId, UnitNo = UnitNo, LocationID = LocationId });
        return result.Success
            ? Ok(new { receiptNo = result.ReceiptNo })
            : BadRequest(new { error = result.Error });
    }

    // ── POST: cancel invoice ─────────────────────────────────────────────
    [HttpPost("cancel-invoice")]
    public async Task<IActionResult> CancelInvoice([FromBody] CancelInvoiceRequest req)
    {
        var result = await txSvc.CancelInvoiceAsync(req with { CashierID = CashierId, UnitNo = UnitNo, LocationID = LocationId });
        return result.Success
            ? Ok(new { receiptNo = result.ReceiptNo })
            : BadRequest(new { error = result.Error });
    }

    // ── POST: send KOT ───────────────────────────────────────────────────
    [HttpPost("send-kot")]
    public async Task<IActionResult> SendKot([FromBody] SendKotRequest req)
    {
        var ok = await txSvc.SendKotAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to send KOT" });
    }

    // ── POST: layaway (mark all unprinted items ready for remote printing, then go home) ───
    [HttpPost("layaway")]
    public async Task<IActionResult> Layaway([FromBody] LayawayRequest req)
    {
        var hasData = await txSvc.LayawayAsync(req with { LocationID = LocationId });
        if (!hasData) return BadRequest(new { error = "NO DATA TO LAYAWAY" });
        return Ok();
    }

    // ── POST: customer copy (check pending layaway, then mark IsCustomerCopy=1) ───────────
    [HttpPost("customer-copy")]
    public async Task<IActionResult> CustomerCopy([FromBody] CustomerCopyRequest req)
    {
        var result = await txSvc.CustomerCopyAsync(req with { LocationID = LocationId });
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Ok();
    }

    // ── POST: service charge ─────────────────────────────────────────────
    [HttpPost("service-charge")]
    public async Task<IActionResult> ServiceCharge([FromBody] ServiceChargeRequest req)
    {
        var ok = await txSvc.ServiceChargeUpdateAsync(req with { LocationID = LocationId, CashierID = CashierId, Cashier = CashierName, UnitNo = UnitNo });
        return ok ? Ok() : BadRequest(new { error = "Failed to update service charge" });
    }

    // ── DELETE: service charge ───────────────────────────────────────────
    [HttpDelete("service-charge")]
    public async Task<IActionResult> RemoveServiceCharge(
        [FromQuery] int locationIDBilling, [FromQuery] int tableID, [FromQuery] long ticketID)
    {
        var ok = await txSvc.ServiceChargeRemoveAsync(LocationId, locationIDBilling, tableID, ticketID, CashierId, CashierName);
        return ok ? Ok() : BadRequest(new { error = "Failed to remove service charge" });
    }

    // ── POST: save transaction status ────────────────────────────────────
    [HttpPost("save-status")]
    public async Task<IActionResult> SaveStatus([FromBody] SaveStatusRequest req)
    {
        var ok = await txSvc.SaveTransactionAsync(LocationId, req.Receipt, UnitNo, CashierId, req.TransStatus, req.DocNo);
        return ok ? Ok() : BadRequest(new { error = "Failed to save status" });
    }

    // ── GET: item comment ────────────────────────────────────────────────
    [HttpGet("item-comment")]
    public async Task<IActionResult> GetItemComment(
        [FromQuery] int locationIDBilling, [FromQuery] int tableID,
        [FromQuery] long ticketID, [FromQuery] long rowNo, [FromQuery] long productID)
    {
        var comment = await txSvc.GetItemCommentAsync(LocationId, locationIDBilling, tableID, ticketID, rowNo, productID);
        return Ok(new { comment });
    }

    // ── PUT: item comment ────────────────────────────────────────────────
    [HttpPut("item-comment")]
    public async Task<IActionResult> UpdateItemComment([FromBody] ItemCommentRequest req)
    {
        var ok = await txSvc.UpdateItemCommentAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to update comment" });
    }

    // ── POST: tag no ─────────────────────────────────────────────────────
    [HttpPost("tag")]
    public async Task<IActionResult> UpdateTag([FromBody] TagRequest req)
    {
        var ok = await txSvc.UpdateTagNoAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to update tag" });
    }

    // ── POST: packs ──────────────────────────────────────────────────────
    [HttpPost("packs")]
    public async Task<IActionResult> UpdatePacks([FromBody] PacksRequest req)
    {
        var ok = await txSvc.UpdatePacksAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to update packs" });
    }

    // ── POST: mobile no ──────────────────────────────────────────────────
    [HttpPost("mobile-no")]
    public async Task<IActionResult> UpdateMobileNo([FromBody] MobileNoRequest req)
    {
        var ok = await txSvc.UpdateMobileNoAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to update mobile no" });
    }

    // ── POST: move items to new ticket ───────────────────────────────────
    [HttpPost("move-items")]
    public async Task<IActionResult> MoveItems([FromBody] MoveItemsRequest req)
    {
        var ok = await txSvc.MoveItemsAsync(req with { LocationID = LocationId, CashierID = CashierId });
        return ok ? Ok() : BadRequest(new { error = "Failed to move item" });
    }

    // ── POST: merge table into current ticket ────────────────────────────
    [HttpPost("merge-table")]
    public async Task<IActionResult> MergeTable([FromBody] MergeTableRequest req)
    {
        var ok = await txSvc.MergeTableAsync(req with { LocationID = LocationId, CashierID = CashierId });
        return ok ? Ok() : BadRequest(new { error = "Failed to merge table" });
    }

    // ── POST: change table (move entire bill to another table) ───────────
    [HttpPost("change-table")]
    public async Task<IActionResult> ChangeTable([FromBody] ChangeTableRequest req)
    {
        var ok = await txSvc.ChangeTableAsync(req with { LocationID = LocationId, CashierID = CashierId });
        return ok ? Ok() : BadRequest(new { error = "Failed to change table" });
    }

    // ── GET: check if customer copy has been printed for current bill ────
    [HttpGet("customer-copy-printed")]
    public async Task<IActionResult> IsCustomerCopyPrinted(
        [FromQuery] int locationIDBilling, [FromQuery] int tableID, [FromQuery] long ticketID)
    {
        var printed = await txSvc.IsCustomerCopyPrintedAsync(LocationId, UnitNo, locationIDBilling, tableID, ticketID);
        return Ok(new { printed });
    }

    // ── POST: shift end ──────────────────────────────────────────────────
    [HttpPost("shift-end")]
    public async Task<IActionResult> ShiftEnd([FromBody] ShiftEndRequest req)
    {
        var ok = await txSvc.ShiftEndAsync(req with { LocationID = LocationId, CashierID = CashierId, UnitNo = UnitNo });
        return ok ? Ok() : BadRequest(new { error = "Failed to end shift" });
    }

    // ── GET: list invoices for current shift (reprint picker) ───────────────
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoiceList([FromQuery] int locationIDBilling)
    {
        var list = await txSvc.GetInvoiceListAsync(LocationId, locationIDBilling, UnitNo);
        return Ok(list);
    }

    // ── GET: saved invoice detail by receipt no (for reprinting) ────────────
    [HttpGet("invoice-detail")]
    public async Task<IActionResult> GetSavedInvoiceDetail(
        [FromQuery] int locationIDBilling, [FromQuery] string receipt)
    {
        var detail = await txSvc.GetSavedInvoiceDetailAsync(LocationId, locationIDBilling, UnitNo, receipt);
        return Ok(detail);
    }

    public record SaveStatusRequest(string Receipt, int TransStatus, string DocNo = "");
}
