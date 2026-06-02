using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Crowdlens_backend.Models
{
    public class Report
    {
    public int Id { get; set; }
    public int LocationId { get; set; } // Which location?
    public string? UserId { get; set; } // Who voted? (to prevent spam)
    public string? SelectedLevel { get; set; } // "High", "Low", etc.
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}