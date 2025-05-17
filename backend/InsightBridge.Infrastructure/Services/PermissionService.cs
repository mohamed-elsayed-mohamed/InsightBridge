using InsightBridge.Domain.Interfaces;
using InsightBridge.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.SqlServer.TransactSql.ScriptDom;
using System.Data.SqlClient;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace InsightBridge.Infrastructure.Services
{
    public class PermissionService : IPermissionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PermissionService> _logger;

        public PermissionService(ApplicationDbContext context, ILogger<PermissionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<bool> HasTablePermissionAsync(string userId, string tableName, string operation)
        {
            var permission = await _context.UserPermissions
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (permission == null || string.IsNullOrEmpty(permission.AllowedTables))
                return false;

            try
            {
                var allowedTables = JsonSerializer.Deserialize<List<string>>(permission.AllowedTables);
                return allowedTables?.Contains(tableName) ?? false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking table permission");
                return false;
            }
        }

        public async Task<bool> HasFieldPermissionAsync(string userId, string tableName, string fieldName, string operation)
        {
            var permission = await _context.UserPermissions
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (permission == null || string.IsNullOrEmpty(permission.AllowedColumns))
                return false;

            try
            {
                var allowedColumns = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(permission.AllowedColumns);
                return allowedColumns?.TryGetValue(tableName, out var columns) == true &&
                       columns?.Contains(fieldName) == true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking field permission");
                return false;
            }
        }

        public async Task<IEnumerable<string>> GetAccessibleTablesAsync(string userId)
        {
            var permission = await _context.UserPermissions
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (permission == null || string.IsNullOrEmpty(permission.AllowedTables))
                return Enumerable.Empty<string>();

            try
            {
                var allowedTables = JsonSerializer.Deserialize<List<string>>(permission.AllowedTables);
                return allowedTables ?? Enumerable.Empty<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting accessible tables");
                return Enumerable.Empty<string>();
            }
        }

        public async Task<IEnumerable<string>> GetAccessibleFieldsAsync(string userId, string tableName)
        {
            var permission = await _context.UserPermissions
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (permission == null || string.IsNullOrEmpty(permission.AllowedColumns))
                return Enumerable.Empty<string>();

            try
            {
                var allowedColumns = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(permission.AllowedColumns);
                if (allowedColumns?.TryGetValue(tableName, out var columns) == true)
                {
                    return columns ?? Enumerable.Empty<string>();
                }
                return Enumerable.Empty<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting accessible fields");
                return Enumerable.Empty<string>();
            }
        }

        private async Task<bool> TableExistsAsync(string connectionString, string tableName)
        {
            try
            {
                var query = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_NAME = @TableName";

                using (var connection = new SqlConnection(connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@TableName", tableName);
                        var result = await command.ExecuteScalarAsync();
                        return Convert.ToInt32(result) > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking if table {tableName} exists");
                return false;
            }
        }

        public async Task ValidateQueryPermissionsAsync(string connectionString, string userId, string query)
        {
            // Extract field names from the query
            var fieldNames = SqlFieldExtractor.ExtractFieldNames(query);

            // Check field permissions
            foreach (var (tableName, fields) in fieldNames)
            {
                // Get the actual columns that exist in the table
                var existingColumns = await GetTableColumnsAsync(connectionString, tableName);

                if (!await TableExistsAsync(connectionString, tableName))
                    continue;

                if (!await HasTablePermissionAsync(userId, tableName, "select"))
                {
                    throw new UnauthorizedAccessException($"User does not have permission to access table: {tableName}");
                }

                // Then check each field permission, but only for fields that actually exist in the table
                foreach (var field in fields)
                {
                    // Skip fields that don't exist in the table
                    if (!existingColumns.Contains(field, StringComparer.OrdinalIgnoreCase))
                        continue;

                    if (!await HasFieldPermissionAsync(userId, tableName, field, "select"))
                    {
                        throw new UnauthorizedAccessException($"User does not have permission to access field: {field} in table: {tableName}");
                    }
                }
            }
        }

        private IEnumerable<string> ExtractTableNames(string query)
        {
            // This is a simplified version. In a real implementation, you'd want to use a proper SQL parser
            var fromMatches = Regex.Matches(query, @"\bFROM\s+([^\s,;]+)", RegexOptions.IgnoreCase);
            var joinMatches = Regex.Matches(query, @"\bJOIN\s+([^\s,;]+)", RegexOptions.IgnoreCase);

            var tables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (Match match in fromMatches)
            {
                tables.Add(match.Groups[1].Value.Trim('[', ']'));
            }

            foreach (Match match in joinMatches)
            {
                tables.Add(match.Groups[1].Value.Trim('[', ']'));
            }

            return tables;
        }

        private async Task<HashSet<string>> GetTableColumnsAsync(string connectionString, string tableName)
        {
            try
            {
                // Query the database to get the actual columns for the table
                var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // This is a simplified example - you'll need to adjust this based on your database provider
                var query = $@"
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = @TableName";

                using (var connection = new SqlConnection(connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@TableName", tableName);
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                columns.Add(reader.GetString(0));
                            }
                        }
                    }
                }

                return columns;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting columns for table {tableName}");
                return null;
            }
        }

        public class SqlFieldExtractor
        {
            public static Dictionary<string, HashSet<string>> ExtractFieldNames(string sql)
            {
                var result = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
                var aliasToTable = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                var parser = new TSql150Parser(false);
                IList<Microsoft.SqlServer.TransactSql.ScriptDom.ParseError> errors;

                using (var reader = new StringReader(sql))
                {
                    var fragment = parser.Parse(reader, out errors);

                    if (errors != null && errors.Count > 0)
                    {
                        throw new Exception("SQL parsing error: " + string.Join(", ", errors));
                    }

                    var visitor = new FieldExtractorVisitor(result, aliasToTable);
                    fragment.Accept(visitor);
                }

                return result;
            }

            private class FieldExtractorVisitor : TSqlFragmentVisitor
            {
                private readonly Dictionary<string, HashSet<string>> _result;
                private readonly Dictionary<string, string> _aliasToTable;

                public FieldExtractorVisitor(Dictionary<string, HashSet<string>> result, Dictionary<string, string> aliasToTable)
                {
                    _result = result;
                    _aliasToTable = aliasToTable;
                }

                public override void Visit(NamedTableReference node)
                {
                    var tableName = node.SchemaObject.BaseIdentifier.Value;
                    var alias = node.Alias?.Value ?? tableName;

                    _aliasToTable[alias] = tableName;

                    if (!_result.ContainsKey(tableName))
                    {
                        _result[tableName] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    }
                }

                public override void Visit(ColumnReferenceExpression node)
                {
                    string table = null;
                    string column = null;

                    if (node.MultiPartIdentifier != null)
                    {
                        var parts = node.MultiPartIdentifier.Identifiers;
                        if (parts.Count == 2)
                        {
                            table = parts[0].Value;
                            column = parts[1].Value;
                        }
                        else if (parts.Count == 1)
                        {
                            column = parts[0].Value;
                        }
                    }

                    if (column != null)
                    {
                        if (table == null)
                        {
                            foreach (var tbl in _result.Keys)
                            {
                                _result[tbl].Add(column);
                            }
                        }
                        else
                        {
                            // Resolve alias to actual table name
                            if (_aliasToTable.TryGetValue(table, out var actualTable))
                            {
                                table = actualTable;
                            }

                            if (!_result.ContainsKey(table))
                            {
                                _result[table] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                            }

                            _result[table].Add(column);
                        }
                    }
                }

                public override void Visit(FunctionCall node)
                {
                    foreach (var parameter in node.Parameters)
                    {
                        parameter.Accept(this);
                    }
                }

                public override void Visit(SelectStatement node)
                {
                    base.Visit(node);
                }

                public override void Visit(QuerySpecification node)
                {
                    foreach (var selectElement in node.SelectElements)
                    {
                        selectElement.Accept(this);
                    }

                    node.WhereClause?.SearchCondition?.Accept(this);
                    node.GroupByClause?.Accept(this);
                    node.OrderByClause?.Accept(this);

                    foreach (var tableRef in node.FromClause?.TableReferences ?? new List<TableReference>())
                    {
                        tableRef.Accept(this);
                    }
                }

                public override void Visit(ExpressionWithSortOrder node)
                {
                    node.Expression.Accept(this);
                }

                public override void Visit(GroupByClause node)
                {
                    foreach (var grouping in node.GroupingSpecifications)
                    {
                        grouping.Accept(this);
                    }
                }

                public override void Visit(SelectScalarExpression node)
                {
                    node.Expression.Accept(this);
                }
            }
        }
    }
}