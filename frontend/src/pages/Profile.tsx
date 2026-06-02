import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, updateUserProfile, type UserProfile } from "../api/userService";
import "./Profile.css";

const PRONOUNS_OPTIONS = [
  "He/Him",
  "She/Her",
  "They/Them",
  "He/They",
  "She/They",
  "Prefer not to say",
  "Other",
];

const DEFAULTS: UserProfile = {
  username: "",
  email: "",
  pronouns: "Prefer not to say",
  address: "",
  birthday: "",
  bio: "",
  avatar: "",
};

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile>(DEFAULTS);
  const [draft, setDraft] = useState<UserProfile>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserProfile()
      .then((data) => {
        const filled = { ...DEFAULTS, ...data };
        setProfile(filled);
        setDraft(filled);
      })
      .catch(() => setError("Could not load profile. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setDraft((prev) => ({ ...prev, avatar: base64 }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateUserProfile(draft);
      setProfile({ ...draft });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft({ ...profile });
    setSaved(false);
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const avatarSrc = draft.avatar || "/Logo.png";

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-topbar">
          <button className="back-btn" onClick={() => navigate("/settings")}>‹ Back</button>
          <h1 className="profile-topbar-title">Edit Profile</h1>
          <div style={{ width: 60 }} />
        </div>
        <p style={{ textAlign: "center", padding: "40px 20px", color: "#7a8f82" }}>
          Loading profile…
        </p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-topbar">
        <button className="back-btn" onClick={() => navigate("/settings")}>
          ‹ Back
        </button>
        <h1 className="profile-topbar-title">Edit Profile</h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Avatar */}
      <div className="avatar-section">
        <div className="avatar-ring">
          <img src={avatarSrc} alt="Profile" className="avatar-img" />
          <button className="avatar-edit-btn" onClick={handleAvatarClick}>
            <span className="camera-icon">📷</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
        <p className="avatar-hint">Tap photo to change</p>
      </div>

      {/* Form */}
      <div className="profile-form">
        {error && (
          <p style={{ color: "#e74c3c", fontSize: 13, textAlign: "center", margin: "0 0 8px" }}>
            {error}
          </p>
        )}

        {/* Identity */}
        <div className="form-section">
          <p className="form-section-label">Identity</p>

          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              name="username"
              value={draft.username}
              onChange={handleChange}
              placeholder="Your display name"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Pronouns</label>
            <select
              className="field-input field-select"
              name="pronouns"
              value={draft.pronouns}
              onChange={handleChange}
            >
              {PRONOUNS_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Bio</label>
            <textarea
              className="field-input field-textarea"
              name="bio"
              value={draft.bio}
              onChange={handleChange}
              placeholder="Tell the community a little about yourself…"
              rows={3}
              maxLength={180}
            />
            <p className="field-hint">{draft.bio.length}/180</p>
          </div>
        </div>

        {/* Contact */}
        <div className="form-section">
          <p className="form-section-label">Contact</p>

          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              value={draft.email}
              disabled
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
            <p className="field-hint">Email cannot be changed here</p>
          </div>

          <div className="field-group">
            <label className="field-label">Address</label>
            <input
              className="field-input"
              type="text"
              name="address"
              value={draft.address}
              onChange={handleChange}
              placeholder="City, Province"
            />
          </div>
        </div>

        {/* Personal */}
        <div className="form-section">
          <p className="form-section-label">Personal</p>

          <div className="field-group">
            <label className="field-label">Birthday</label>
            <input
              className="field-input"
              type="date"
              name="birthday"
              value={draft.birthday}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
          </button>
          {isDirty && !saving && (
            <button className="discard-btn" onClick={handleDiscard}>
              Discard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
