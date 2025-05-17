using System.ComponentModel.DataAnnotations;

namespace InsightBridge.Domain.Models
{
    public class TablePermission
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        public string TableName { get; set; }

        public bool CanSelect { get; set; }
        public bool CanInsert { get; set; }
        public bool CanUpdate { get; set; }
        public bool CanDelete { get; set; }

        // Navigation property
        public ApplicationUser User { get; set; }
    }
}