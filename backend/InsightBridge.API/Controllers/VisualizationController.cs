using Microsoft.AspNetCore.Mvc;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Collections.Concurrent;
using System.Text.Json;

namespace InsightBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VisualizationController : ControllerBase
    {
        // In-memory dashboard store (for demo)
        private static object _dashboardConfig = null;

        [HttpPost("visualize")]
        public async Task<IActionResult> Visualize([FromBody] VisualizeRequest request)
        {
            // 1. Run the SQL query
            DataTable resultTable = new DataTable();
            try
            {
                using var conn = new SqlConnection(request.ConnectionString);
                await conn.OpenAsync();
                using var cmd = new SqlCommand(request.Query, conn);
                using var reader = await cmd.ExecuteReaderAsync();
                resultTable.Load(reader);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = $"Query error: {ex.Message}" });
            }

            // 2. Analyze columns and suggest chart types (stub logic)
            var columns = resultTable.Columns.Cast<DataColumn>().Select(c => c.ColumnName).ToList();
            var data = resultTable.Rows.Cast<DataRow>().Select(r => columns.ToDictionary(c => c, c => r[c])).ToList();
            var chartTypes = SuggestChartTypes(resultTable);

            return Ok(new
            {
                columns,
                data,
                chartTypes
            });
        }

        [HttpPost("dashboard/save")]
        public IActionResult SaveDashboard([FromBody] object dashboard)
        {
            _dashboardConfig = dashboard;
            return Ok(new { success = true });
        }

        [HttpGet("dashboard")]
        public IActionResult GetDashboard()
        {
            return Ok(new { dashboard = _dashboardConfig });
        }

        // Simple chart suggestion stub
        private List<string> SuggestChartTypes(DataTable table)
        {
            if (table.Columns.Count == 2)
                return new List<string> { "bar", "line", "pie" };
            if (table.Columns.Count > 2)
                return new List<string> { "bar", "line" };
            return new List<string> { "table" };
        }

        public class VisualizeRequest
        {
            public string Query { get; set; }
            public string ConnectionString { get; set; }
        }
    }
} 