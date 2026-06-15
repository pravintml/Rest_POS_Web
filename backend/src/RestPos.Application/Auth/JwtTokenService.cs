using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using RestPos.Domain;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RestPos.Application.Auth;

public class JwtTokenService(IConfiguration config)
{
    public string Generate(Cashier cashier, int unitNo)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(int.Parse(config["Jwt:ExpiryMinutes"] ?? "480"));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, cashier.CashierID.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, cashier.Name),
            new Claim("cashierCode", cashier.Code),
            new Claim("locationId", cashier.LocationID.ToString()),
            new Claim("unitNo", unitNo.ToString()),
            new Claim("cashierType", cashier.Type.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
