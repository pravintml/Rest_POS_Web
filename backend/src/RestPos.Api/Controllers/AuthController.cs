using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestPos.Application.Auth;
using RestPos.Data.Repositories;
using System.Security.Claims;

namespace RestPos.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AuthService authService, JwtTokenService jwtService, ICashierRepository cashierRepo) : ControllerBase
{
    public record SignOnRequest(string Password, int LocationId, int UnitNo, bool UseEncode = false);
    public record SignOnResponse(string Token, long CashierId, string Name, string Code, int Type, int LocationId, int UnitNo);

    [HttpPost("signin")]
    public async Task<IActionResult> SignIn([FromBody] SignOnRequest req)
    {
        var result = await authService.LoginAsync(new LoginRequest(req.Password, req.LocationId, req.UnitNo, req.UseEncode));
        if (!result.Success || result.Cashier is null)
            return Unauthorized(new { error = result.Error });

        var token = jwtService.Generate(result.Cashier, req.UnitNo);
        return Ok(new SignOnResponse(token, result.Cashier.CashierID, result.Cashier.Name, result.Cashier.Code, result.Cashier.Type, result.Cashier.LocationID, req.UnitNo));
    }

    /// <summary>
    /// Returns the cashier's function-level permission map.
    /// Mirrors CashierPermission table: key = FunctName, value = IsAccess.
    /// Keys relevant to discounts: DISCOUNT, DISCOUNTPER, DISCREM, DISC_LEVEL.
    /// </summary>
    [HttpGet("permissions")]
    [Authorize]
    public async Task<IActionResult> GetPermissions()
    {
        var cashierId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var locationId = int.Parse(User.FindFirstValue("locationId")!);
        var perms = await cashierRepo.GetPermissionsAsync(cashierId, locationId);
        return Ok(perms);
    }
}
