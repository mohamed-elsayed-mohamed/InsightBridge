namespace InsightBridge.Domain.Interfaces
{
    public interface IPermissionService
    {
        Task<bool> HasTablePermissionAsync(string userId, string tableName, string operation);
        Task<bool> HasFieldPermissionAsync(string userId, string tableName, string fieldName, string operation);
        Task<IEnumerable<string>> GetAccessibleTablesAsync(string userId);
        Task<IEnumerable<string>> GetAccessibleFieldsAsync(string userId, string tableName);
        Task ValidateQueryPermissionsAsync(string connectionString, string userId, string query);
    }
}