namespace Crowdlens_backend.Models
{
    public class ForecastRecord
    {
        public int Id { get; set; }
        public int LocationId { get; set; }
        public DateTime RecordedAt { get; set; }
        public int DensityScore { get; set; }   // 1–5 (Very Low → Very High)
        public string DensityLevel { get; set; } = "";
    }
}
