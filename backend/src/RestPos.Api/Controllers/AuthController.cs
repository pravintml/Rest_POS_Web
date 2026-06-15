using Microsoft.AspNetCore.Mvc;
using RestPos.Application.Auth;

namespace RestPos.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AuthService authService, JwtTokenService jwtService) : ControllerBase
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
}
