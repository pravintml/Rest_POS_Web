using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestPos.Application.Reports;
using RestPos.Domain.Dtos;
using System.Security.Claims;

namespace RestPos.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportController(ReportAppService reportSvc) : ControllerBase
{
    private int LocationId  => int.Parse(User.FindFirstValue("locationId")!);
    private int UnitNo      => int.Parse(User.FindFirstValue("unitNo")!);
    private long CashierId  => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── GET: list of available reports for this cashier ──────────────────
    [HttpGet("menu-items")]
    public async Task<IActionResult> GetMenuItems()
    {
        var items = await reportSvc.GetMenuItemsAsync(CashierId);
        return Ok(items);
    }

    // ── GET: cashier reading (reportType=1) or X reading (reportType=2) ──
    [HttpGet("sales-reading")]
    public async Task<IActionResult> GetSalesReading(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0,
        [FromQuery] int reportType = 1)
    {
        var result = await reportSvc.GetSalesReadingAsync(new SalesReadingRequest(
            LocationID: LocationId,
            LocationIDBilling: locationIDBilling,
            UnitNo: UnitNo,
            CashierID: CashierId,
            ShiftNo: shiftNo,
            ReportType: reportType
        ));
        return Ok(result);
    }

    // ── GET: bill-wise list ───────────────────────────────────────────────
    [HttpGet("bill-wise")]
    public async Task<IActionResult> GetBillWise(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0,
        [FromQuery] long cashierID = 0)
    {
        var rows = await reportSvc.GetBillWiseAsync(
            LocationId, locationIDBilling, UnitNo, shiftNo,
            cashierID == 0 ? CashierId : cashierID);
        return Ok(rows);
    }

    // ── GET: item-wise sales ──────────────────────────────────────────────
    [HttpGet("item-wise")]
    public async Task<IActionResult> GetItemWise(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var rows = await reportSvc.GetItemWiseAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(rows);
    }

    // ── GET: all suspended bills ──────────────────────────────────────────
    [HttpGet("suspend")]
    public async Task<IActionResult> GetSuspendReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetSuspendReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: pending (not-recalled) suspended bills ───────────────────────
    [HttpGet("pending-suspend")]
    public async Task<IActionResult> GetPendingSuspend(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetPendingSuspendAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: recalled suspended bills ────────────────────────────────────
    [HttpGet("suspend-recall")]
    public async Task<IActionResult> GetSuspendRecall(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetSuspendRecallAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: bill cancellations ───────────────────────────────────────────
    [HttpGet("cancellation")]
    public async Task<IActionResult> GetBillCancellation(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetBillCancellationAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: discount report (item + subtotal) ────────────────────────────
    [HttpGet("discount")]
    public async Task<IActionResult> GetDiscountReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetDiscountReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: loyalty points ───────────────────────────────────────────────
    [HttpGet("loyalty")]
    public async Task<IActionResult> GetLoyaltyReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetLoyaltyReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: credit card report (summary + detail) ────────────────────────
    [HttpGet("credit-card")]
    public async Task<IActionResult> GetCreditCardReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetCreditCardReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: non-cash payments ────────────────────────────────────────────
    [HttpGet("non-cash")]
    public async Task<IActionResult> GetNonCashReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetNonCashReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: staff purchases ──────────────────────────────────────────────
    [HttpGet("staff-purchase")]
    public async Task<IActionResult> GetStaffPurchase(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetStaffPurchaseAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: gift vouchers (sold + redeemed) ──────────────────────────────
    [HttpGet("gift-voucher")]
    public async Task<IActionResult> GetGiftVoucher(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetGiftVoucherAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: gift cards (sold + redeemed) ─────────────────────────────────
    [HttpGet("gift-card")]
    public async Task<IActionResult> GetGiftCard(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetGiftCardAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: paid out ─────────────────────────────────────────────────────
    [HttpGet("paidout")]
    public async Task<IActionResult> GetPaidoutReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetPaidoutReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: paid in ──────────────────────────────────────────────────────
    [HttpGet("paid-in")]
    public async Task<IActionResult> GetPaidInReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetPaidInReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: salesman summary ─────────────────────────────────────────────
    [HttpGet("salesman")]
    public async Task<IActionResult> GetSalesmanReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetSalesmanReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: non-sales transactions ───────────────────────────────────────
    [HttpGet("non-sales")]
    public async Task<IActionResult> GetNonSalesReport(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetNonSalesReportAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: pending item-wise (no shiftNo) ───────────────────────────────
    [HttpGet("pending-item-wise")]
    public async Task<IActionResult> GetPendingItemWise(
        [FromQuery] int locationIDBilling = 0)
    {
        var result = await reportSvc.GetPendingItemWiseAsync(LocationId, locationIDBilling, UnitNo);
        return Ok(result);
    }

    // ── GET: sales including pending ──────────────────────────────────────
    [HttpGet("sales-including-pending")]
    public async Task<IActionResult> GetSalesIncludingPending(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetSalesIncludingPendingAsync(LocationId, locationIDBilling, UnitNo, shiftNo);
        return Ok(result);
    }

    // ── GET: day book (no locationIDBilling or shiftNo) ───────────────────
    [HttpGet("day-book")]
    public async Task<IActionResult> GetDayBook()
    {
        var result = await reportSvc.GetDayBookReportAsync(LocationId, UnitNo);
        return Ok(result);
    }

    // ── GET: Z reading (IsDayEnd=1, all cashiers) ─────────────────────────
    [HttpGet("z-reading")]
    public async Task<IActionResult> GetZReading(
        [FromQuery] int locationIDBilling = 0,
        [FromQuery] int shiftNo = 0)
    {
        var result = await reportSvc.GetZReadingAsync(new SalesReadingRequest(
            LocationID: LocationId,
            LocationIDBilling: locationIDBilling,
            UnitNo: UnitNo,
            CashierID: CashierId,
            ShiftNo: shiftNo,
            ReportType: 2   // all cashiers
        ));
        return Ok(result);
    }
}
