using System.Text.Json;
using CrowdLens.Data;
using Crowdlens_backend.DTOs;
using Crowdlens_backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Crowdlens_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ForecastController : ControllerBase
    {
        private readonly CrowdLensDbContext _context;
        private readonly IHttpClientFactory _httpFactory;

        // Address of the Python LSTM microservice
        private const string LSTM_BASE = "http://localhost:8000";

        public ForecastController(CrowdLensDbContext context, IHttpClientFactory httpFactory)
        {
            _context    = context;
            _httpFactory = httpFactory;
        }

        // -----------------------------------------------------------------------
        //  GET /api/Forecast/{locationId}?hoursAhead=6
        //
        //  Priority:
        //    1. Call the Python LSTM service  → ModelType = "lstm"
        //    2. Fall back to weighted temporal-pattern model  → ModelType = "statistical"
        //    3. If both fail, return ForecastUnavailable = true
        // -----------------------------------------------------------------------
        [HttpGet("{locationId}")]
        [Authorize]
        public async Task<IActionResult> GetForecast(int locationId, [FromQuery] int hoursAhead = 6)
        {
            try
            {
                var location = await _context.Locations.FindAsync(locationId);
                if (location == null)
                    return NotFound(new { message = $"Location {locationId} not found." });

                // ── Try LSTM first ──────────────────────────────────────────────
                var lstmResult = await TryLstmForecast(locationId, hoursAhead, location.LocationName);
                if (lstmResult != null)
                    return Ok(lstmResult);

                // ── Fall back to statistical model ──────────────────────────────
                var statisticalResult = await StatisticalForecast(locationId, location.LocationName, hoursAhead);
                return Ok(statisticalResult);
            }
            catch
            {
                return Ok(new ForecastResponseDto { ForecastUnavailable = true });
            }
        }

        // -----------------------------------------------------------------------
        //  LSTM PATH — calls the Python FastAPI service
        // -----------------------------------------------------------------------
        private async Task<ForecastResponseDto?> TryLstmForecast(
            int locationId, int hoursAhead, string locationName)
        {
            try
            {
                var client  = _httpFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5); // fail fast if Python isn't running

                var payload  = JsonSerializer.Serialize(new { location_id = locationId, hours_ahead = hoursAhead });
                var content  = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
                var response = await client.PostAsync($"{LSTM_BASE}/api/predict", content);

                if (!response.IsSuccessStatusCode) return null;

                var body = await response.Content.ReadAsStringAsync();
                var json = JsonDocument.Parse(body).RootElement;

                var predictions       = json.GetProperty("predictions").EnumerateArray()
                                            .Select(e => e.GetDouble()).ToList();
                var confidenceScores  = json.GetProperty("confidence_scores").EnumerateArray()
                                            .Select(e => e.GetDouble()).ToList();

                var now      = DateTime.Now;
                var forecast = new List<ForecastSlotDto>();

                for (int i = 0; i < predictions.Count; i++)
                {
                    var target = now.AddHours(i);
                    int score  = (int)Math.Round(Math.Clamp(predictions[i], 1, 5));
                    forecast.Add(new ForecastSlotDto
                    {
                        Hour           = target.ToString("HH:mm"),
                        IsoTime        = target.ToString("o"),
                        DensityScore   = score,
                        DensityLevel   = ScoreToLevel(score),
                        ConfidencePct  = (int)Math.Round(confidenceScores[i]),
                        LowDataWarning = confidenceScores[i] < 50
                    });
                }

                ForecastAlternativeDto? alternative = null;
                int peakScore = forecast.Max(f => f.DensityScore);
                if (peakScore >= 4)
                    alternative = await FindBestAlternative(locationId, now, hoursAhead, peakScore);

                return new ForecastResponseDto
                {
                    LocationId           = locationId,
                    LocationName         = locationName,
                    Forecast             = forecast,
                    SuggestedAlternative = alternative,
                    ForecastUnavailable  = false,
                    ModelType            = "lstm"
                };
            }
            catch
            {
                // Python service unavailable or returned an error → fall through
                return null;
            }
        }

        // -----------------------------------------------------------------------
        //  STATISTICAL PATH — weighted temporal-pattern average
        //
        //  Algorithm:
        //    For each future hour slot:
        //      1. Find historical ForecastRecords with same hour-of-day + day-of-week.
        //      2. Apply exponential decay weight: w = exp(−daysAgo / 14)
        //      3. Weighted mean → score 1–5.
        //      4. Variance → confidence percentage.
        // -----------------------------------------------------------------------
        private async Task<ForecastResponseDto> StatisticalForecast(
            int locationId, string locationName, int hoursAhead)
        {
            var allRecords = await _context.ForecastRecords
                .Where(r => r.LocationId == locationId)
                .ToListAsync();

            var now      = DateTime.Now;
            var forecast = new List<ForecastSlotDto>();

            for (int i = 0; i < hoursAhead; i++)
            {
                var target   = now.AddHours(i);
                var matching = allRecords
                    .Where(r => r.RecordedAt.Hour      == target.Hour
                             && r.RecordedAt.DayOfWeek == target.DayOfWeek)
                    .ToList();
                forecast.Add(ComputeSlot(target, matching, now));
            }

            ForecastAlternativeDto? alternative = null;
            int peakScore = forecast.Max(f => f.DensityScore);
            if (peakScore >= 4)
                alternative = await FindBestAlternative(locationId, now, hoursAhead, peakScore);

            return new ForecastResponseDto
            {
                LocationId           = locationId,
                LocationName         = locationName,
                Forecast             = forecast,
                SuggestedAlternative = alternative,
                ForecastUnavailable  = false,
                ModelType            = "statistical"
            };
        }

        // -----------------------------------------------------------------------
        //  SHARED HELPERS
        // -----------------------------------------------------------------------

        private static ForecastSlotDto ComputeSlot(
            DateTime target, List<ForecastRecord> matching, DateTime now)
        {
            if (!matching.Any())
                return new ForecastSlotDto
                {
                    Hour = target.ToString("HH:mm"), IsoTime = target.ToString("o"),
                    DensityScore = 2, DensityLevel = "Low",
                    ConfidencePct = 20, LowDataWarning = true
                };

            double totalWeight = 0, weightedSum = 0;
            foreach (var r in matching)
            {
                double w   = Math.Exp(-(now - r.RecordedAt).TotalDays / 14.0);
                weightedSum   += r.DensityScore * w;
                totalWeight   += w;
            }
            double mean  = weightedSum / totalWeight;
            double stdev = Math.Sqrt(matching.Average(r => Math.Pow(r.DensityScore - mean, 2)));

            int score = (int)Math.Round(Math.Clamp(mean, 1, 5));
            int conf  = Math.Max(20, Math.Min(95, 45 + matching.Count * 5) - (int)(stdev * 8));

            return new ForecastSlotDto
            {
                Hour           = target.ToString("HH:mm"),
                IsoTime        = target.ToString("o"),
                DensityScore   = score,
                DensityLevel   = ScoreToLevel(score),
                ConfidencePct  = conf,
                LowDataWarning = matching.Count < 3
            };
        }

        private async Task<ForecastAlternativeDto?> FindBestAlternative(
            int excludeId, DateTime now, int hoursAhead, int locPeakScore)
        {
            var selected = await _context.Locations.FindAsync(excludeId);
            if (selected == null) return null;

            var others = await _context.Locations
                .Where(l => l.Id != excludeId && l.Type == selected.Type)
                .ToListAsync();

            var candidates = new List<(ForecastAlternativeDto dto, double distance)>();

            foreach (var loc in others)
            {
                var recs = await _context.ForecastRecords.Where(r => r.LocationId == loc.Id).ToListAsync();
                int peak = 1;
                for (int i = 0; i < hoursAhead; i++)
                {
                    var t = now.AddHours(i);
                    var m = recs.Where(r => r.RecordedAt.Hour == t.Hour && r.RecordedAt.DayOfWeek == t.DayOfWeek).ToList();
                    int s = ComputeSlot(t, m, now).DensityScore;
                    if (s > peak) peak = s;
                }
                if (peak < locPeakScore)
                {
                    double dist = Haversine(selected.Latitude, selected.Longitude, loc.Latitude, loc.Longitude);
                    candidates.Add((new ForecastAlternativeDto
                    {
                        LocationId       = loc.Id,
                        LocationName     = loc.LocationName,
                        PeakDensityScore = peak,
                        PeakDensityLevel = ScoreToLevel(peak)
                    }, dist));
                }
            }

            if (!candidates.Any()) return null;
            return candidates.OrderBy(c => c.distance).First().dto;
        }

        private static double Haversine(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000;
            double dLat = (lat2 - lat1) * Math.PI / 180;
            double dLon = (lon2 - lon1) * Math.PI / 180;
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                     + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
                     * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static string ScoreToLevel(int score) => score switch
        {
            1 => "Very Low",
            2 => "Low",
            3 => "Medium",
            4 => "High",
            5 => "Very High",
            _ => "Unknown"
        };
    }
}
