namespace Crowdlens_backend.Models
{
    public class Favorite
    {
        public int Id { get; set; }
        public string UserId { get; set; } = "";     // FK → AspNetUsers.Id
        public int LocationId { get; set; }           // FK → Locations.Id
        public DateTime AddedAt { get; set; } = DateTime.Now;

        // "None" | "Very Low" | "Low" | "Medium"
        public string AlertThreshold { get; set; } = "Low";

        public Location? Location { get; set; }
    }
}
