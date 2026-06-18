using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestPos.Data.Repositories;

namespace RestPos.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MasterController(IMasterRepository masterRepo) : ControllerBase
{
    private int UnitNo => int.Parse(User.FindFirst("unitNo")!.Value);
    private int LocationId => int.Parse(User.FindFirst("locationId")!.Value);

    [HttpGet("billing-locations")]
    public async Task<IActionResult> GetBillingLocations()
    {
        var list = await masterRepo.GetBillingLocationsAsync(UnitNo);
        return Ok(list);
    }

    [HttpGet("tables")]
    public async Task<IActionResult> GetTables([FromQuery] int billingLocationId)
    {
        var list = await masterRepo.GetTablesAsync(billingLocationId);
        return Ok(list);
    }

    [HttpGet("stewards")]
    public async Task<IActionResult> GetStewards()
    {
        var list = await masterRepo.GetStewardsAsync();
        return Ok(list);
    }

    [HttpGet("item-comments")]
    public async Task<IActionResult> GetItemComments()
    {
        var list = await masterRepo.GetItemCommentsAsync();
        return Ok(list);
    }

    [HttpGet("item-layer1")]
    public async Task<IActionResult> GetItemLayer1()
    {
        var list = await masterRepo.GetItemLayer1Async();
        return Ok(list);
    }

    [HttpGet("item-layer2")]
    public async Task<IActionResult> GetItemLayer2([FromQuery] long layer1Id)
    {
        var list = await masterRepo.GetItemLayer2Async(layer1Id);
        return Ok(list);
    }

    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets(
        [FromQuery] int billingLocationId, [FromQuery] int tableId)
    {
        var list = await masterRepo.GetAvailableTicketsAsync(LocationId, billingLocationId, tableId);
        return Ok(list);
    }

    [HttpPost("new-ticket")]
    public async Task<IActionResult> AllocateTicket()
    {
        var ticketId = await masterRepo.AllocateTicketAsync(LocationId);
        return Ok(new { ticketId });
    }
}
