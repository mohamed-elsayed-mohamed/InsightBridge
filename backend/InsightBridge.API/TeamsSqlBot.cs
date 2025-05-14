using Microsoft.Bot.Builder;
using Microsoft.Bot.Schema;
using System.Threading;
using System.Threading.Tasks;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Text;

public class TeamsSqlBot : ActivityHandler
{
    protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
    {
        var text = turnContext.Activity.Text?.Trim();

        if (text != null && text.StartsWith("run:", System.StringComparison.OrdinalIgnoreCase))
        {
            var sql = text.Substring(4).Trim();
            string result;
            try
            {
                // For demo: use a hardcoded/test connection string
                var connectionString = "Server=.;Database=TestAIDatabase;User Id=sa;Password=Alpha-13;TrustServerCertificate=True;";
                using var conn = new SqlConnection(connectionString);
                await conn.OpenAsync();
                using var cmd = new SqlCommand(sql, conn);
                using var reader = await cmd.ExecuteReaderAsync();
                var sb = new StringBuilder();
                // Write column headers
                for (int i = 0; i < reader.FieldCount; i++)
                    sb.Append(reader.GetName(i)).Append("\t");
                sb.AppendLine();
                // Write rows (limit to 10 rows for Teams)
                int rowCount = 0;
                while (await reader.ReadAsync() && rowCount < 10)
                {
                    for (int i = 0; i < reader.FieldCount; i++)
                        sb.Append(reader[i]?.ToString()).Append("\t");
                    sb.AppendLine();
                    rowCount++;
                }
                result = sb.ToString();
                if (rowCount == 0) result = "No results.";
            }
            catch (System.Exception ex)
            {
                result = $"Error: {ex.Message}";
            }
            await turnContext.SendActivityAsync(MessageFactory.Text($"Result:\n{result}"), cancellationToken);
        }
        else if (text != null && text.StartsWith("schedule:", System.StringComparison.OrdinalIgnoreCase))
        {
            // Parse schedule command, store in DB, confirm to user (demo only)
            await turnContext.SendActivityAsync(MessageFactory.Text("Scheduling not yet implemented. Please use the web UI for now."), cancellationToken);
        }
        else
        {
            await turnContext.SendActivityAsync(MessageFactory.Text("Send 'run: <SQL>' to execute a query, or 'schedule: ...' to schedule a report."), cancellationToken);
        }
    }
} 