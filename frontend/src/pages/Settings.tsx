import "./Settings.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";
import {
  getUserProfile,
  getUserSettings,
  getUserKarma,
  updateUserSettings,
  type UserSettings,
} from "../api/userService";

function karmaRank(pts: number): string {
  if (pts < 0)  return "Disputed Reporter";
  if (pts < 1)  return "New Reporter";
  if (pts < 5)  return "Contributor";
  if (pts < 15) return "Trusted Reporter";
  if (pts < 30) return "Crowd Expert";
  if (pts < 50) return "Senior Analyst";
  return "Elite Lens";
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // ── Remote state ────────────────────────────────────────────────────────────
  const [displayName,  setDisplayName]  = useState(user?.name  ?? "—");
  const [displayEmail, setDisplayEmail] = useState(user?.email ?? "—");
  const [displayBio,   setDisplayBio]   = useState("");
  const [displayAvatar, setDisplayAvatar] = useState("/Logo.png");
  const [karma, setKarma] = useState(0);

  // ── Settings state ─────────────────────────────────────────────────────────
  const [locationEnabled,  setLocationEnabled]  = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pendingLocation,  setPendingLocation]  = useState(true);
  const [pendingNotifications, setPendingNotifications] = useState(true);

  // ── Load from API on mount ──────────────────────────────────────────────────
  useEffect(() => {
    getUserProfile().then((p) => {
      setDisplayName(p.username  || user?.name  || "—");
      setDisplayEmail(p.email    || user?.email || "—");
      setDisplayBio(p.bio        || "");
      setDisplayAvatar(p.avatar  || "/Logo.png");
    }).catch(() => {});

    getUserSettings().then((s: UserSettings) => {
      setLocationEnabled(s.locationSharingEnabled);
      setNotificationsEnabled(s.notificationsEnabled);
      setPendingLocation(s.locationSharingEnabled);
      setPendingNotifications(s.notificationsEnabled);
      // cache for UserHome fast-read
      if (user?.email) {
        localStorage.setItem(
          `cl_settings_${user.email}`,
          JSON.stringify({
            locationEnabled: s.locationSharingEnabled,
            notificationsEnabled: s.notificationsEnabled,
          })
        );
      }
    }).catch(() => {});

    getUserKarma().then(setKarma).catch(() => {});
  }, [user?.email]);

  // ── Panel outside-click ─────────────────────────────────────────────────────
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activePanel) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setActivePanel(null);
        setPendingLocation(locationEnabled);
        setPendingNotifications(notificationsEnabled);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [activePanel, locationEnabled, notificationsEnabled]);

  // ── Save handlers ───────────────────────────────────────────────────────────
  const saveSettings = async (patch: Partial<UserSettings>) => {
    const next: UserSettings = {
      locationSharingEnabled: locationEnabled,
      notificationsEnabled,
      ...patch,
    };
    await updateUserSettings(next);
    // keep localStorage cache in sync for UserHome fast-read
    if (user?.email) {
      localStorage.setItem(
        `cl_settings_${user.email}`,
        JSON.stringify({
          locationEnabled: next.locationSharingEnabled,
          notificationsEnabled: next.notificationsEnabled,
        })
      );
    }
  };

  const handleSaveLocation = async () => {
    setLocationEnabled(pendingLocation);
    await saveSettings({ locationSharingEnabled: pendingLocation });
    setActivePanel(null);
  };

  const handleSaveNotifications = async () => {
    setNotificationsEnabled(pendingNotifications);
    await saveSettings({ notificationsEnabled: pendingNotifications });
    setActivePanel(null);
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleOptionClick = (item: string) => {
    if (item === "Location Sharing" || item === "Notifications") {
      if (item === "Location Sharing") setPendingLocation(locationEnabled);
      if (item === "Notifications")    setPendingNotifications(notificationsEnabled);
      setActivePanel((open) => (open === item ? null : item));
      return;
    }
    setActivePanel(null);
    switch (item) {
      case "Profile":        navigate("/profile");       break;
      case "Privacy Policy": navigate("/privacy-policy"); break;
      case "Terms of Service": navigate("/terms-of-service"); break;
      case "Logout":
        logout();
        navigate("/");
        break;
    }
  };

  const optionItems = [
    { label: "Profile",          icon: "👤" },
    { label: "Location Sharing", icon: "📍" },
    { label: "Notifications",    icon: "🔔" },
    { label: "Privacy Policy",   icon: "🔒" },
    { label: "Terms of Service", icon: "📄" },
  ];

  const isAdmin = user?.role === "admin" || user?.role === "Admin";

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-header-title">Account</h1>
        <p className="settings-header-sub">Manage your profile &amp; preferences</p>
      </div>

      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-avatar-wrapper">
          <img src={displayAvatar} alt="Profile" className="profile-picture" />
          <span className="profile-avatar-badge" />
        </div>
        <div className="profile-info">
          <p className="profile-name">{displayName}</p>
          <p className="profile-email">{displayEmail}</p>
          {displayBio && <p className="profile-bio">{displayBio}</p>}
        </div>
        <button className="profile-edit-btn" onClick={() => navigate("/profile")}>
          Edit
        </button>
      </div>

      {/* CrowdLens Points */}
      <div className={`karma-card ${karma > 0 ? "karma-pos" : karma < 0 ? "karma-neg" : "karma-zero"}`}>
        <div className="karma-card-inner">
          <p className="karma-eyebrow">★ &nbsp;CrowdLens Points&nbsp; ★</p>
          <p className={`karma-score ${karma > 0 ? "pos" : karma < 0 ? "neg" : ""}`}>
            {karma > 0 ? `+${karma}` : karma}
          </p>
          <span className="karma-rank-badge">{karmaRank(karma)}</span>
          <p className="karma-desc">Votes on your reports earn or lose you points</p>
        </div>
      </div>

      {/* Admin Button */}
      {isAdmin && (
        <>
          <p className="settings-section-label">Admin</p>
          <div className="admin-section">
            <button className="admin-btn" onClick={() => navigate("/locations")}>
              🗂 Manage Locations
            </button>
          </div>
        </>
      )}

      {/* Settings Options */}
      <p className="settings-section-label">Preferences</p>
      <ul className="settings-options">
        {optionItems.map(({ label, icon }) => {
          const isActivePanel = activePanel === label;
          return (
            <li key={label} className="settings-option">
              <button
                className="settings-action"
                onClick={() => handleOptionClick(label)}
              >
                <span className="settings-action-icon">{icon}</span>
                <span className="settings-action-label">{label}</span>
                {label === "Location Sharing" && (
                  <span className={`settings-status-badge ${locationEnabled ? "on" : "off"}`}>
                    {locationEnabled ? "On" : "Off"}
                  </span>
                )}
                {label === "Notifications" && (
                  <span className={`settings-status-badge ${notificationsEnabled ? "on" : "off"}`}>
                    {notificationsEnabled ? "On" : "Off"}
                  </span>
                )}
                <span className="settings-action-chevron">›</span>
              </button>

              {isActivePanel && label === "Location Sharing" && (
                <div ref={panelRef} className="settings-panel" role="dialog" aria-label="Location Sharing settings">
                  <div className="panel-row">
                    <div>
                      <label htmlFor="location-toggle" style={{ fontWeight: 600, display: "block" }}>
                        Location Sharing
                      </label>
                      <p style={{ fontSize: 12, color: "#7a8f82", margin: "2px 0 0" }}>
                        Required for submitting reports and voting
                      </p>
                    </div>
                    <button
                      id="location-toggle"
                      className={`toggle-button ${pendingLocation ? "enabled" : ""}`}
                      onClick={() => setPendingLocation(!pendingLocation)}
                    >
                      {pendingLocation ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="panel-actions">
                    <button onClick={handleSaveLocation}>Save</button>
                    <button onClick={() => { setPendingLocation(locationEnabled); setActivePanel(null); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {isActivePanel && label === "Notifications" && (
                <div ref={panelRef} className="settings-panel" role="dialog" aria-label="Notification preferences">
                  <div className="panel-row">
                    <div>
                      <label htmlFor="notif-toggle" style={{ fontWeight: 600, display: "block" }}>
                        Notifications
                      </label>
                      <p style={{ fontSize: 12, color: "#7a8f82", margin: "2px 0 0" }}>
                        Receive alerts for your watched locations
                      </p>
                    </div>
                    <button
                      id="notif-toggle"
                      className={`toggle-button ${pendingNotifications ? "enabled" : ""}`}
                      onClick={() => setPendingNotifications(!pendingNotifications)}
                    >
                      {pendingNotifications ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="panel-actions">
                    <button onClick={handleSaveNotifications}>Save</button>
                    <button onClick={() => { setPendingNotifications(notificationsEnabled); setActivePanel(null); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Logout */}
      <p className="settings-section-label">Account</p>
      <ul className="settings-options">
        <li className="settings-option logout-option">
          <button className="settings-action" onClick={() => handleOptionClick("Logout")}>
            <span className="settings-action-icon">🚪</span>
            <span className="settings-action-label">Logout</span>
            <span className="settings-action-chevron">›</span>
          </button>
        </li>
      </ul>

      <BottomNav />
    </div>
  );
}
