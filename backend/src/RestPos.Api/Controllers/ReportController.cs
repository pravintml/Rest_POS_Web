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
}
