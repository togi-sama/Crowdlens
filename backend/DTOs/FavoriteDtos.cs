namespace Crowdlens_backend.DTOs
{
    public class AddFavoriteDto
    {
        // "None" | "Very Low" | "Low" | "Medium"
        public string AlertThreshold { get; set; } = "Low";
    }

    public class UpdateThresholdDto
    {
        public string AlertThreshold { get; set; } = "Low";
    }

    public class AlertedLocationDto
    {
        public int locationId { get; set; }
        public string locationName { get; set; } = "";
        public string locationType { get; set; } = "";
        public string currentDensity { get; set; } = "";
        public string alertThreshold { get; set; } = "";
    }
}
