using System.Security.Claims;
using CrowdLens.Data;
using Crowdlens_backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Crowdlens_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AlertsController : ControllerBase
    {
        private readonly CrowdLensDbContext _context;

        // Numeric rank so we can compare thresholds to current density
        private static readonly Dictionary<string, int> DensityRank = new()
        {
            { "Very Low",  1 },
            { "Low",       2 },
            { "Medium",    3 },
            { "High",      4 },
            { "Very High", 5 },
        };

        public AlertsController(CrowdLensDbContext context)
        {
            _context = context;
        }

        // ── GET /api/Alerts/check ─────────────────────────────────────────────
        // Returns favorited locations whose current crowd density is at or below
        // the user's per-location alert threshold.
        [HttpGet("check")]
        public async Task<IActionResult> CheckAlerts()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var favorites = await _context.Favorites
                .Where(f => f.UserId == userId && f.AlertThreshold != "None")
                .ToListAsync();

            if (!favorites.Any())
                return Ok(new List<AlertedLocationDto>());

            var locationIds = favorites.Select(f => f.LocationId).ToList();

            var locations = await _context.Locations
                .Where(l => locationIds.Contains(l.Id))
                .ToListAsync();

            // Vote-based density — same 1-hour window used everywhere
            var oneHourAgo = DateTime.Now.AddHours(-1);
            var recentReports = await _context.Reports
                .Where(r => locationIds.Contains(r.LocationId) && r.CreatedAt >= oneHourAgo)
                .ToListAsync();

            var alerts = new List<AlertedLocationDto>();

            foreach (var fav in favorites)
            {
                var location = locations.FirstOrDefault(l => l.Id == fav.LocationId);
                if (location == null) continue;

                var votes = recentReports
                    .Where(r => r.LocationId == fav.LocationId && !string.IsNullOrEmpty(r.SelectedLevel))
                    .Select(r => NormalizeLevel(r.SelectedLevel))
                    .ToList();

                var currentDensity = ComputeDensity(votes);

                // Alert fires when current crowd ≤ threshold
                var currentRank   = DensityRank.GetValueOrDefault(currentDensity, 99);
                var thresholdRank = DensityRank.GetValueOrDefault(fav.AlertThreshold, 0);

                if (currentRank <= thresholdRank)
                {
                    alerts.Add(new AlertedLocationDto
                    {
                        locationId      = location.Id,
                        locationName    = location.LocationName,
                        locationType    = location.Type,
                        currentDensity  = currentDensity,
                        alertThreshold  = fav.AlertThreshold
                    });
                }
            }

            return Ok(alerts);
        }

        private static string NormalizeLevel(string? level) => level switch
        {
            "Moderate" => "Medium",
            _ => level ?? ""
        };

        private static string ComputeDensity(List<string> votes) =>
            votes.Any()
                ? votes.GroupBy(v => v).OrderByDescending(g => g.Count()).First().Key
                : "Very Low";
    }
}
