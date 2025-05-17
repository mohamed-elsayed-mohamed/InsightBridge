using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InsightBridge.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpPost]
    public async Task<ActionResult<Report>> CreateReport(Report report)
    {
        var result = await _reportService.CreateReportAsync(report);
        return CreatedAtAction(nameof(GetReport), new { id = result.Id }, result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Report>> GetReport(int id)
    {
        var report = await _reportService.GetReportByIdAsync(id);
        if (report == null)
            return NotFound();

        return report;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Report>>> GetAllReports()
    {
        var reports = await _reportService.GetAllReportsAsync();
        return Ok(reports);
    }

    [HttpGet("connection/{connectionId}")]
    public async Task<ActionResult<IEnumerable<Report>>> GetReportsByConnection(int connectionId)
    {
        var reports = await _reportService.GetReportsByConnectionIdAsync(connectionId);
        return Ok(reports);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReport(int id, Report report)
    {
        if (id != report.Id)
            return BadRequest();

        var success = await _reportService.UpdateReportAsync(report);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReport(int id)
    {
        var success = await _reportService.DeleteReportAsync(id);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id}/execute")]
    public async Task<ActionResult<object>> ExecuteReport(int id)
    {
        try
        {
            var result = await _reportService.ExecuteReportAsync(id);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error executing report: {ex.Message}");
        }
    }
}