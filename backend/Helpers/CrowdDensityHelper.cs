using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Crowdlens_backend.Helpers
{
    public enum DensityLevel
    {
        VeryLow,
        Low,
        Medium,
        High,
        VeryHigh

    }

    public static class CrowdDensityHelper
    {
        public static string GetLevel(double occupancyRate)
        {
            if (occupancyRate < 20) return "Very Low";
            if (occupancyRate < 40) return "Low";
            if (occupancyRate < 60) return "Medium";
            if (occupancyRate < 80) return "High";
            return "Very High";
        }

        public static string GetTimestampLabel(DateTime lastUpdated)
        {
            var diff = DateTime.Now - lastUpdated;
            if (diff.TotalMinutes < 1) return "Just now";
            if (diff.TotalMinutes < 60) return $"Updated {(int)diff.TotalMinutes} mins ago";
            return $"Updated {(int)diff.TotalHours} hours ago";
        }

        public static bool IsFeedStale(DateTime lastUpdated, int thresholdMinutes = 15)
            => (DateTime.Now - lastUpdated).TotalMinutes > thresholdMinutes;
    }
}