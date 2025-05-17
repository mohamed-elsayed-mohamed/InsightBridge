using InsightBridge.Application.AI.Models;

namespace InsightBridge.Application.AI.Interfaces
{
    public interface IAIQueryService
    {
        Task<AIQueryResponse> GenerateQueryAsync(string question, string schema);
        Task<AIQueryResponse> ClarifyQueryAsync(string question, string schema, string clarification);
    }
}