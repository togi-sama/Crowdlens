// src/pages/UserHome.tsx
import { MapContainer, TileLayer, Marker, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./UserHome.css";
import "../components/Home/CustomPopup.css";
import { useState, useEffect, useRef } from "react";
import { densityClasses, getIconByDensity } from "../utils/crowdHelper";
import ReportModal from "../components/Home/ReportModal";
import ReportsList from "../components/Home/ReportsList";
import BottomNav from "../components/BottomNav";
import ThresholdPicker, { type Threshold } from "../components/ThresholdPicker";
import AlertModal from "../components/AlertModal";
import { toastSuccess, toastError, toastWarning } from "../components/Toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  TrendingUp,
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  BarChart2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { CrowdLocation, density } from "../types/crowd";
import { getLiveInsight } from "../types/crowd";
import {
  submitCrowdReport,
  getLocations,
  getForecast,
  getRecentReports,
  addFavorite,
  removeFavorite,
  getFavorites,
  type RecentReport,
} from "../api/crowdService";
import ConfirmReportModal from "../components/Home/ConfirmReportModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DENSITY_SCORE: Record<density, number> = {
  "Very Low": 1, "Low": 2, "Medium": 3, "High": 4, "Very High": 5,
};

function avgDensityLabel(locations: CrowdLocation[]): string {
  if (locations.length === 0) return "—";
  const avg = locations.reduce((sum, l) => sum + DENSITY_SCORE[l.density], 0) / locations.length;
  if (avg <= 1.5) return "Very Low";
  if (avg <= 2.5) return "Low";
  if (avg <= 3.5) return "Medium";
  if (avg <= 4.5) return "High";
  return "Very High";
}

function parseUtc(isoStr: string): Date {
  return new Date(/[Z+\-]\d*$/.test(isoStr) ? isoStr : isoStr + 'Z');
}

function timeAgo(isoStr: string): string {
  const mins = Math.floor((Date.now() - parseUtc(isoStr).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} hr ago`;
}

const DENSITY_COLOR: Record<string, string> = {
  "Very High": "#b71c1c",
  "High":      "#e17055",
  "Medium":    "#fdcb6e",
  "Low":       "#30924C",
  "Very Low":  "#84cc16",
};

// ── Forecast mini-chart ───────────────────────────────────────────────────────

interface ForecastSlot { densityScore: number; isoTime: string; }

function Sparkline({ slots, modelType }: { slots: ForecastSlot[]; modelType: string }) {
  const W = 168, H = 40, PAD = 6;
  const n = slots.length;
  if (n < 2) return null;

  const scoreColors: Record<number, string> = {
    1: "#4caf50", 2: "#8bc34a", 3: "#ff9800", 4: "#f44336", 5: "#b71c1c",
  };
  const pts = slots.map((s, i) => ({
    x: PAD + (i / (n - 1)) * (W - PAD * 2),
    y: PAD + ((5 - s.densityScore) / 4) * (H - PAD * 2),
    score: s.densityScore,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const peakScore = Math.max(...slots.map(s => s.densityScore));
  const lineColor = scoreColors[peakScore] ?? "#30924C";
  const isLSTM = modelType === "lstm";

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 10, color: "#888", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600 }}>
        Predicted Trend
        <span style={{
          marginLeft: 6, padding: "1px 6px", borderRadius: 10, fontSize: 9, fontWeight: 700,
          background: isLSTM ? "#e8eaf6" : "#e0f2f1",
          color: isLSTM ? "#3949ab" : "#00695c",
        }}>
          {isLSTM ? "⚡ LSTM" : "📊 Statistical"}
        </span>
      </p>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth={1.8}
                  strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5}
                  fill={scoreColors[p.score] ?? "#999"} stroke="white" strokeWidth={1} />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        {slots.map((s, i) => {
          const h = new Date(s.isoTime).getHours();
          return (
            <span key={i} style={{ fontSize: 9, color: "#aaa", width: `${100 / n}%`, textAlign: "center" }}>
              {h % 12 === 0 ? 12 : h % 12}{h >= 12 ? "p" : "a"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Map helpers ───────────────────────────────────────────────────────────────

function RecenterAutomatically({ location }: { location: CrowdLocation }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(location.pos, 18, { animate: true, duration: 0.7 });
  }, [location, map]);
  return null;
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
    const handler = () => onZoomChange(map.getZoom());
    map.on("zoomend", handler);
    return () => { map.off("zoomend", handler); };
  }, [map, onZoomChange]);
  return null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

interface DashboardSectionProps {
  locations: CrowdLocation[];
}

function DashboardSection({ locations }: DashboardSectionProps) {
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    getRecentReports()
      .then(setRecentReports)
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, []);

  // Compute stats from live locations data
  const alertCount = locations.filter(l => l.density === "High" || l.density === "Very High").length;
  const avgLevel   = avgDensityLabel(locations);
  const total      = locations.length || 1;
  const lowCount   = locations.filter(l => l.density === "Very Low" || l.density === "Low").length;
  const midCount   = locations.filter(l => l.density === "Medium").length;
  const highCount  = locations.filter(l => l.density === "High" || l.density === "Very High").length;

  const analyticsCards = [
    {
      label: "Active Crowd Alerts",
      value: String(alertCount),
      change: alertCount > 0 ? "Needs attention" : "All clear",
      trend: alertCount > 0 ? "up" : "neutral",
      icon: <AlertTriangle size={18} />,
      color: "#e17055",
    },
    {
      label: "Avg. Crowd Level",
      value: avgLevel,
      change: "Live",
      trend: "neutral",
      icon: <Users size={18} />,
      color: "#0984e3",
    },
    {
      label: "Locations Tracked",
      value: String(locations.length),
      change: "Live",
      trend: "neutral",
      icon: <MapPin size={18} />,
      color: "#6c5ce7",
    },
    {
      label: "Recent Reports",
      value: reportsLoading ? "…" : String(recentReports.length),
      change: "Last 30 min",
      trend: "neutral",
      icon: <Activity size={18} />,
      color: "#30924C",
    },
  ];

  const densityBar = [
    { label: "Low",    pct: Math.round((lowCount  / total) * 100), color: "#30924C" },
    { label: "Medium", pct: Math.round((midCount  / total) * 100), color: "#fdcb6e" },
    { label: "High",   pct: Math.round((highCount / total) * 100), color: "#e17055" },
  ];

  return (
    <div className="dashboard-view">
      {/* Analytics Cards */}
      <div className="analytics-grid">
        {analyticsCards.map((card) => (
          <div className="analytics-card" key={card.label}>
            <div className="analytics-card-top">
              <span className="analytics-icon" style={{ color: card.color, background: `${card.color}18` }}>
                {card.icon}
              </span>
              <span className={`analytics-change ${card.trend}`}>
                {card.trend === "up"   && <ArrowUpRight size={12} />}
                {card.trend === "down" && <ArrowDownRight size={12} />}
                {card.change}
              </span>
            </div>
            <strong className="analytics-value">{card.value}</strong>
            <span className="analytics-label">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Crowd Distribution — derived from live locations */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <BarChart2 size={16} color="#30924C" />
            <h3>Crowd Distribution</h3>
          </div>
          <span className="dashboard-card-subtitle">Current snapshot · {locations.length} locations</span>
        </div>
        <div className="density-bars">
          {densityBar.map((bar) => (
            <div className="density-bar-row" key={bar.label}>
              <span className="density-bar-label">{bar.label}</span>
              <div className="density-bar-track">
                <div className="density-bar-fill" style={{ width: `${bar.pct}%`, background: bar.color }} />
              </div>
              <span className="density-bar-pct">{bar.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Hours — visual placeholder until backend aggregation endpoint is available */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <TrendingUp size={16} color="#30924C" />
            <h3>Peak Hours</h3>
          </div>
          <span className="dashboard-card-subtitle">Today</span>
        </div>
        <div className="peak-hours-chart">
          {["6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm"].map((label, i) => {
            const heights = [20, 55, 40, 80, 65, 90, 70, 35];
            const isActive = i === 5;
            return (
              <div className="peak-bar-col" key={label}>
                <div className="peak-bar-wrap">
                  <div className={`peak-bar ${isActive ? "peak-bar-active" : ""}`} style={{ height: `${heights[i]}%` }} />
                </div>
                <span className="peak-bar-label">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Reports — from API */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <Clock size={16} color="#30924C" />
            <h3>Recent Reports</h3>
          </div>
          <span className="dashboard-card-subtitle">Last 30 min</span>
        </div>
        <div className="activity-list">
          {reportsLoading && (
            <p className="dashboard-loading">Loading reports…</p>
          )}
          {!reportsLoading && recentReports.length === 0 && (
            <p className="dashboard-empty">No recent reports.</p>
          )}
          {recentReports.map((item, i) => {
            const color = DENSITY_COLOR[item.densityLevel] ?? "#30924C";
            return (
              <div className="activity-row" key={i}>
                <div className="activity-dot-col">
                  <span className="activity-dot" style={{ background: color }} />
                </div>
                <div className="activity-info">
                  <span className="activity-location">{item.locationName}</span>
                  <span className="activity-time">{timeAgo(item.reportedAt)}</span>
                </div>
                <span className="activity-level" style={{
                  color,
                  background: `${color}18`,
                }}>
                  {item.densityLevel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserHomePage() {
  const navigate = useNavigate();
  const { user, pendingAlerts, clearAlerts } = useAuth();

  const notificationsEnabled = (() => {
    if (!user?.email) return true;
    try {
      const saved = localStorage.getItem(`cl_settings_${user.email}`);
      return saved ? (JSON.parse(saved)?.notificationsEnabled ?? true) : true;
    } catch { return true; }
  })();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<CrowdLocation | null>(null);
  const [locations, setLocations] = useState<CrowdLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLevel, setPendingLevel] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"home" | "dashboard">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [reportsOpenFor, setReportsOpenFor] = useState<number | null>(null);

  // Threshold picker state: which location's popup is showing the picker
  const [pendingFavoriteId, setPendingFavoriteId] = useState<number | null>(null);
  const [pendingThreshold, setPendingThreshold] = useState<Threshold>("Low");

  const [popupForecast, setPopupForecast] = useState<{ slots: ForecastSlot[]; modelType: string } | null>(null);
  const [, setPopupForecastLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(14);

  // Load locations and saved favorites in parallel on mount
  useEffect(() => {
    Promise.all([
      getLocations(),
      getFavorites().catch(() => [] as CrowdLocation[]),
    ]).then(([locs, favs]) => {
      setLocations(locs);
      setFavoriteIds(new Set(favs.map(f => f.id)));
    }).catch(() => {
      toastError("Failed to load map data. Please refresh.");
    }).finally(() => setLoading(false));
  }, []);

  // Fetch popup forecast when a marker is clicked
  useEffect(() => {
    if (!selectedLocation) return;
    setPopupForecast(null);
    setPopupForecastLoading(true);
    getForecast(selectedLocation.id, 6)
      .then((data: any) => {
        if (!data.forecastUnavailable && data.forecast?.length) {
          setPopupForecast({ slots: data.forecast, modelType: data.modelType ?? "statistical" });
        }
      })
      .catch(() => {})
      .finally(() => setPopupForecastLoading(false));
  }, [selectedLocation?.id]);

  // Close search dropdown when clicking outside — must be before any early return
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading CrowdLens Map…</div>;
  }

  const handleInitialSelect = (level: string) => {
    setPendingLevel(level);
    setIsConfirmOpen(true);
  };

  // Clicking the bookmark on an already-favorited location removes it immediately.
  // Clicking on a new location opens the ThresholdPicker inside the popup.
  const handleBookmarkClick = (id: number) => {
    if (favoriteIds.has(id)) {
      removeFavoriteOptimistic(id);
    } else {
      setPendingFavoriteId(id);
      setPendingThreshold("Low");
    }
  };

  const removeFavoriteOptimistic = async (id: number) => {
    setFavoriteIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    try {
      await removeFavorite(id);
      toastSuccess("Removed from favorites.");
    } catch {
      setFavoriteIds(prev => new Set(prev).add(id));
      toastError("Failed to remove favorite.");
    }
  };

  const confirmAddFavorite = async (id: number, threshold: Threshold) => {
    setPendingFavoriteId(null);
    setFavoriteIds(prev => new Set(prev).add(id));
    try {
      await addFavorite(id, threshold);
      toastSuccess(`Saved! Alerts fire when crowd is "${threshold}" or below.`);
    } catch {
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      toastError("Failed to save favorite.");
    }
  };

  const handleFinalConfirm = async (remark: string) => {
    if (!selectedLocation || !pendingLevel) return;

    // Respect location sharing preference
    const locationSharingOn = (() => {
      if (!user?.email) return true;
      try {
        const saved = localStorage.getItem(`cl_settings_${user.email}`);
        return saved ? (JSON.parse(saved)?.locationEnabled ?? true) : true;
      } catch { return true; }
    })();

    if (!locationSharingOn) {
      toastError("Location sharing is disabled. Enable it in Settings to submit reports.");
      setIsConfirmOpen(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          await submitCrowdReport(selectedLocation.id, pendingLevel, lat, lng, remark || undefined);
          toastSuccess(`Reported ${pendingLevel} for ${selectedLocation.name}`);
          setIsConfirmOpen(false);
          setIsReportModalOpen(false);
          const updatedData = await getLocations();
          setLocations(updatedData);
        } catch (error: any) {
          if (error.response?.status === 400) {
            toastWarning(error.response.data);
          } else {
            toastError("Failed to submit report. Please try again.");
          }
          setIsConfirmOpen(false);
        }
      },
      () => {
        toastError("Unable to access your location. Please allow GPS access to submit a report.");
        setIsConfirmOpen(false);
      }
    );
  };

  const filteredLocations = searchQuery.trim()
    ? locations
        .filter(l =>
          l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const handleSearchSelect = (loc: CrowdLocation) => {
    setSelectedLocation(loc);
    setActiveTab("home");
    setSearchQuery("");
    setSearchOpen(false);
  };

  const center: [number, number] = [10.3223, 123.8982];
  const displayName = user?.name ? user.name.split(" ")[0] : "there";
  const popupWidth = Math.max(200, Math.min(320, (mapZoom - 10) * 30 + 160));

  return (
    <div className="user-home-page">
      <header className="home-header">
        <h1 className="welcome-title">CrowdLens</h1>
        <p className="welcome-subtitle">Welcome back, {displayName}</p>
      </header>

      <div className="tab-switcher">
        <button
          className={`tab-btn ${activeTab === "home" ? "tab-btn-active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          Home
        </button>
        <button
          className={`tab-btn ${activeTab === "dashboard" ? "tab-btn-active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
      </div>

      {/* ── HOME TAB ── */}
      {activeTab === "home" && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Active Alerts</span>
              <strong>
                {locations.filter(l => l.density === "High" || l.density === "Very High").length} Areas
              </strong>
            </div>
            <div className="stat-card">
              <span>Locations</span>
              <strong>{locations.length} Tracked</strong>
            </div>
          </div>

          <button className="forecast-link-btn" onClick={() => navigate("/forecast")}>
            View Forecast
          </button>

          {/* Location search bar */}
          <div className="location-search" ref={searchRef}>
            <div className="location-search-input-wrapper">
              <span className="location-search-icon">🔍</span>
              <input
                className="location-search-input"
                type="text"
                placeholder="Search locations…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchQuery && (
                <button className="location-search-clear" onClick={() => { setSearchQuery(""); setSearchOpen(false); }}>
                  ✕
                </button>
              )}
            </div>
            {searchOpen && filteredLocations.length > 0 && (
              <ul className="location-search-results">
                {filteredLocations.map(loc => (
                  <li key={loc.id} className="location-search-item" onClick={() => handleSearchSelect(loc)}>
                    <span className="lsi-dot" style={{ color: DENSITY_COLOR[loc.density] }}>●</span>
                    <div className="lsi-info">
                      <span className="lsi-name">{loc.name}</span>
                      <span className="lsi-type">{loc.type}</span>
                    </div>
                    <span className="lsi-density" style={{ color: DENSITY_COLOR[loc.density] }}>
                      {loc.density}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {searchOpen && searchQuery.trim() && filteredLocations.length === 0 && (
              <div className="location-search-empty">No locations found</div>
            )}
          </div>

          <main className="map-section">
            <MapContainer center={center} zoom={14} className="main-map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />
              <ZoomTracker onZoomChange={setMapZoom} />
              {selectedLocation && <RecenterAutomatically location={selectedLocation} />}
              {locations.map((location) => (
                <Marker
                  key={location.id}
                  position={location.pos as [number, number]}
                  icon={getIconByDensity(location.density)}
                  eventHandlers={{ click: () => setSelectedLocation(location) }}
                >
                  <Popup className="custom-popup" maxWidth={popupWidth}>
                    <div className="popup-container">
                      <div className="popup-header">
                        <div className="badge-wrapper">
                          <p style={{ fontSize: "12px", color: "#30924C", fontWeight: "bold", margin: "0 0 4px 0", textTransform: "uppercase" }}>
                            {location.type}
                          </p>
                          <button
                            className="save-link-btn"
                            aria-label={favoriteIds.has(location.id) ? "Remove from favorites" : "Save to favorites"}
                            onClick={(e) => { e.stopPropagation(); handleBookmarkClick(location.id); }}
                          >
                            <img
                              src={favoriteIds.has(location.id) ? "/Favorites Selected.png" : "/Favorites.png"}
                              alt=""
                              style={{ width: 20, height: 20, objectFit: "contain" }}
                            />
                          </button>
                        </div>
                        <div className="title-row">
                          <h2>{location.name}</h2>
                        </div>
                        <div className="status-row">
                          <div className="badge-wrapper">
                            <span className={`badge ${densityClasses[location.density]}`}>
                              ● {location.density} Crowd Level
                            </span>
                            <span className="updated-text">{location.lastUpdated}</span>
                          </div>
                        </div>
                      </div>
                      <div className="congestion-info">
                        <h3>Live Insights</h3>
                        <p>{getLiveInsight(location.type, location.density)}</p>
                      </div>
                      {popupForecast && selectedLocation?.id === location.id && (
                        <Sparkline slots={popupForecast.slots} modelType={popupForecast.modelType} />
                      )}

                      {/* Threshold picker — shown only when user is adding this location */}
                      {pendingFavoriteId === location.id && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ThresholdPicker
                            value={pendingThreshold}
                            onChange={setPendingThreshold}
                          />
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <button
                              className="input-btn"
                              style={{ flex: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmAddFavorite(location.id, pendingThreshold);
                              }}
                            >
                              Save to Favorites
                            </button>
                            <button
                              className="input-btn"
                              style={{ flex: 0, background: "#b2bec3", minWidth: 64 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingFavoriteId(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {pendingFavoriteId !== location.id && (
                        <>
                          <button
                            className="input-btn"
                            onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(true); }}
                          >
                            <span>+</span> Input Crowd Level
                          </button>

                          <button
                            className="reports-toggle-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportsOpenFor(prev => prev === location.id ? null : location.id);
                            }}
                          >
                            {reportsOpenFor === location.id ? "▲ Hide reports" : "▼ View reports"}
                          </button>

                          {reportsOpenFor === location.id && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <ReportsList locationId={location.id} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </main>
        </>
      )}

      {/* ── DASHBOARD TAB ── */}
      {activeTab === "dashboard" && <DashboardSection locations={locations} />}

      <BottomNav />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        locationName={selectedLocation?.name || ""}
        onSubmit={handleInitialSelect}
      />
      <ConfirmReportModal
        isOpen={isConfirmOpen}
        level={pendingLevel || ""}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleFinalConfirm}
      />

      {/* Post-login crowd alerts — suppressed when notifications are off */}
      <AlertModal
        alerts={notificationsEnabled ? pendingAlerts : []}
        onDismiss={clearAlerts}
        onViewOnMap={(locationId) => {
          const loc = locations.find(l => l.id === locationId);
          if (loc) {
            setSelectedLocation(loc);
            setActiveTab("home");
          }
          clearAlerts();
        }}
      />
    </div>
  );
}
