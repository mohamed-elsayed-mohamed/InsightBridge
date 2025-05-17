using System.ComponentModel.DataAnnotations;

namespace InsightBridge.Domain.Models
{
    public class FieldPermission
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        public string TableName { get; set; }

        [Required]
        public string FieldName { get; set; }

        public bool CanRead { get; set; }
        public bool CanWrite { get; set; }

        // Navigation property
        public ApplicationUser User { get; set; }
    }
}