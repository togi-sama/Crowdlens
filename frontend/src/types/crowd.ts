// Define specific union types for better IDE autocompletion
export type density = "Very High" | "High" | "Medium" | "Low" | "Very Low";

// used in ReportModals as options
export const Options = [
  { level: "Very Low", desc: "Plenty of space, no waiting time." },
  { level: "Low", desc: "A few people around, very comfortable." },
  { level: "Medium", desc: "Moderate crowd, some waiting may occur." },
  { level: "High", desc: "Crowded, limited seating and longer waits." },
  { level: "Very High", desc: "Extremely packed, avoid if possible." },
];

const liveInsightDescriptions: Record<string, Record<density, string>> = {
  "Public Library": {
    "Very Low": "Almost all seats available. Quiet and comfortable — great time to visit.",
    "Low":      "Most seats are free. Very comfortable for studying or reading.",
    "Medium":   "Some seats taken, but you should still find a spot. Moderate noise level expected.",
    "High":     "Seats are filling up fast. Limited seating available — consider visiting later.",
    "Very High":"Fully packed. Seating is unavailable — avoid if possible.",
  },
  "Hospital": {
    "Very Low": "Minimal patients in queue. Expected outpatient wait time is very short (under 15 mins).",
    "Low":      "Short queue. Expect to wait approximately 15–30 minutes.",
    "Medium":   "Moderate queue. Estimated outpatient wait time is 30–60 minutes.",
    "High":     "Long queue. Expect to wait over 1 hour. Consider scheduling ahead.",
    "Very High":"Extremely long queue. Wait times may exceed 2 hours — plan accordingly.",
  },
  "Public Square": {
    "Very Low": "Plenty of open space. Very few people around — very comfortable.",
    "Low":      "Mostly open. Comfortable with plenty of room to move freely.",
    "Medium":   "Moderate crowd. Some spaces available with a bit more activity.",
    "High":     "Getting crowded. Limited open space — expect some congestion.",
    "Very High":"Extremely packed. Very limited space available — avoid if possible.",
  },
  "Restaurant": {
    "Very Low": "Plenty of tables available. No waiting time expected.",
    "Low":      "Most tables open. Expect to be seated right away.",
    "Medium":   "Moderate occupancy. Short wait for a table (around 5–10 minutes).",
    "High":     "Filling up fast. Expect a wait time of 15–30 minutes for seating.",
    "Very High":"Fully booked. Long wait times or no seating available.",
  },
};

const defaultInsights: Record<density, string> = {
  "Very Low": "Very few people. Excellent time to visit.",
  "Low":      "Light crowd. Comfortable conditions.",
  "Medium":   "Moderate crowd. Some wait time may be expected.",
  "High":     "Crowded. Expect limited availability and longer wait times.",
  "Very High":"Extremely packed. Consider visiting at a different time.",
};

export function getLiveInsight(type: string, density: density): string {
  return (liveInsightDescriptions[type] ?? defaultInsights)[density];
}

// used
export interface CrowdLocation {
  id: number;
  name: string;
  type: string; // e.g., "Public Library", "Hospital"
  pos: [number, number]; // [latitude, longitude]
  density: density;
  lastUpdated: string;
  votes: {
    "Very Low": number;
    "Low": number;
    "Medium": number;
    "High": number;
    "Very High": number;
  };
  alertThreshold?: string; // only present on favorites responses
}

// used in ReportModal.tsx
export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  onSubmit: (level: string) => void;
}