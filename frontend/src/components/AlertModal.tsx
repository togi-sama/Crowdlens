import "./AlertModal.css";

export interface AlertedLocation {
  locationId: number;
  locationName: string;
  locationType: string;
  currentDensity: string;
  alertThreshold: string;
}

const DENSITY_COLOR: Record<string, string> = {
  "Very Low": "#84cc16",
  "Low":      "#30924C",
  "Medium":   "#f59e0b",
  "High":     "#e17055",
  "Very High":"#b71c1c",
};

interface Props {
  alerts: AlertedLocation[];
  onDismiss: () => void;
  onViewOnMap: (locationId: number) => void;
}

export default function AlertModal({ alerts, onDismiss, onViewOnMap }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="alert-modal-overlay" role="dialog" aria-modal="true" aria-label="Crowd alerts">
      <div className="alert-modal">
        <div className="alert-modal-header">
          <div className="alert-modal-title-row">
            <span className="alert-bell">🔔</span>
            <h2 className="alert-modal-title">Crowd Alerts</h2>
          </div>
          <p className="alert-modal-subtitle">
            {alerts.length === 1
              ? "1 of your favorite locations has low crowd right now."
              : `${alerts.length} of your favorite locations have low crowd right now.`}
          </p>
        </div>

        <ul className="alert-list">
          {alerts.map((a) => {
            const color = DENSITY_COLOR[a.currentDensity] ?? "#30924C";
            return (
              <li key={a.locationId} className="alert-item">
                <div className="alert-item-info">
                  <span className="alert-item-name">{a.locationName}</span>
                  <span className="alert-item-type">{a.locationType}</span>
                </div>
                <div className="alert-item-right">
                  <span className="alert-density-badge" style={{ color, background: `${color}18`, borderColor: `${color}44` }}>
                    {a.currentDensity}
                  </span>
                  <button
                    className="alert-view-btn"
                    onClick={() => { onViewOnMap(a.locationId); onDismiss(); }}
                  >
                    View
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="alert-modal-footer">
          <p className="alert-threshold-note">
            Alerts fire when crowd is at or below your saved threshold per location.
          </p>
          <button className="alert-dismiss-btn" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
