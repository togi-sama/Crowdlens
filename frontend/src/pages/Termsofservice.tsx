import { useNavigate } from "react-router-dom";
import "./legalpage.css";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      {/* Top Bar */}
      <div className="legal-topbar">
        <button className="legal-back-btn" onClick={() => navigate("/settings")}>
          ‹ Back
        </button>
        <h1 className="legal-topbar-title">Terms of Service</h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Hero */}
      <div className="legal-hero">
        <span className="legal-hero-icon">📄</span>
        <p className="legal-hero-title">Terms of Service</p>
        <p className="legal-hero-meta">Last updated: April 2025 · CrowdLens v1.0</p>
      </div>

      {/* Content */}
      <div className="legal-content">

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">👋</span>
            <p className="legal-section-title">Introduction</p>
          </div>
          <div className="legal-section-body">
            <p>
              Welcome to CrowdLens. By creating an account or using our platform,
              you agree to be bound by these Terms of Service. Please read them carefully.
            </p>
            <p>
              CrowdLens is a crowd density monitoring tool intended to help individuals
              and communities navigate public spaces more safely and efficiently.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">✅</span>
            <p className="legal-section-title">Eligibility</p>
          </div>
          <div className="legal-section-body">
            <p>To use CrowdLens, you must:</p>
            <ul>
              <li>Be at least 13 years of age.</li>
              <li>Provide accurate information when creating your account.</li>
              <li>Not use the platform on behalf of any entity without authorization.</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">📝</span>
            <p className="legal-section-title">Acceptable Use</p>
          </div>
          <div className="legal-section-body">
            <p>You agree to use CrowdLens only for lawful purposes. You must not:</p>
            <ul>
              <li>Submit false or misleading crowd reports.</li>
              <li>Attempt to manipulate crowd data for personal gain or to mislead others.</li>
              <li>Harass, impersonate, or harm other users.</li>
              <li>Attempt to gain unauthorized access to any part of the platform.</li>
              <li>Use automated bots or scripts to interact with the platform.</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">👤</span>
            <p className="legal-section-title">User Accounts</p>
          </div>
          <div className="legal-section-body">
            <p>
              You are responsible for maintaining the security of your account credentials.
              Do not share your password with others. CrowdLens will never ask for
              your password via email or chat.
            </p>
            <p>
              You may delete your account at any time by contacting us. Upon deletion,
              your personal data will be removed within 30 days, except where retention
              is required by law.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">🗺️</span>
            <p className="legal-section-title">Crowd Data & Accuracy</p>
          </div>
          <div className="legal-section-body">
            <p>
              Crowd density data on CrowdLens is crowd-sourced and may not always
              be accurate. Do not rely solely on CrowdLens data for safety-critical
              decisions.
            </p>
            <p>
              By submitting a crowd report, you grant CrowdLens a non-exclusive license
              to use that data to improve and power the platform's features.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">⚖️</span>
            <p className="legal-section-title">Limitation of Liability</p>
          </div>
          <div className="legal-section-body">
            <p>
              CrowdLens is provided "as is" without warranties of any kind. We are not
              liable for any damages arising from your use of — or inability to use —
              the platform, including inaccurate crowd data or service downtime.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-header">
            <span className="legal-section-icon">🔄</span>
            <p className="legal-section-title">Changes to These Terms</p>
          </div>
          <div className="legal-section-body">
            <p>
              We may update these Terms from time to time. When we do, we will update
              the date at the top of this page. Continued use of CrowdLens after
              changes constitutes your acceptance of the new terms.
            </p>
          </div>
        </div>

      </div>

      <div className="legal-footer-note">
        <strong>Note:</strong> This is a placeholder terms document for development purposes.
        Legally binding terms will be drafted before public launch.
      </div>
    </div>
  );
}
