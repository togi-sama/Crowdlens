namespace Crowdlens_backend.Models
{
    public class Location
    {
        public int Id { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string Type { get; set; } = "Public Space"; // Added to match frontend 'type'
        
        public int UserCount { get; set; }
        public int Capacity { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.Now;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int VotesVeryLow { get; set; } = 0;
        public int VotesLow { get; set; } = 0;
        public int VotesMedium { get; set; } = 0;
        public int VotesHigh { get; set; } = 0;
        public int VotesVeryHigh { get; set; } = 0;
        public double OccupancyRate => Capacity > 0 ? (double)UserCount / Capacity * 100 : 0;
    }
}