using System.Security.Claims;
using CrowdLens.Data;
using Crowdlens_backend.DTOs;
using Crowdlens_backend.Helpers;
using Crowdlens_backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Crowdlens_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FavoritesController : ControllerBase
    {
        private readonly CrowdLensDbContext _context;

        private static readonly HashSet<string> ValidThresholds =
            new() { "None", "Very Low", "Low", "Medium" };

        public FavoritesController(CrowdLensDbContext context)
        {
            _context = context;
        }

        // ── GET /api/Favorites ────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetFavorites()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var favorites = await _context.Favorites
                .Where(f => f.UserId == userId)
                .ToListAsync();

            if (!favorites.Any())
                return Ok(new List<CrowdLocationsDto>());

            var favLocationIds = favorites.Select(f => f.LocationId).ToList();

            var locations = await _context.Locations
                .Where(l => favLocationIds.Contains(l.Id))
                .ToListAsync();

            var oneHourAgo = DateTime.Now.AddHours(-1);

            var recentReports = await _context.Reports
                .Where(r => favLocationIds.Contains(r.LocationId) && r.CreatedAt >= oneHourAgo)
                .ToListAsync();

            var absoluteLatest = await _context.Reports
                .Where(r => favLocationIds.Contains(r.LocationId))
                .GroupBy(r => r.LocationId)
                .Select(g => new { LocationId = g.Key, LatestDate = g.Max(r => r.CreatedAt) })
                .ToDictionaryAsync(x => x.LocationId, x => x.LatestDate);

            var thresholdMap = favorites.ToDictionary(f => f.LocationId, f => f.AlertThreshold);

            var dtos = locations.Select(l =>
            {
                var votes = recentReports
                    .Where(r => r.LocationId == l.Id && !string.IsNullOrEmpty(r.SelectedLevel))
                    .Select(r => NormalizeLevel(r.SelectedLevel))
                    .ToList();

                var density    = ComputeDensity(votes);
                var displayTime = absoluteLatest.TryGetValue(l.Id, out var reportTime)
                    ? reportTime : l.LastUpdated;
                var voteCounts  = votes.GroupBy(v => v).ToDictionary(g => g.Key, g => g.Count());

                return new CrowdLocationsDto
                {
                    id             = l.Id,
                    name           = l.LocationName,
                    type           = l.Type,
                    pos            = new List<double> { l.Latitude, l.Longitude },
                    density        = density,
                    lastUpdated    = CrowdDensityHelper.GetTimestampLabel(displayTime),
                    alertThreshold = thresholdMap.GetValueOrDefault(l.Id, "Low"),
                    votes          = new Dictionary<string, int>
                    {
                        { "Very Low",  voteCounts.GetValueOrDefault("Very Low",  0) },
                        { "Low",       voteCounts.GetValueOrDefault("Low",       0) },
                        { "Medium",    voteCounts.GetValueOrDefault("Medium",    0) },
                        { "High",      voteCounts.GetValueOrDefault("High",      0) },
                        { "Very High", voteCounts.GetValueOrDefault("Very High", 0) }
                    }
                };
            }).ToList();

            return Ok(dtos);
        }

        // ── POST /api/Favorites/{locationId} ─────────────────────────────────
        [HttpPost("{locationId:int}")]
        public async Task<IActionResult> AddFavorite(int locationId, [FromBody] AddFavoriteDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!ValidThresholds.Contains(dto.AlertThreshold))
                return BadRequest($"Invalid threshold. Allowed: {string.Join(", ", ValidThresholds)}");

            var locationExists = await _context.Locations.AnyAsync(l => l.Id == locationId);
            if (!locationExists)
                return NotFound($"Location {locationId} not found.");

            var existing = await _context.Favorites
                .FirstOrDefaultAsync(f => f.UserId == userId && f.LocationId == locationId);

            if (existing != null)
            {
                // Already favorited — update threshold instead of returning a conflict
                existing.AlertThreshold = dto.AlertThreshold;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Alert threshold updated." });
            }

            _context.Favorites.Add(new Favorite
            {
                UserId         = userId,
                LocationId     = locationId,
                AddedAt        = DateTime.Now,
                AlertThreshold = dto.AlertThreshold
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Added to favorites." });
        }

        // ── PUT /api/Favorites/{locationId}/threshold ─────────────────────────
        [HttpPut("{locationId:int}/threshold")]
        public async Task<IActionResult> UpdateThreshold(int locationId, [FromBody] UpdateThresholdDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            if (!ValidThresholds.Contains(dto.AlertThreshold))
                return BadRequest($"Invalid threshold. Allowed: {string.Join(", ", ValidThresholds)}");

            var favorite = await _context.Favorites
                .FirstOrDefaultAsync(f => f.UserId == userId && f.LocationId == locationId);

            if (favorite == null)
                return NotFound(new { message = "Favorite not found." });

            favorite.AlertThreshold = dto.AlertThreshold;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Threshold updated." });
        }

        // ── DELETE /api/Favorites/{locationId} ───────────────────────────────
        [HttpDelete("{locationId:int}")]
        public async Task<IActionResult> RemoveFavorite(int locationId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var favorite = await _context.Favorites
                .FirstOrDefaultAsync(f => f.UserId == userId && f.LocationId == locationId);

            if (favorite == null)
                return NotFound(new { message = "Favorite not found." });

            _context.Favorites.Remove(favorite);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Removed from favorites." });
        }

        // ── Helpers ───────────────────────────────────────────────────────────

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
