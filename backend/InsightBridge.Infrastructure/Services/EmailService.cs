using InsightBridge.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Mail;

namespace InsightBridge.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly string _smtpServer;
        private readonly int _port;
        private readonly string _username;
        private readonly string _password;
        private readonly string _fromAddress;
        private readonly string _fromName;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
            _smtpServer = _configuration["Email:SmtpServer"] ?? throw new ArgumentNullException("Email:SmtpServer");
            _port = int.Parse(_configuration["Email:Port"] ?? "587");
            _username = _configuration["Email:Username"] ?? throw new ArgumentNullException("Email:Username");
            _password = _configuration["Email:Password"] ?? throw new ArgumentNullException("Email:Password");
            _fromAddress = _configuration["Email:FromAddress"] ?? throw new ArgumentNullException("Email:FromAddress");
            _fromName = _configuration["Email:FromName"] ?? "Insight Bridge";
        }

        public async Task SendEmailAsync(string to, string subject, string body, byte[]? attachment = null, string? attachmentName = null, string? mimeType = null)
        {
            using var mail = new MailMessage
            {
                From = new MailAddress(_fromAddress, _fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            mail.To.Add(to);

            if (attachment != null && attachmentName != null && mimeType != null)
            {
                mail.Attachments.Add(new Attachment(new MemoryStream(attachment), attachmentName, mimeType));
            }

            using var smtp = new SmtpClient(_smtpServer)
            {
                Port = _port,
                Credentials = new NetworkCredential(_username, _password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }
    }
}