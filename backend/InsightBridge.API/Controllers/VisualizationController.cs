using Microsoft.AspNetCore.Mvc;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Collections.Concurrent;
using System.Text.Json;
using InsightBridge.Application.AI.Interfaces;
using InsightBridge.Application.AI.Models;

namespace InsightBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VisualizationController : ControllerBase
    {
        private readonly IAIQueryService _aiQueryService;
        private static object _dashboardConfig = null;

        public VisualizationController(IAIQueryService aiQueryService)
        {
            _aiQueryService = aiQueryService;
        }

        [HttpPost("visualize")]
        public async Task<IActionResult> Visualize([FromBody] VisualizeRequest request)
        {
            string queryToExecute = request.Query;
            
            // If AI prompt is provided, generate the query
            if (!string.IsNullOrWhiteSpace(request.AiPrompt))
            {
                try
                {
                    // Get database schema
                    string schema = await GetDatabaseSchema(request.ConnectionString);
                    
                    // Generate query using AI
                    var aiResponse = await _aiQueryService.GenerateQueryAsync(request.AiPrompt, schema);
                    if (!string.IsNullOrEmpty(aiResponse.SqlQuery))
                    {
                        queryToExecute = aiResponse.SqlQuery;
                    }
                }
                catch (Exception ex)
                {
                    return BadRequest(new { error = $"AI query generation error: {ex.Message}" });
                }
            }

            // Execute the query
            DataTable resultTable = new DataTable();
            try
            {
                using var conn = new SqlConnection(request.ConnectionString);
                await conn.OpenAsync();
                using var cmd = new SqlCommand(queryToExecute, conn);
                using var reader = await cmd.ExecuteReaderAsync();
                resultTable.Load(reader);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = $"Query error: {ex.Message}" });
            }

            // Process results
            var columns = resultTable.Columns.Cast<DataColumn>().Select(c => c.ColumnName).ToList();
            var data = resultTable.Rows.Cast<DataRow>().Select(r => columns.ToDictionary(c => c, c => r[c])).ToList();
            var chartTypes = SuggestChartTypes(resultTable);

            return Ok(new
            {
                columns,
                data,
                chartTypes,
                generatedQuery = queryToExecute != request.Query ? queryToExecute : null
            });
        }

        private async Task<string> GetDatabaseSchema(string connectionString)
        {
            var schema = new List<string>();
            try
            {
                using var conn = new SqlConnection(connectionString);
                await conn.OpenAsync();

                // Get tables
                var tablesQuery = @"
                    SELECT 
                        t.name AS TableName,
                        c.name AS ColumnName,
                        ty.name AS DataType,
                        c.max_length AS MaxLength,
                        c.is_nullable AS IsNullable
                    FROM sys.tables t
                    INNER JOIN sys.columns c ON t.object_id = c.object_id
                    INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
                    ORDER BY t.name, c.column_id";

                using var cmd = new SqlCommand(tablesQuery, conn);
                using var reader = await cmd.ExecuteReaderAsync();
                
                var currentTable = "";
                var tableSchema = new List<string>();
                
                while (await reader.ReadAsync())
                {
                    var tableName = reader["TableName"].ToString();
                    var columnName = reader["ColumnName"].ToString();
                    var dataType = reader["DataType"].ToString();
                    var isNullable = (bool)reader["IsNullable"];
                    
                    if (tableName != currentTable)
                    {
                        if (currentTable != "")
                        {
                            schema.Add($"Table {currentTable}: {string.Join(", ", tableSchema)}");
                        }
                        currentTable = tableName;
                        tableSchema.Clear();
                    }
                    
                    tableSchema.Add($"{columnName} ({dataType}{(isNullable ? " NULL" : " NOT NULL")})");
                }
                
                if (currentTable != "")
                {
                    schema.Add($"Table {currentTable}: {string.Join(", ", tableSchema)}");
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to get database schema: {ex.Message}");
            }
            
            return string.Join("\n", schema);
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
            public string AiPrompt { get; set; }
        }
    }
} 