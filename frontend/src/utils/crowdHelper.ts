// src/utils/crowdHelpers.ts
import L from "leaflet";

// used in UserHome.tsx
export const createPulseIcon = (color: string) => {
  return L.divIcon({
    html: `<div class="pulse-marker" style="background-color: ${color};"></div>`,
    className: 'custom-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Used in UserHome.tsx
export const getIconByDensity = (densityLevel: string) => {
  if (densityLevel === "Very High") return createPulseIcon("#6c1313");
  if (densityLevel === "High") return createPulseIcon("#d32f2f");
  if (densityLevel === "Medium") return createPulseIcon("#f57c00");
  if (densityLevel === "Low") return createPulseIcon("#15803d");
  if (densityLevel === "Very Low") return createPulseIcon("#84cc16");
  return createPulseIcon("#64748b");
};

// used in UserHome.tsx
export const densityClasses: Record<string, string> = {
  "Very High": "very-high",
  "High": "high",
  "Medium": "moderate",
  "Low": "low",
  "Very Low": "very-low"
};

// Haversine distance between two [lat, lng] pairs, returns metres
export const getDistance = (a: [number, number], b: [number, number]): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
};

export const densityRank: Record<string, number> = {
  "Very Low": 1,
  "Low": 2,
  "Medium": 3,
  "High": 4,
  "Very High": 5,
};

export const getWaitTime = (density: string) => {
  switch (density) {
    case "Very High": return "30+ minutes";
    case "High": return "15-25 minutes";
    case "Medium": return "5-10 minutes";
    default: return "less than 5 minutes";
  }
};