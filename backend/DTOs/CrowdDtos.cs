using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Crowdlens_backend.DTOs
{
    public class CrowdLocationsDto
    {
        public int id { get; set; }
        public string name { get; set; } = "";
        public int userCount { get; set; }
        public int capacity { get; set; }
        public double occupancyRate { get; set; }
        public string density { get; set; } = "";
        public string lastUpdated { get; set; } = "";   // "updated 2 minutes ago"
        public double latitude { get; set; }
        public double longitude { get; set; }
        public string type { get; set; } = "";
        public List<double> pos { get; set; } = new();
        public Dictionary<string, int> votes { get; set; } = new(); // e.g. {"Very Low": 5, "Low": 10, ...}

        // Populated only when returned from /api/Favorites
        public string? alertThreshold { get; set; }
    }

    public class AlternativeAreaDto
    {
        public int Id { get; set; }
        public string AreaName { get; set; } = "";
        public double OccupancyRate { get; set; }
        public string DensityLevel { get; set; } = "";
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class AreaCrowdResponseDto
    {
        public int Id { get; set; }
        public string AreaName { get; set; } = "";
        public int UserCount { get; set; }
        public int Capacity { get; set; }
        public double OccupancyRate { get; set; }
        public string DensityLevel { get; set; } = "";
        public string LastUpdated { get; set; } = "";
        public bool IsLiveFeed { get; set; }            // false = fallback data
        public bool IsFeedStale { get; set; }           // true = connection may be lost
        public double Latitude { get; set; }
        public double Longitude { get; set; }

        
        public List<CrowdLocationsDto> Establishments { get; set; } = new();
        public List<AlternativeAreaDto> AlternativeAreas { get; set; } = new();
    }

    public class ReportRequestDto
    {
        public int LocationId { get; set; }
        public string SelectedLevel { get; set; } = "";
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
    
}