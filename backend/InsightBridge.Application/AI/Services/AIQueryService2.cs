using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;
using InsightBridge.Application.AI.Models;
using InsightBridge.Application.AI.Interfaces;

namespace InsightBridge.Application.AI.Services
{
    public class AIQueryService2 : IAIQueryService
    {
        private readonly OpenAIClient _openAI;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AIQueryService2> _logger;
        private readonly string _systemPrompt;
        private readonly string _model;

        public AIQueryService2(IConfiguration configuration, ILogger<AIQueryService2> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _openAI = new OpenAIClient(_configuration["OpenAI:ApiKey"]);
            _model = _configuration["OpenAI:Model"] ?? "gpt-3.5";

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
                var messages = new List<ChatMessage>
                {
                    ChatMessage.CreateSystemMessage(_systemPrompt),
                    ChatMessage.CreateUserMessage(userMessage)
                };

                //var chatRequest = new Chat
                //{
                //    Messages = messages,
                //    Model = _model
                //};


                var response = await _openAI.GetChatClient(_model).CompleteChatAsync(messages);

                //if (response?.Choices == null || response.Choices.Count == 0)
                //{
                //    throw new Exception("No response from OpenAI.");
                //}

                if (response.Value?.ToolCalls == null || response.Value.ToolCalls.Count == 0)
                    throw new Exception("No response from OpenAI.");

                var toolCall = response.Value.ToolCalls.First();

                using JsonDocument argumentsJson = JsonDocument.Parse(toolCall.FunctionArguments);

                ToolChatMessage toolChatMessage = new ToolChatMessage(toolCall.Id);
                //var content = response.Choices[0].Message.Content;

                var content = argumentsJson?.ToString() ?? "";

                try
                {
                    var json = ExtractJson(content);
                    var result = JsonSerializer.Deserialize<AIQueryResponse>(json);
                    if (result != null)
                        return result;
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to parse JSON. Falling back to text parsing.");
                    return ParseResponseFromText(content);
                }

                return ErrorResponse("Failed to parse AI response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating AI response");
                return ErrorResponse($"Error: {ex.Message}");
            }
        }

        private string ExtractJson(string text)
        {
            var match = Regex.Match(text, @"\{[\s\S]*?\}");
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
    }
}
