using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text;
using System;
using System.Collections.Generic;

namespace InsightBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TeamsController : ControllerBase
    {
        private readonly IConfiguration _config;
        private static string? _accessToken; // For demo only; use DB or secure store in production
        private static string? _refreshToken;
        public TeamsController(IConfiguration config)
        {
            _config = config;
        }

        [HttpPost("connect")]
        public IActionResult Connect()
        {
            var clientId = _config["Teams:ClientId"];
            var tenantId = _config["Teams:TenantId"];
            var redirectUri = _config["Teams:RedirectUri"];
            var scopes = "Chat.ReadWrite ChannelMessage.Send Group.ReadWrite.All User.Read offline_access";
            var authUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize" +
                          $"?client_id={clientId}&response_type=code&redirect_uri={Uri.EscapeDataString(redirectUri)}&response_mode=query&scope={Uri.EscapeDataString(scopes)}";
            return Ok(new { url = authUrl });
        }

        [HttpGet("callback")]
        public async Task<IActionResult> Callback([FromQuery] string code)
        {
            var clientId = _config["Teams:ClientId"];
            var clientSecret = _config["Teams:ClientSecret"];
            var tenantId = _config["Teams:TenantId"];
            var redirectUri = _config["Teams:RedirectUri"];
            var tokenUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("scope", "Chat.ReadWrite ChannelMessage.Send Group.ReadWrite.All User.Read offline_access"),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", redirectUri),
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("client_secret", clientSecret),
            });
            using var http = new HttpClient();
            var resp = await http.PostAsync(tokenUrl, content);
            var json = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
                return BadRequest(json);
            var doc = JsonDocument.Parse(json);
            _accessToken = doc.RootElement.GetProperty("access_token").GetString();
            _refreshToken = doc.RootElement.GetProperty("refresh_token").GetString();
            return Ok(new { success = true });
        }

        [HttpPost("send-message")]
        public async Task<IActionResult> SendMessage([FromBody] TeamsMessageRequest req)
        {
            if (string.IsNullOrEmpty(_accessToken))
                return Unauthorized("Teams not connected. Please connect first.");
            var url = $"https://graph.microsoft.com/v1.0/teams/{req.TeamId}/channels/{req.ChannelId}/messages";
            var payload = new
            {
                body = new { content = req.Message }
            };
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _accessToken);
            var res = await http.PostAsync(url, new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
            var result = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
                return BadRequest(result);
            return Ok(JsonDocument.Parse(result));
        }

        [HttpGet("config")]
        public IActionResult Config()
        {
            return Ok(new { connected = !string.IsNullOrEmpty(_accessToken) });
        }

        public class TeamsMessageRequest
        {
            public string TeamId { get; set; } = string.Empty;
            public string ChannelId { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
        }
    }
} 