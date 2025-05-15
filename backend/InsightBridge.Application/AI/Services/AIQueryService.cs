using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using InsightBridge.Application.AI.Models;
using InsightBridge.Application.AI.Interfaces;

namespace InsightBridge.Application.AI.Services;

public class AIQueryService : IAIQueryService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AIQueryService> _logger;
    private readonly string _systemPrompt;
    private readonly string _model;
    private readonly string _apiKey;

    public AIQueryService(IConfiguration configuration, ILogger<AIQueryService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _apiKey = _configuration["OpenRouter:ApiKey"];
        _model = "deepseek/deepseek-chat-v3-0324:free";//_configuration["OpenRouter:Model"] ?? "mistral/mixtral-8x7b";

        _systemPrompt = @"You are an expert SQL query generator. Your task is to:
1. Convert natural language questions into SQL queries
2. Explain the SQL query in simple terms
3. Suggest visualizations that would best represent the data
4. Handle any ambiguities by asking clarifying questions

Follow these rules:
- Always use proper SQL syntax
- Include comments explaining complex parts
- Consider performance implications
- Handle edge cases and NULL values
- Use appropriate JOINs and aggregations
- Format the SQL for readability

Your response must be in the following JSON format:
{
    ""sqlQuery"": ""your SQL query here"",
    ""explanation"": ""explanation in simple terms"",
    ""visualization"": ""suggested visualization type"",
    ""needsClarification"": true/false,
    ""clarificationQuestion"": ""question to ask if clarification is needed""
}";
    }

    public async Task<AIQueryResponse> GenerateQueryAsync(string question, string schema)
    {
        return await GetAIResponseAsync($"Database Schema:\n{schema}\n\nQuestion: {question}");
    }

    public async Task<AIQueryResponse> ClarifyQueryAsync(string question, string schema, string clarification)
    {
        return await GetAIResponseAsync($"Database Schema:\n{schema}\n\nOriginal Question: {question}\nClarification: {clarification}");
    }

    private async Task<AIQueryResponse> GetAIResponseAsync(string userMessage)
    {
        try
        {
            var requestBody = new
            {
                model = _model,
                messages = new[]
                {
                    new { role = "system", content = _systemPrompt },
                    new { role = "user", content = userMessage }
                }
            };

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
            //client.DefaultRequestHeaders.Add("HTTP-Referer", "https://yourdomain.com");
            client.DefaultRequestHeaders.Add("X-Title", "InsightBridge SQL Generator");

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await client.PostAsync("https://openrouter.ai/api/v1/chat/completions", content);
            var responseString = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<OpenRouterResponse>(responseString);
            var messageContent = result?.choices?.FirstOrDefault()?.message?.content;

            if (string.IsNullOrWhiteSpace(messageContent))
                return ErrorResponse("No response from OpenRouter.");

            try
            {
                var json = ExtractJson(messageContent);
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                var parsed = JsonSerializer.Deserialize<AIQueryResponse>(json, options);

                if (parsed != null)
                    return parsed;
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to parse JSON. Falling back to text parsing.");
                return ParseResponseFromText(messageContent);
            }

            return ErrorResponse("Failed to parse AI response.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating AI response");
            return ErrorResponse($"Error: {ex.Message}");
        }
    }

    private string ExtractJson(string text)
    {
        // Remove Markdown code block markers
        var cleaned = Regex.Replace(text, @"^```(?:json)?|```$", "", RegexOptions.Multiline).Trim();

        // Extract JSON object
        var match = Regex.Match(cleaned, @"\{[\s\S]*?\}");
        return match.Success ? match.Value : throw new JsonException("No JSON object found.");
    }

    private AIQueryResponse ParseResponseFromText(string response)
    {
        var sqlQuery = ExtractBetween(response, "```sql", "```") ?? ExtractBetween(response, "```", "```");
        var explanation = ExtractAfter(response, "Explanation:") ?? "No explanation provided";
        var visualization = ExtractAfter(response, "Visualization:") ?? "No visualization suggestion provided";
        var clarificationQuestion = ExtractAfter(response, "Clarification Question:");

        return new AIQueryResponse
        {
            SqlQuery = sqlQuery ?? "SELECT 'No SQL query found' as error",
            Explanation = explanation.Trim(),
            Visualization = visualization.Trim(),
            NeedsClarification = response.Contains("clarification", StringComparison.OrdinalIgnoreCase),
            ClarificationQuestion = clarificationQuestion?.Trim()
        };
    }

    private string? ExtractBetween(string text, string start, string end)
    {
        var startIndex = text.IndexOf(start, StringComparison.OrdinalIgnoreCase);
        if (startIndex == -1) return null;

        startIndex += start.Length;
        var endIndex = text.IndexOf(end, startIndex, StringComparison.OrdinalIgnoreCase);
        if (endIndex == -1) return null;

        return text[startIndex..endIndex].Trim();
    }

    private string? ExtractAfter(string text, string marker)
    {
        var index = text.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (index == -1) return null;

        index += marker.Length;
        var nextNewLine = text.IndexOf('\n', index);
        return nextNewLine == -1 ? text[index..].Trim() : text[index..nextNewLine].Trim();
    }

    private AIQueryResponse ErrorResponse(string explanation)
    {
        return new AIQueryResponse
        {
            SqlQuery = "SELECT 'Error' as error",
            Explanation = explanation,
            Visualization = "error"
        };
    }


    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class Choice
    {
        public object logprobs { get; set; }
        public string finish_reason { get; set; }
        public string native_finish_reason { get; set; }
        public int index { get; set; }
        public Message message { get; set; }
    }

    public class Message
    {
        public string role { get; set; }
        public string content { get; set; }
        public object refusal { get; set; }
        public object reasoning { get; set; }
    }

    public class Usage
    {
        public int prompt_tokens { get; set; }
        public int completion_tokens { get; set; }
        public int total_tokens { get; set; }
        public object prompt_tokens_details { get; set; }
    }

    public class OpenRouterResponse
    {
        public string id { get; set; }
        public string provider { get; set; }
        public string model { get; set; }
        public string @object { get; set; }
        public int created { get; set; }
        public List<Choice> choices { get; set; }
        public Usage usage { get; set; }
    }
}
