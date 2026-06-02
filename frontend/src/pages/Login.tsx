import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Clock3, Eye, EyeOff, Lock, Mail, MapPin } from "lucide-react";
import { authService } from "../api/authService";
import { useAuth } from "../context/AuthContext";
import { toastError } from "../components/Toast";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toastError("Enter your email and password to continue");
      return;
    }

    setLoading(true);
    try {
      await authService.login(email.trim(), password);
      refreshUser();
      navigate("/home");
    } catch (err: any) {
      toastError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="CrowdLens overview">
        <div className="showcase-brand">
          <img src="/Logo.png" alt="" className="showcase-logo" />
          <img src="/Crowdlens.png" alt="CrowdLens" className="showcase-wordmark" />
        </div>

        <div className="map-preview" aria-hidden="true">
          <img src="/Map.png" alt="" />
          <div className="scan-line" />
          <div className="map-pin map-pin--one">
            <span>Medium</span>
          </div>
          <div className="map-pin map-pin--two">
            <span>Low</span>
          </div>
          <div className="map-pin map-pin--three">
            <span>High</span>
          </div>
          <div className="floating-card floating-card--live">
            <Activity size={16} />
            <div>
              <strong>Live reports</strong>
              <span>Updating now</span>
            </div>
          </div>
          <div className="floating-card floating-card--time">
            <Clock3 size={16} />
            <div>
              <strong>Best window</strong>
              <span>2:00 PM - 4:00 PM</span>
            </div>
          </div>
          <div className="location-pulse location-pulse--one">
            <MapPin size={18} />
          </div>
          <div className="location-pulse location-pulse--two">
            <MapPin size={18} />
          </div>
        </div>

        <div className="showcase-copy">
          <p className="eyebrow">Crowd awareness dashboard</p>
          <h1>Find the better time to go.</h1>
          <p>Check live reports, forecast crowded hours, and keep your saved places close.</p>
          <div className="forecast-strip" aria-hidden="true">
            <span style={{ "--bar-height": "38%" } as CSSProperties} />
            <span style={{ "--bar-height": "54%" } as CSSProperties} />
            <span style={{ "--bar-height": "72%" } as CSSProperties} />
            <span style={{ "--bar-height": "48%" } as CSSProperties} />
            <span style={{ "--bar-height": "32%" } as CSSProperties} />
            <span style={{ "--bar-height": "58%" } as CSSProperties} />
            <span style={{ "--bar-height": "44%" } as CSSProperties} />
          </div>
        </div>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <div className="logo-area">
          <img src="/Logo.png" alt="" className="logo" />
          <img src="/Crowdlens.png" alt="CrowdLens" className="logo-text" />
        </div>

        <div className="login-heading">
          <p className="eyebrow">Welcome back</p>
          <h2 className="title" id="login-title">
            Sign in to CrowdLens
          </h2>
          <p className="subtitle">Use your account to continue to your crowd map.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form" noValidate>
          <div className="field-group">
            <label htmlFor="login-email">Email address</label>
            <div className="input-wrapper">
              <Mail size={18} aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="signup-text">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={() => navigate("/register")}>
            Create one
          </button>
        </p>
      </section>
    </main>
  );
}
