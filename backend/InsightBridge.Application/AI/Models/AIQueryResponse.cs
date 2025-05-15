namespace InsightBridge.Application.AI.Models;

public class AIQueryResponse
{
    public string SqlQuery { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string Visualization { get; set; } = string.Empty;
    public bool NeedsClarification { get; set; }
    public string? ClarificationQuestion { get; set; }
}
