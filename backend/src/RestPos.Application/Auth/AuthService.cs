using RestPos.Data.Repositories;
using RestPos.Domain;

namespace RestPos.Application.Auth;

public record LoginRequest(string Password, int LocationId, int UnitNo, bool UseEncode = false);

public record LoginResult(bool Success, Cashier? Cashier, string? Error);

public class AuthService(ICashierRepository cashierRepo)
{
    // Mirrors MasterFileService.GetCashier — password field vs Encode field login
    public async Task<LoginResult> LoginAsync(LoginRequest request)
    {
        var cashier = request.UseEncode
            ? await cashierRepo.GetByEncodeAsync(request.Password, request.LocationId)
            : await cashierRepo.GetByPasswordAsync(request.Password, request.LocationId);

        return cashier is null
            ? new LoginResult(false, null, "Invalid credentials")
            : new LoginResult(true, cashier, null);
    }
}
