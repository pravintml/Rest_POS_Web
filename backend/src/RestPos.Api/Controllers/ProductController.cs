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
    public async Task<IActionResult> GetByCode(string code)
    {
        var product = await productRepo.GetByCodeAsync(code, LocationId);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpGet("by-barcode/{barcode}")]
    public async Task<IActionResult> GetByBarcode(string barcode)
    {
        var product = await productRepo.GetByBarcodeAsync(barcode, LocationId);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpGet("by-category/{categoryId}")]
    public async Task<IActionResult> GetByCategory(long categoryId)
    {
        var products = await productRepo.GetByCategoryAsync(categoryId, LocationId);
        return Ok(products);
    }
}
