using Microsoft.AspNetCore.Mvc;

namespace RestPos.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "healthy", version = "0.1.0", timestamp = DateTime.UtcNow });
}
