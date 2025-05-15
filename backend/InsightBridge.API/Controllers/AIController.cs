using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using InsightBridge.Application.AI.Interfaces;
using InsightBridge.Application.AI.Models;
using System.Collections.Generic;

namespace InsightBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AIController : ControllerBase
    {
        private readonly IAIQueryService _aiQueryService;
        private static readonly List<AIQueryResponse> _queryHistory = new();

        public AIController(IAIQueryService aiQueryService)
        {
            _aiQueryService = aiQueryService;
        }

        [HttpPost("query")]
        public async Task<ActionResult<AIQueryResponse>> GenerateQuery([FromBody] QueryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Question))
            {
                return BadRequest("Question cannot be empty");
            }

            var response = await _aiQueryService.GenerateQueryAsync(request.Question, request.Schema);
            _queryHistory.Add(response);
            return Ok(response);
        }

        [HttpPost("clarify")]
        public async Task<ActionResult<AIQueryResponse>> ClarifyQuery([FromBody] ClarifyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Question) || string.IsNullOrWhiteSpace(request.Clarification))
            {
                return BadRequest("Question and clarification cannot be empty");
            }

            var response = await _aiQueryService.ClarifyQueryAsync(request.Question, request.Schema, request.Clarification);
            _queryHistory.Add(response);
            return Ok(response);
        }

        [HttpGet("history")]
        public ActionResult<IEnumerable<AIQueryResponse>> GetHistory()
        {
            return Ok(_queryHistory);
        }
    }

    public class QueryRequest
    {
        public string Question { get; set; } = string.Empty;
        public string Schema { get; set; } = string.Empty;
    }

    public class ClarifyRequest
    {
        public string Question { get; set; } = string.Empty;
        public string Schema { get; set; } = string.Empty;
        public string Clarification { get; set; } = string.Empty;
    }
} 