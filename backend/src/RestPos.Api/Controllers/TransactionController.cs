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
        return ok ? Ok() : BadRequest(new { error = "Failed to remove discount" });
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
        var ok = await txSvc.ServiceChargeRemoveAsync(LocationId, locationIDBilling, tableID, ticketID);
        return ok ? Ok() : BadRequest(new { error = "Failed to remove service charge" });
    }

    // ── POST: save transaction status ────────────────────────────────────
    [HttpPost("save-status")]
    public async Task<IActionResult> SaveStatus([FromBody] SaveStatusRequest req)
    {
        var ok = await txSvc.SaveTransactionAsync(LocationId, req.Receipt, UnitNo, CashierId, req.TransStatus, req.DocNo);
        return ok ? Ok() : BadRequest(new { error = "Failed to save status" });
    }

    public record SaveStatusRequest(string Receipt, int TransStatus, string DocNo = "");
}
