import { useNavigate } from "react-router-dom";
import "./legalpage.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      {/* Top Bar */}
      <div className="legal-topbar">
        <button className="legal-back-btn" onClick={() => navigate("/settings")}>
          ‹ Back
        </button>
        <h1 className="legal-topbar-title">Privacy Policy</h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Hero */}
      <div className="legal-hero">
        <span className="legal-hero-icon">🔒</span>
        <p className="legal-hero-title">Your Privacy Matters</p>
        <p className="legal-hero-meta">Last updated: April 2025 · CrowdLens v1.0</p>
      </div>

      {/* Content */}
      <div className="legal-content">

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">📋</span>
            <p className="legal-section-title">Overview</p>
          </div>
          <div className="legal-section-body">
            <p>
              CrowdLens is a crowd density monitoring platform designed to help communities
              make informed decisions about public spaces. We are committed to protecting
              your personal information and being transparent about how we use it.
            </p>
            <p>
              This Privacy Policy explains what data we collect, why we collect it, and
              how you can control it. By using CrowdLens, you agree to the practices
              described here.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">📦</span>
            <p className="legal-section-title">Data We Collect</p>
          </div>
          <div className="legal-section-body">
            <p>We collect the following types of information:</p>
            <ul>
              <li><strong>Account info</strong> — name, email address, and password (encrypted).</li>
              <li><strong>Profile info</strong> — optional fields like pronouns, address, birthday, and bio that you choose to provide.</li>
              <li><strong>Location data</strong> — only when you enable Location Sharing. Used to improve crowd density readings near you.</li>
              <li><strong>Crowd reports</strong> — crowd level submissions you voluntarily contribute for specific locations.</li>
              <li><strong>Usage data</strong> — pages visited and features used, collected anonymously to improve the app.</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">🎯</span>
            <p className="legal-section-title">How We Use Your Data</p>
          </div>
          <div className="legal-section-body">
            <p>Your data is used solely to power CrowdLens features:</p>
            <ul>
              <li>Displaying real-time crowd density on the map.</li>
              <li>Personalizing your experience (favorites, recent activity).</li>
              <li>Sending notifications you have opted into.</li>
              <li>Improving accuracy of crowd predictions over time.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell your data to third parties, use it for
              advertising, or share it with external organizations without your explicit consent.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">📍</span>
            <p className="legal-section-title">Location Sharing</p>
          </div>
          <div className="legal-section-body">
            <p>
              Location sharing is <strong>opt-in only</strong>. You can enable or disable
              it at any time from Settings → Location Sharing. When disabled, no location
              data is collected or stored.
            </p>
            <p>
              When enabled, your approximate location is used to contribute to crowd
              density calculations. Precise coordinates are never stored — only aggregated,
              anonymized area data.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">🛡️</span>
            <p className="legal-section-title">Data Security</p>
          </div>
          <div className="legal-section-body">
            <p>
              We take reasonable technical measures to protect your data, including
              encrypted passwords, secure HTTPS connections, and access controls on
              our servers.
            </p>
            <p>
              As this is an early-stage platform, we recommend not storing sensitive
              personal information beyond what is necessary for your account.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">✋</span>
            <p className="legal-section-title">Your Rights</p>
          </div>
          <div className="legal-section-body">
            <ul>
              <li><strong>Access</strong> — request a copy of the data we hold about you.</li>
              <li><strong>Correction</strong> — update your profile information at any time via Settings.</li>
              <li><strong>Deletion</strong> — request full account and data deletion by contacting us.</li>
              <li><strong>Opt-out</strong> — disable location sharing or notifications in Settings at any time.</li>
            </ul>
          </div>
        </div>

      </div>

      <div className="legal-footer-note">
        <strong>Questions?</strong> This is a placeholder policy for development purposes.
        A full legal policy will be provided before public launch.
      </div>
    </div>
  );
}
