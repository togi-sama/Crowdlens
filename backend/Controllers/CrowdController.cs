using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CrowdLens.Data;
using Crowdlens_backend.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Crowdlens_backend.DTOs;
using Crowdlens_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Crowdlens_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CrowdController : ControllerBase
    {
        private readonly CrowdLensDbContext _context;

        public CrowdController(CrowdLensDbContext context)
        {
            _context = context;
        }

        //  Helper: Normalize density labels
        private string NormalizeLevel(string? level)
        {
            if (string.IsNullOrEmpty(level)) return "";

            return level switch
            {
                "Moderate" => "Medium",
                _ => level
            };
        }

        //  Helper: Get density from votes OR fallback
        private string ComputeDensity(List<string> votes)
        {
            if (votes.Any())
            {
                return votes
                    .GroupBy(v => v)
                    .OrderByDescending(g => g.Count())
                    .First()
                    .Key;
            }

            return "Very Low"; // fallback
        }

        // Helper method for distance calculation
        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var R = 6371e3; // Earth radius in meters
            var d1 = lat1 * Math.PI / 180;
            var d2 = lat2 * Math.PI / 180;
            var sd1 = (lat2 - lat1) * Math.PI / 180;
            var sd2 = (lon2 - lon1) * Math.PI / 180;

            var a = Math.Sin(sd1 / 2) * Math.Sin(sd1 / 2) +
                    Math.Cos(d1) * Math.Cos(d2) *
                    Math.Sin(sd2 / 2) * Math.Sin(sd2 / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return R * c; // Returns distance in meters
        }

        //  GET ALL LOCATIONS
        [HttpGet("locations")]
        [Authorize]
        public async Task<IActionResult> GetAllLocations()
        {
            var locations = await _context.Locations.ToListAsync();
            var oneHourAgo = DateTime.Now.AddHours(-1);

            //  fetch ALL recent reports in ONE query
            var reports = await _context.Reports
                .Where(r => r.CreatedAt >= oneHourAgo)
                .ToListAsync();

            // lastUpdated is always based on the most recent activity
            var absoluteLatestReports = await _context.Reports
                .GroupBy(r => r.LocationId)
                .Select(g => new { 
                    LocationId = g.Key, 
                    LatestDate = g.Max(r => r.CreatedAt) 
                })
                .ToDictionaryAsync(x => x.LocationId, x => x.LatestDate);

            var dtos = new List<CrowdLocationsDto>();
            
            foreach (var l in locations)
            {

                var locationReports = reports.Where(r => r.LocationId == l.Id).ToList();

                // get the most recent report timestamp, or fallback to Location's LastUpdated
                var latestReportTime = locationReports.Any() 
                    ? locationReports.Max(r => r.CreatedAt) 
                    : l.LastUpdated;

                // filter reports per location + normalize + remove nulls
                var votes = reports
                    .Where(r => r.LocationId == l.Id && !string.IsNullOrEmpty(r.SelectedLevel))
                    .Select(r => NormalizeLevel(r.SelectedLevel))
                    .ToList();

                var finalDensity = ComputeDensity(votes);

                // check absolute latest report from the dictionary
                DateTime displayTime = absoluteLatestReports.TryGetValue(l.Id, out var reportTime) 
                    ? reportTime 
                    : l.LastUpdated;

                var voteCounts = votes
                        .GroupBy(v => v)
                        .ToDictionary(g => g.Key, g => g.Count());

                dtos.Add(new CrowdLocationsDto
                {
                    id = l.Id,
                    name = l.LocationName,
                    type = l.Type,
                    pos = new List<double> { l.Latitude, l.Longitude },
                    density = finalDensity,
                    lastUpdated = CrowdDensityHelper.GetTimestampLabel(displayTime),
                    votes = new Dictionary<string, int>
                    {
                        { "Very Low", voteCounts.GetValueOrDefault("Very Low", 0) },
                        { "Low", voteCounts.GetValueOrDefault("Low", 0) },
                        { "Medium", voteCounts.GetValueOrDefault("Medium", 0) },
                        { "High", voteCounts.GetValueOrDefault("High", 0) },
                        { "Very High", voteCounts.GetValueOrDefault("Very High", 0) }
                    }
                });
            }

            return Ok(dtos);
        }

        //  GET SINGLE LOCATION
        [HttpGet("location/{id}")]
        [Authorize]
        public async Task<IActionResult> GetLocationCrowdLevel(int id)
        {
            try
            {
                var location = await _context.Locations
                    .FirstOrDefaultAsync(l => l.Id == id);

                if (location == null)
                    return NotFound($"Location with ID {id} not found.");

                var oneHourAgo = DateTime.Now.AddHours(-1);

                var votes = await _context.Reports
                    .Where(r => r.LocationId == id
                             && r.CreatedAt >= oneHourAgo
                             && !string.IsNullOrEmpty(r.SelectedLevel))
                    .Select(r => NormalizeLevel(r.SelectedLevel))
                    .ToListAsync();

                var finalDensity = ComputeDensity(votes);

                var response = new CrowdLocationsDto
                {
                    id = location.Id,
                    name = location.LocationName,
                    type = location.Type,
                    pos = new List<double> { location.Latitude, location.Longitude },

                    userCount = location.UserCount,
                    capacity = location.Capacity,
                    occupancyRate = Math.Round(location.OccupancyRate, 1),

                    //  NOW CONSISTENT with map
                    density = finalDensity,

                    lastUpdated = CrowdDensityHelper.GetTimestampLabel(location.LastUpdated)
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Server Error",
                    error = ex.Message
                });
            }
        }

        //  GET RECENT REPORTS (last 30 minutes, max 20)
        [HttpGet("recent-reports")]
        [Authorize]
        public async Task<IActionResult> GetRecentReports()
        {
            var thirtyMinutesAgo = DateTime.Now.AddMinutes(-30);

            var reports = await _context.Reports
                .Where(r => r.CreatedAt >= thirtyMinutesAgo && !string.IsNullOrEmpty(r.SelectedLevel))
                .OrderByDescending(r => r.CreatedAt)
                .Take(20)
                .ToListAsync();

            var locationIds = reports.Select(r => r.LocationId).Distinct().ToList();

            var locationNames = await _context.Locations
                .Where(l => locationIds.Contains(l.Id))
                .ToDictionaryAsync(l => l.Id, l => l.LocationName);

            var result = reports.Select(r => new
            {
                locationId = r.LocationId,
                locationName = locationNames.GetValueOrDefault(r.LocationId, "Unknown"),
                densityLevel = NormalizeLevel(r.SelectedLevel),
                reportedAt = r.CreatedAt.ToString("o") // ISO 8601 for easy JS parsing
            });

            return Ok(result);
        }

        //  SUBMIT REPORT
        [HttpPost("report")]
        [Authorize]
        public async Task<IActionResult> SubmitReport([FromBody] ReportRequestDto reportRequest)
        {   
            if (reportRequest.Latitude == 0 || reportRequest.Longitude == 0)
            {
                return BadRequest("Invalid location data.");
            }
            
            if (reportRequest == null)
                return BadRequest("Invalid report data.");

            var userId = User.Identity?.Name;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("Invalid user identity.");

            // get location from db
            var location = await _context.Locations.
            FirstOrDefaultAsync(l => l.Id == reportRequest.LocationId);
            if (location == null)
                return NotFound($"Location with ID {reportRequest.LocationId} not found.");

            // calculate distance
            var distance = CalculateDistance(
                reportRequest.Latitude, 
                reportRequest.Longitude, 
                location.Latitude, 
                location.Longitude);
            
            // allowed radius is 100m
            const double MAX_DISTANCE_METERS = 100;

            if (distance > MAX_DISTANCE_METERS)
            {
                return BadRequest($"You must be within {MAX_DISTANCE_METERS} meters to report. Current distance: {Math.Round(distance)}m");
            }

            // cooldown check
            var cooldownPeriod = DateTime.Now.AddMinutes(-15);

            bool hasRecentVote = await _context.Reports
                .AnyAsync(r =>
                    r.LocationId == reportRequest.LocationId &&
                    r.UserId == userId &&
                    r.CreatedAt >= cooldownPeriod);

            if (hasRecentVote)
            {
                return BadRequest("You have already reported for this location within the last 15 minutes.");
            }

            var newReport = new Report
            {
                LocationId = reportRequest.LocationId,
                SelectedLevel = NormalizeLevel(reportRequest.SelectedLevel),
                UserId = userId,
                CreatedAt = DateTime.Now
            };

            _context.Reports.Add(newReport);
            await _context.SaveChangesAsync();

            Console.WriteLine($"User coords: {reportRequest.Latitude}, {reportRequest.Longitude}");
            Console.WriteLine($"Location coords: {location.Latitude}, {location.Longitude}");
            Console.WriteLine($"Distance: {distance}");

            return Ok(new { message = "Crowd level reported successfully." });
        }
    }
}