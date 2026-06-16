using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestPos.Data.Repositories;

namespace RestPos.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConfigController(ISysConfigRepository sysConfigRepo) : ControllerBase
{
    [HttpGet("session")]
    public async Task<IActionResult> GetSessionConfig()
    {
        var locationId = int.Parse(User.FindFirst("locationId")!.Value);
        var unitNo = int.Parse(User.FindFirst("unitNo")!.Value);
        var config = await sysConfigRepo.GetOnLoadAsync(locationId, unitNo);
        return config is null ? NotFound("SysConfig not found for this terminal") : Ok(config);
    }

    [HttpGet("print-header")]
    public async Task<IActionResult> GetPrintHeader()
    {
        var locationId = int.Parse(User.FindFirst("locationId")!.Value);
        var unitNo = int.Parse(User.FindFirst("unitNo")!.Value);
        var config = await sysConfigRepo.GetPrintHeaderAsync(locationId, unitNo);
        return config is null ? NotFound() : Ok(config);
    }

    [HttpGet("print-footer")]
    public async Task<IActionResult> GetPrintFooter()
    {
        var locationId = int.Parse(User.FindFirst("locationId")!.Value);
        var unitNo = int.Parse(User.FindFirst("unitNo")!.Value);
        var config = await sysConfigRepo.GetPrintFooterAsync(locationId, unitNo);
        return config is null ? NotFound() : Ok(config);
    }

    // Operative POS config for the selected billing counter (from Counters table)
    [HttpGet("counter")]
    public async Task<IActionResult> GetCounterConfig([FromQuery] int billingLocationId)
    {
        var config = await sysConfigRepo.GetCounterConfigAsync(billingLocationId);
        return config is null ? NotFound($"Counter not found: {billingLocationId}") : Ok(config);
    }
}
