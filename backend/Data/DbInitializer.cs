using System;
using System.Collections.Generic;
using System.Linq;
using CrowdLens.Data;
using Crowdlens_backend.Models;
using Microsoft.EntityFrameworkCore;

public static class DbInitializer
{
    public static void Seed(CrowdLensDbContext context)
    {
        context.Database.EnsureCreated();

        // --- Ensure ForecastRecords table exists for databases created before this feature ---
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""ForecastRecords"" (
                ""Id""           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                ""LocationId""   INTEGER NOT NULL,
                ""RecordedAt""   TEXT    NOT NULL,
                ""DensityScore"" INTEGER NOT NULL,
                ""DensityLevel"" TEXT    NOT NULL
            )
        ");

        // --- Seed locations ---
        var locations = new List<Location>
        {
            new Location
            {
                LocationName = "Cebu City Public Library",
                Type = "Public Library",
                Capacity = 300,
                UserCount = 150,
                Latitude = 10.3095,
                Longitude = 123.8931,
                LastUpdated = DateTime.Now,
                VotesVeryLow = 2, VotesLow = 5, VotesMedium = 15, VotesHigh = 3, VotesVeryHigh = 0,
            },
            new Location
            {
                LocationName = "Vicente Sotto Medical Center",
                Type = "Hospital",
                Capacity = 1000,
                UserCount = 850,
                Latitude = 10.3117,
                Longitude = 123.8915,
                LastUpdated = DateTime.Now,
                VotesVeryLow = 0, VotesLow = 1, VotesMedium = 4, VotesHigh = 20, VotesVeryHigh = 25,
            },
            new Location
            {
                LocationName = "Fuente Osmeña Circle",
                Type = "Public Square",
                Capacity = 500,
                UserCount = 50,
                Latitude = 10.3111,
                Longitude = 123.8941,
                LastUpdated = DateTime.Now,
                VotesVeryLow = 10, VotesLow = 15, VotesMedium = 2, VotesHigh = 0, VotesVeryHigh = 0,
            },
            new Location
            {
                LocationName = "Eversley Childs Sanitarium and General Hospital",
                Type = "Hospital",
                Capacity = 1000,
                UserCount = 850,
                Latitude = 10.361734,
                Longitude = 123.954351,
                LastUpdated = DateTime.Now,
                VotesVeryLow = 13, VotesLow = 16, VotesMedium = 8, VotesHigh = 0, VotesVeryHigh = 0,
            },
            new Location
            {
                LocationName = "University of the Philippines Cebu Library",
                Type = "Public Library",
                Capacity = 300,
                UserCount = 150,
                Latitude = 10.3223,
                Longitude = 123.8982,
                LastUpdated = DateTime.Now,
                VotesVeryLow = 5, VotesLow = 10, VotesMedium = 15, VotesHigh = 20, VotesVeryHigh = 25,
            },
        };

        foreach (var location in locations)
        {
            if (!context.Locations.Any(l => l.LocationName == location.LocationName))
                context.Locations.Add(location);
        }
        context.SaveChanges();

        // --- Seed 90 days of historical forecast records ---
        if (!context.ForecastRecords.Any())
        {
            SeedForecastRecords(context);
        }
    }

    // -----------------------------------------------------------------------
    //  MOCK DATA GENERATION
    //  Pattern logic per location type:
    //
    //  Hospital       — moderate baseline 24/7; clear afternoon peak (Very High 14-17h)
    //  Public Library — closed early/late; midday peak on weekdays, lighter weekend
    //  Public Square  — quiet weekdays, busy Friday evening + all-day Saturday
    //
    //  Noise model: Box-Muller Gaussian (stddev ≈ 0.8) so every score level
    //  appears near boundary hours and training data is never flat.
    //  Day-level shifts and random event days add further week-to-week variance.
    // -----------------------------------------------------------------------
    private static void SeedForecastRecords(CrowdLensDbContext context)
    {
        var locations = context.Locations.ToList();
        var records   = new List<ForecastRecord>();
        var rng       = new Random(42); // fixed seed → reproducible patterns
        var now       = DateTime.Now;

        foreach (var location in locations)
        {
            for (int daysAgo = 90; daysAgo >= 1; daysAgo--)
            {
                var date      = now.AddDays(-daysAgo).Date;
                bool isWeekend = date.DayOfWeek == DayOfWeek.Saturday
                              || date.DayOfWeek == DayOfWeek.Sunday;

                // Per-day random shift (±1 on ~25% of days) — simulates busier/quieter days
                int dayShift = rng.NextDouble() < 0.25
                    ? (rng.Next(2) == 0 ? 1 : -1)
                    : 0;

                // Event day (7% chance): crowd bumped up by 1–2 all day
                int eventBump = rng.NextDouble() < 0.07 ? rng.Next(1, 3) : 0;

                for (int hour = 0; hour < 24; hour++)
                {
                    int baseScore = GetBaseScore(location.Type, location.LocationName, hour, isWeekend);

                    // Box-Muller Gaussian noise (stddev ≈ 0.8)
                    double u1 = 1.0 - rng.NextDouble();
                    double u2 = 1.0 - rng.NextDouble();
                    double gaussian = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
                    int noise = (int)Math.Round(gaussian * 0.8);

                    int score = Math.Clamp(baseScore + noise + dayShift + eventBump, 1, 5);

                    records.Add(new ForecastRecord
                    {
                        LocationId   = location.Id,
                        RecordedAt   = date.AddHours(hour),
                        DensityScore = score,
                        DensityLevel = ScoreToLevel(score)
                    });
                }
            }
        }

        context.ForecastRecords.AddRange(records);
        context.SaveChanges();
    }

    /// <summary>
    /// Returns a base density score (1–5) for a location type at a given hour.
    /// These patterns mimic real-world busyness observed in Cebu City.
    /// </summary>
    private static int GetBaseScore(string locationType, string locationName, int hour, bool isWeekend)
    {
        return locationType switch
        {
            "Hospital"       => GetHospitalScore(hour),
            "Public Library" => locationName == "Cebu City Public Library"
                                    ? GetCCPLScore(hour)              // 24/7
                                    : GetUPLibraryScore(hour, isWeekend), // 8 AM – 6 PM
            "Public Square"  => GetPublicSquareScore(hour, isWeekend),
            _                => GetPublicSquareScore(hour, isWeekend)
        };
    }

    // Hospitals always have ER/staff activity — overnight minimum is Low, not Very Low
    private static int GetHospitalScore(int hour) => hour switch
    {
        >= 0  and < 5  => 2, // Low — overnight minimum (ER, night shift)
        >= 5  and < 7  => 3, // Medium — early arrivals, shift change
        >= 7  and < 10 => 3, // Medium — morning rush
        >= 10 and < 14 => 4, // High — busy midday
        >= 14 and < 18 => 5, // Very High — afternoon peak
        >= 18 and < 20 => 3, // Medium — evening transition
        _              => 2  // Low — late night
    };

    // UP Cebu Library — open 8 AM to 6 PM only; closed outside those hours
    private static int GetUPLibraryScore(int hour, bool isWeekend)
    {
        if (isWeekend)
        {
            return hour switch
            {
                >= 0  and < 9  => 1, // closed
                >= 9  and < 11 => 2, // Low
                >= 11 and < 14 => 3, // Medium
                >= 14 and < 17 => 3, // Medium
                >= 17 and < 18 => 2, // Low — closing
                _              => 1  // closed (after 6 PM)
            };
        }
        else
        {
            return hour switch
            {
                >= 0  and < 8  => 1, // closed
                >= 8  and < 10 => 2, // Low — morning opening
                >= 10 and < 14 => 4, // High — peak midday
                >= 14 and < 17 => 3, // Medium — afternoon
                >= 17 and < 18 => 2, // Low — closing hour
                _              => 1  // closed (after 6 PM)
            };
        }
    }

    // Cebu City Public Library — open 24/7; overnight staff/readers keep it from ever hitting 1
    private static int GetCCPLScore(int hour) => hour switch
    {
        >= 0  and < 6  => 1, // Very Low — late night
        >= 6  and < 8  => 2, // Low — early risers
        >= 8  and < 10 => 3, // Medium — morning rush
        >= 10 and < 18 => 4, // High — peak operating hours
        >= 18 and < 21 => 3, // Medium — evening readers
        >= 21 and < 23 => 2, // Low — winding down
        _              => 1  // Very Low — midnight
    };

    // Public squares: quiet on weekdays; busy Friday evening + all-day Saturday
    private static int GetPublicSquareScore(int hour, bool isWeekend)
    {
        if (isWeekend)
        {
            return hour switch
            {
                >= 0  and < 6  => 1, // Very Low
                >= 6  and < 9  => 2, // Low — morning joggers
                >= 9  and < 12 => 3, // Medium
                >= 12 and < 18 => 4, // High — peak weekend activity
                >= 18 and < 21 => 3, // Medium — evening
                _              => 2  // Low
            };
        }
        else
        {
            return hour switch
            {
                >= 0  and < 6  => 1, // Very Low
                >= 6  and < 8  => 2, // Low — morning commuters
                >= 8  and < 11 => 1, // Very Low
                >= 11 and < 14 => 2, // Low — lunch
                >= 14 and < 17 => 1, // Very Low
                >= 17 and < 20 => 3, // Medium — after-work crowd
                _              => 1  // Very Low
            };
        }
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
