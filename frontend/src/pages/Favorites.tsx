import "./Favorites.css";
import { useState, useEffect } from "react";
import { getFavorites, removeFavorite, submitCrowdReport, updateFavoriteThreshold } from "../api/crowdService";
import ReportModal from "../components/Home/ReportModal";
import BottomNav from "../components/BottomNav";
import ThresholdPicker, { type Threshold } from "../components/ThresholdPicker";
import { toastSuccess, toastError } from "../components/Toast";
import type { CrowdLocation } from "../types/crowd";
import { Bell, Clock, MapPin, PlusCircle, Trash2 } from "lucide-react";

const DENSITY_CLASS: Record<string, string> = {
  "Very Low": "very-low",
  Low: "low",
  Medium: "medium",
  High: "high",
  "Very High": "very-high",
};

export default function Favorites() {
  const [favorites, setFavorites] = useState<CrowdLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFavorite, setSelectedFavorite] = useState<CrowdLocation | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Track which card's threshold is being saved (for disabled state)
  const [savingThresholdId, setSavingThresholdId] = useState<number | null>(null);

  useEffect(() => {
    getFavorites()
      .then(setFavorites)
      .catch(() => toastError("Could not load favorites. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const openReportModal = (fav: CrowdLocation) => {
    setSelectedFavorite(fav);
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = async (level: string) => {
    if (!selectedFavorite) return;
    try {
      await submitCrowdReport(selectedFavorite.id, level, 0, 0);
    } catch {
      // GPS not available on Favorites page — optimistic update only
    }
    setFavorites((prev) =>
      prev.map((fav) =>
        fav.id === selectedFavorite.id
          ? { ...fav, density: level as CrowdLocation["density"], lastUpdated: "Just now" }
          : fav
      )
    );
    setIsReportModalOpen(false);
    setSelectedFavorite(null);
    toastSuccess("Report submitted. Thank you!");
  };

  const handleThresholdChange = async (locationId: number, threshold: Threshold) => {
    // Optimistic local update
    setFavorites((prev) =>
      prev.map((f) => f.id === locationId ? { ...f, alertThreshold: threshold } : f)
    );
    setSavingThresholdId(locationId);
    try {
      await updateFavoriteThreshold(locationId, threshold);
      toastSuccess(
        threshold === "None"
          ? "Alerts turned off for this location."
          : `Alert set: you'll be notified when crowd is "${threshold}" or below.`
      );
    } catch {
      toastError("Failed to update alert threshold.");
      // Re-fetch to restore true state
      getFavorites().then(setFavorites).catch(() => {});
    } finally {
      setSavingThresholdId(null);
    }
  };

  const confirmDelete = async (locationId: number) => {
    setFavorites((prev) => prev.filter((f) => f.id !== locationId));
    setDeletingId(null);
    try {
      await removeFavorite(locationId);
      toastSuccess("Favorite removed.");
    } catch {
      toastError("Failed to remove favorite. Please try again.");
      getFavorites().then(setFavorites).catch(() => {});
    }
  };

  return (
    <div className="favorites-page">
      <header className="favorites-header">
        <div>
          <h1 className="page-label">Favorites</h1>
          <p className="favorites-subtitle">Saved locations and alert thresholds</p>
        </div>
      </header>

      <div className="favorites-list">
        {loading && <p className="empty-text">Loading favorites…</p>}

        {!loading && favorites.length === 0 && (
          <p className="empty-text">
            No favorites yet. Tap the bookmark icon on any location to save it.
          </p>
        )}

        {favorites.map((fav) => (
          <div key={fav.id} className="favorite-card">
            <div className="favorite-card-header">
              <div className="favorite-title-wrap">
                <span className="favorite-location-icon">
                  <MapPin size={17} />
                </span>
                <div>
                  <h3>{fav.name}</h3>
                  <p className="favorite-type">{fav.type}</p>
                </div>
              </div>
              <span className={`favorite-density-badge ${DENSITY_CLASS[fav.density] ?? "medium"}`}>
                {fav.density}
              </span>
            </div>

            <div className="favorite-meta-grid">
              <span className="favorite-item">
                <Clock size={13} />
                {fav.lastUpdated}
              </span>
              <span className="favorite-item">
                <Bell size={13} />
                Alert: {fav.alertThreshold ?? "Low"}
              </span>
            </div>

            {/* Per-location alert threshold */}
            <div className="favorite-threshold-card">
              <ThresholdPicker
                value={(fav.alertThreshold ?? "Low") as Threshold}
                onChange={(v) => handleThresholdChange(fav.id, v)}
                disabled={savingThresholdId === fav.id}
              />
            </div>

            {deletingId === fav.id ? (
              <div className="delete-confirm">
                <p className="delete-confirm-text">Remove &ldquo;{fav.name}&rdquo;?</p>
                <div className="favorite-actions">
                  <button className="delete-btn" onClick={() => confirmDelete(fav.id)}>
                    <Trash2 size={15} />
                    Yes, Remove
                  </button>
                  <button className="cancel-btn" onClick={() => setDeletingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="favorite-actions">
                <button className="create-report-btn" onClick={() => openReportModal(fav)}>
                  <PlusCircle size={15} />
                  Create Report
                </button>
                <button className="delete-btn" onClick={() => setDeletingId(fav.id)}>
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => { setIsReportModalOpen(false); setSelectedFavorite(null); }}
        locationName={selectedFavorite?.name || ""}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}
