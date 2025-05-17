namespace InsightBridge.Domain.Models;

public class DatabaseSchema
{
    public List<TableInfo> Tables { get; set; } = new();
    public List<ViewInfo> Views { get; set; } = new();
    public List<StoredProcedureInfo> StoredProcedures { get; set; } = new();
}

public class TableInfo
{
    public string Name { get; set; } = string.Empty;
    public string Schema { get; set; } = string.Empty;
    public long RowCount { get; set; }
    public List<ColumnInfo> Columns { get; set; } = new();
}

public class ColumnInfo
{
    public string Name { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public int? MaxLength { get; set; }
    public bool IsNullable { get; set; }
    public bool IsPrimaryKey { get; set; }
}

public class ViewInfo
{
    public string Name { get; set; } = string.Empty;
    public string Schema { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
}

public class StoredProcedureInfo
{
    public string Name { get; set; } = string.Empty;
    public string Schema { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
}