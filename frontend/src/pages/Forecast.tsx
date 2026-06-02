import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ChevronLeft, MapPin, Clock, TrendingUp, AlertTriangle, CheckCircle2, Navigation2,
} from "lucide-react";
import { getLocations, getForecast } from "../api/crowdService";
import "./Forecast.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Location { id: number; name: string; type: string; }

interface ForecastSlot {
  hour: string; isoTime: string; densityScore: number;
  densityLevel: string; confidencePct: number; lowDataWarning: boolean;
}

interface ForecastAlternative {
  locationId: number; locationName: string;
  peakDensityScore: number; peakDensityLevel: string;
}

interface ForecastResponse {
  locationId: number; locationName: string; forecast: ForecastSlot[];
  suggestedAlternative: ForecastAlternative | null;
  forecastUnavailable: boolean; modelType: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCORE_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Very Low",  color: "#2e7d32", bg: "#e8f5e9" },
  2: { label: "Low",       color: "#558b2f", bg: "#f1f8e9" },
  3: { label: "Medium",    color: "#e65100", bg: "#fff3e0" },
  4: { label: "High",      color: "#c62828", bg: "#ffebee" },
  5: { label: "Very High", color: "#b71c1c", bg: "#ffcdd2" },
};

function scoreMeta(score: number) { return SCORE_META[score] ?? SCORE_META[2]; }

function peakColor(slots: ForecastSlot[]) {
  return scoreMeta(Math.max(...slots.map(s => s.densityScore))).color;
}

function formatHour(isoTime: string) {
  const d = new Date(isoTime);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "PM" : "AM"}`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const meta = scoreMeta(Math.round(payload[0].value));
  return (
    <div style={{ background: meta.bg, border: `1px solid ${meta.color}`, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
      <strong style={{ color: meta.color }}>{label}</strong><br />
      Score: <strong style={{ color: meta.color }}>{(payload[0].value as number).toFixed(1)}</strong> — {meta.label}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Forecast() {
  const navigate = useNavigate();

  const [locations, setLocations]       = useState<Location[]>([]);
  const [locLoading, setLocLoading]     = useState(true);
  const [selectedId, setSelectedId]     = useState<number | "">("");
  const [hoursAhead, setHoursAhead]     = useState(6);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    getLocations()
      .then((data: Location[]) => setLocations(data))
      .catch(() => setError("Could not load locations. Please try again."))
      .finally(() => setLocLoading(false));
  }, []);

  const handleForecast = async () => {
    if (selectedId === "") { setError("Please select a location."); return; }
    setError(null); setLoading(true); setForecastData(null);
    try {
      setForecastData(await getForecast(Number(selectedId), hoursAhead));
    } catch {
      setForecastData({ locationId: Number(selectedId), locationName: "", forecast: [],
                        suggestedAlternative: null, forecastUnavailable: true, modelType: "" });
    } finally { setLoading(false); }
  };

  const anyLowData   = forecastData?.forecast.some(s => s.lowDataWarning) ?? false;
  const hasHighPeak  = forecastData?.forecast.some(s => s.densityScore >= 4) ?? false;
  const chartData    = forecastData?.forecast.map(s => ({ hour: formatHour(s.isoTime), score: s.densityScore })) ?? [];
  const isLSTM       = forecastData?.modelType === "lstm";
  const bestSlot     = forecastData?.forecast.reduce((a, b) => a.densityScore < b.densityScore ? a : b);
  const peakSlot     = forecastData?.forecast.reduce((a, b) => a.densityScore > b.densityScore ? a : b);

  return (
    <div className="forecast-page">

      {/* ── Header ── */}
      <header className="fc-header">
        <button className="fc-back-btn" onClick={() => navigate("/home")} aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        <div className="fc-header-center">
          <span className="fc-header-title">Crowd Forecast</span>
          <span className="fc-header-sub">AI-powered predictions</span>
        </div>
        <div className="fc-header-spacer" />
      </header>

      {/* ── Controls card ── */}
      <div className="fc-card">
        <div className="fc-controls">

          {/* Location select */}
          <div className="fc-field">
            <label className="fc-label">
              <MapPin size={11} strokeWidth={2.5} /> Location
            </label>
            {locLoading
              ? <div className="fc-skeleton fc-skeleton-select" />
              : (
                <div className="fc-select-wrap">
                  <select
                    className="fc-select"
                    value={selectedId}
                    onChange={e => {
                      setSelectedId(e.target.value === "" ? "" : Number(e.target.value));
                      setForecastData(null); setError(null);
                    }}
                  >
                    <option value="">Choose a location…</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <span className="fc-select-arrow">▾</span>
                </div>
              )}
          </div>

          {/* Time period pills */}
          <div className="fc-field">
            <label className="fc-label">
              <Clock size={11} strokeWidth={2.5} /> Time period
            </label>
            <div className="fc-pills">
              {([3, 6, 12] as const).map(h => (
                <button
                  key={h}
                  className={`fc-pill ${hoursAhead === h ? "fc-pill-active" : ""}`}
                  onClick={() => { setHoursAhead(h); setForecastData(null); }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="fc-btn" onClick={handleForecast} disabled={loading || selectedId === ""}>
          {loading ? "Generating…" : "Get Forecast"}
        </button>

        {error && <p className="fc-error">{error}</p>}
      </div>

      {/* ── Empty state ── */}
      {!forecastData && !loading && !error && (
        <div className="fc-empty">
          <div className="fc-empty-icon-wrap">
            <TrendingUp size={30} color="#30924C" />
          </div>
          <p className="fc-empty-title">Ready to forecast</p>
          <p className="fc-empty-desc">
            Pick a location and time window, then tap <strong>Get Forecast</strong>.
          </p>
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div className="fc-card">
          <div className="fc-slots">
            {Array.from({ length: hoursAhead }).map((_, i) => (
              <div key={i} className="fc-slot fc-slot-skeleton" />
            ))}
          </div>
        </div>
      )}

      {/* ── Forecast unavailable ── */}
      {forecastData?.forecastUnavailable && (
        <div className="fc-card fc-unavailable">
          <span className="fc-unavailable-icon">⚠</span>
          <p>Forecast not available for this location right now.</p>
          <p className="fc-unavailable-sub">Please try again later.</p>
        </div>
      )}

      {/* ── Results ── */}
      {forecastData && !forecastData.forecastUnavailable && (
        <div className="fc-card fc-results">

          {/* Model + location row */}
          <div className="fc-model-row">
            <p className="fc-location-label">
              Next <strong>{hoursAhead}h</strong> · {forecastData.locationName}
            </p>
            <span className={`fc-model-badge ${isLSTM ? "fc-badge-lstm" : "fc-badge-stat"}`}>
              {isLSTM ? "⚡ LSTM" : "📊 Statistical"}
            </span>
          </div>

          {/* Summary: best + peak */}
          {bestSlot && peakSlot && (
            <div className="fc-summary">
              <div className="fc-summary-item">
                <CheckCircle2 size={16} color="#30924C" />
                <div className="fc-summary-text">
                  <span className="fc-summary-label">Best time</span>
                  <span className="fc-summary-val" style={{ color: scoreMeta(bestSlot.densityScore).color }}>
                    {formatHour(bestSlot.isoTime)} — {bestSlot.densityLevel}
                  </span>
                </div>
              </div>
              <div className="fc-summary-divider" />
              <div className="fc-summary-item">
                <AlertTriangle size={16} color={scoreMeta(peakSlot.densityScore).color} />
                <div className="fc-summary-text">
                  <span className="fc-summary-label">Peak crowd</span>
                  <span className="fc-summary-val" style={{ color: scoreMeta(peakSlot.densityScore).color }}>
                    {formatHour(peakSlot.isoTime)} — {peakSlot.densityLevel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Score cards */}
          <div className="fc-slots">
            {forecastData.forecast.map(slot => {
              const meta = scoreMeta(slot.densityScore);
              return (
                <div key={slot.isoTime} className="fc-slot" style={{ background: meta.bg, borderColor: meta.color }}>
                  <span className="fc-slot-hour">{formatHour(slot.isoTime)}</span>
                  <span className="fc-slot-score" style={{ color: meta.color }}>{slot.densityScore}</span>
                  <span className="fc-slot-level" style={{ color: meta.color }}>{slot.densityLevel}</span>
                  <div className="fc-slot-conf-wrap">
                    <div className="fc-slot-conf-bar">
                      <div
                        className="fc-slot-conf-fill"
                        style={{
                          width: `${slot.confidencePct}%`,
                          background: slot.confidencePct < 60 ? "#e65100" : "#30924C",
                        }}
                      />
                    </div>
                    <span className="fc-slot-conf">{slot.confidencePct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trend chart */}
          <div className="fc-chart-wrapper">
            <p className="fc-section-label">Predicted Trend</p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={peakColor(forecastData.forecast)} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={peakColor(forecastData.forecast)} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} />
                <ReferenceLine y={4} stroke="#c62828" strokeDasharray="4 3" strokeOpacity={0.5} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="score"
                  stroke={peakColor(forecastData.forecast)} strokeWidth={2.5}
                  fill="url(#densityGrad)"
                  dot={{ r: 4, fill: peakColor(forecastData.forecast), strokeWidth: 1.5, stroke: "white" }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* High congestion alert */}
          {hasHighPeak && (
            <div className="fc-alert">
              <AlertTriangle size={15} />
              <span>High congestion expected during this period.</span>
            </div>
          )}

          {/* Alternative suggestion */}
          {forecastData.suggestedAlternative && (
            <div className="fc-alternative">
              <p className="fc-section-label">
                <Navigation2 size={11} strokeWidth={2.5} /> Suggested alternative
              </p>
              <div
                className="fc-alt-card"
                style={{
                  borderColor: scoreMeta(forecastData.suggestedAlternative.peakDensityScore).color,
                  background:  scoreMeta(forecastData.suggestedAlternative.peakDensityScore).bg,
                }}
              >
                <div className="fc-alt-info">
                  <span className="fc-alt-name">{forecastData.suggestedAlternative.locationName}</span>
                  <span
                    className="fc-alt-level"
                    style={{ color: scoreMeta(forecastData.suggestedAlternative.peakDensityScore).color }}
                  >
                    Peak: {forecastData.suggestedAlternative.peakDensityLevel}{" "}
                    ({forecastData.suggestedAlternative.peakDensityScore}/5)
                  </span>
                </div>
                <ChevronLeft size={16} style={{ transform: "rotate(180deg)" }}
                  color={scoreMeta(forecastData.suggestedAlternative.peakDensityScore).color} />
              </div>
            </div>
          )}

          {/* Disclaimers */}
          {anyLowData && (
            <p className="fc-disclaimer fc-disclaimer-warn">
              ⚠ Limited historical data — some predictions may be less accurate.
            </p>
          )}
          <p className="fc-disclaimer">
            {isLSTM
              ? "Predictions from an LSTM neural network trained on historical crowd data. Real-time conditions may vary."
              : "Statistical pattern model in use. Start serve.py to enable LSTM predictions."}
          </p>
        </div>
      )}
    </div>
  );
}
