namespace Crowdlens_backend.DTOs
{
    public class ForecastSlotDto
    {
        public string Hour { get; set; } = "";          // "14:00" display label
        public string IsoTime { get; set; } = "";       // ISO 8601 for frontend parsing
        public int DensityScore { get; set; }           // 1–5
        public string DensityLevel { get; set; } = "";  // "Very Low" ... "Very High"
        public int ConfidencePct { get; set; }          // 0–100
        public bool LowDataWarning { get; set; }        // true when fewer than 3 matching samples
    }

    public class ForecastAlternativeDto
    {
        public int LocationId { get; set; }
        public string LocationName { get; set; } = "";
        public int PeakDensityScore { get; set; }
        public string PeakDensityLevel { get; set; } = "";
    }

    public class ForecastResponseDto
    {
        public int LocationId { get; set; }
        public string LocationName { get; set; } = "";
        public List<ForecastSlotDto> Forecast { get; set; } = new();
        public ForecastAlternativeDto? SuggestedAlternative { get; set; }
        public bool ForecastUnavailable { get; set; }
        /// <summary>"lstm" when the Python model answered; "statistical" when using the fallback.</summary>
        public string ModelType { get; set; } = "statistical";
    }
}
