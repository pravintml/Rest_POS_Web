using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestPos.Data.Repositories;

namespace RestPos.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProductController(IProductRepository productRepo) : ControllerBase
{
    private int LocationId => int.Parse(User.FindFirst("locationId")!.Value);

    [HttpGet("by-code/{code}")]
    public async Task<IActionResult> GetByCode(string code, [FromQuery] int billingLocationId = 0)
    {
        var product = await productRepo.GetByCodeAsync(code, LocationId, billingLocationId);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpGet("by-barcode/{barcode}")]
    public async Task<IActionResult> GetByBarcode(string barcode, [FromQuery] int billingLocationId = 0)
    {
        var product = await productRepo.GetByBarcodeAsync(barcode, LocationId, billingLocationId);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpGet("by-id/{productId}")]
    public async Task<IActionResult> GetById(long productId, [FromQuery] int billingLocationId)
    {
        var product = await productRepo.GetByIdAsync(productId, LocationId, billingLocationId);
        return product is null ? NotFound() : Ok(product);
    }

    // Touch browser product grid (lightweight — ProductID + NameOnInvoice only)
    [HttpGet("touch")]
    public async Task<IActionResult> GetTouchProducts(
        [FromQuery] long? layer1Id, [FromQuery] long? layer2Id)
    {
        var products = await productRepo.GetTouchProductsAsync(layer1Id, layer2Id, LocationId);
        return Ok(products);
    }
}
