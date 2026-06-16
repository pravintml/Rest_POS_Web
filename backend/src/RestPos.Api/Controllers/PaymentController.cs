using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestPos.Application.Payment;
using RestPos.Application.Suspend;
using RestPos.Domain.Dtos;
using System.Security.Claims;

namespace RestPos.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentController(PaymentAppService paySvc, SuspendAppService suspendSvc) : ControllerBase
{
    private int LocationId => int.Parse(User.FindFirstValue("locationId")!);
    private int UnitNo => int.Parse(User.FindFirstValue("unitNo")!);
    private long CashierId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CashierName => User.FindFirstValue(ClaimTypes.Name) ?? "";

    // ── GET: pay types ───────────────────────────────────────────────────
    [HttpGet("types")]
    public async Task<IActionResult> GetPayTypes()
    {
        var types = await paySvc.GetPayTypesAsync(LocationId);
        return Ok(types);
    }

    // ── GET: denomination notes ──────────────────────────────────────────
    [HttpGet("notes")]
    public async Task<IActionResult> GetPaymentNotes()
    {
        var notes = await paySvc.GetPaymentNotesAsync();
        return Ok(notes);
    }

    // ── GET: payment summary (total paid, change, lines) ─────────────────
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int locationIDBilling, [FromQuery] int tableID,
        [FromQuery] long ticketID, [FromQuery] string receipt,
        [FromQuery] decimal billTotal)
    {
        var summary = await paySvc.GetPaymentSummaryAsync(
            LocationId, locationIDBilling, tableID, ticketID, receipt, UnitNo, billTotal);
        return Ok(summary);
    }

    // ── POST: add tender ─────────────────────────────────────────────────
    [HttpPost("add")]
    public async Task<IActionResult> AddPayment([FromBody] AddPaymentRequest req)
    {
        var ok = await paySvc.AddPaymentAsync(req with
        {
            LocationID = LocationId, UnitNo = UnitNo,
            CashierID = CashierId, EnCodeName = CashierName
        });
        return ok ? Ok() : BadRequest(new { error = "Failed to add payment" });
    }

    // ── POST: clear payment ──────────────────────────────────────────────
    [HttpPost("clear")]
    public async Task<IActionResult> ClearPayment([FromBody] ClearPaymentRequest req)
    {
        var ok = await paySvc.ClearPaymentAsync(req with { LocationID = LocationId });
        return ok ? Ok() : BadRequest(new { error = "Failed to clear payment" });
    }

    // ── GET: total paid ──────────────────────────────────────────────────
    [HttpGet("total-paid")]
    public async Task<IActionResult> GetTotalPaid(
        [FromQuery] string receipt, [FromQuery] int? payTypeID = null)
    {
        var total = await paySvc.GetPaidTotalAsync(LocationId, receipt, UnitNo, payTypeID);
        return Ok(new { total });
    }

    // ── GET: suspend list ────────────────────────────────────────────────
    [HttpGet("suspend/list")]
    public async Task<IActionResult> GetSuspendList()
    {
        var list = await suspendSvc.GetSuspendListAsync(LocationId, UnitNo);
        return Ok(list);
    }

    // ── POST: suspend invoice ────────────────────────────────────────────
    [HttpPost("suspend")]
    public async Task<IActionResult> SuspendInvoice([FromBody] SuspendRequest req)
    {
        var result = await suspendSvc.SuspendInvoiceAsync(
            req with { LocationID = LocationId, UnitNo = UnitNo, CashierID = CashierId });
        return result.Success
            ? Ok(new { suspendNo = result.SuspendNo })
            : BadRequest(new { error = result.Error });
    }

    // ── POST: recall suspended invoice ───────────────────────────────────
    [HttpPost("recall")]
    public async Task<IActionResult> RecallInvoice([FromBody] RecallRequest req)
    {
        var result = await suspendSvc.RecallAsync(
            req with { LocationID = LocationId, UnitNo = UnitNo, CashierID = CashierId, Cashier = CashierName });
        return result.Success ? Ok() : BadRequest(new { error = result.Error });
    }
}
