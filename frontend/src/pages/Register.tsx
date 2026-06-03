import "./Register.css";
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../api/authService";
import { toastError, toastSuccess } from "../components/Toast";

function validatePassword(password: string) {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/\d/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one symbol, like @, #, or !.";
  return "";
}

function getRegisterErrorMessage(data: any) {
  if (typeof data === "string" && data.trim()) return data;

  if (Array.isArray(data)) {
    const messages = data
      .map((e: any) => e?.description || e?.message || String(e))
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }

  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.title === "string" && data.title.trim()) return data.title;
    if (data.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors)
        .flat()
        .map((e: any) => String(e))
        .filter(Boolean);
      if (messages.length) return messages.join(" ");
    }
  }

  return "Registration failed. Please try again.";
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    birthDate: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toastError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toastError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        address: formData.address,
        birthDate: formData.birthDate,
      });
      toastSuccess("Registration successful! Redirecting to login…");
      setTimeout(() => navigate("/"), 1800);
    } catch (err: any) {
      toastError(getRegisterErrorMessage(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-blob register-blob--tl" aria-hidden="true" />
      <div className="register-blob register-blob--br" aria-hidden="true" />

      <div className="register-card">
        <div className="logo-area">
          <img src="/Logo.png" alt="CrowdLens logo" className="reg-logo" />
          <img src="/Crowdlens.png" alt="CrowdLens" className="reg-logo-text" />
        </div>

        <h1 className="reg-title">Create Account</h1>
        <p className="reg-subtitle">Join CrowdLens and monitor crowd levels near you</p>

        <form onSubmit={handleSignUp} className="register-form" noValidate>
          <div className="reg-row">
            <div className="reg-field">
              <label htmlFor="reg-fullName">Full Name</label>
              <input id="reg-fullName" name="fullName" type="text" placeholder="Juan Dela Cruz" onChange={handleChange} required />
            </div>
            <div className="reg-field">
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" name="email" type="email" placeholder="you@example.com" onChange={handleChange} required />
            </div>
          </div>

          <div className="reg-row">
            <div className="reg-field">
              <label htmlFor="reg-address">Address</label>
              <input id="reg-address" name="address" type="text" placeholder="Cebu City" onChange={handleChange} required />
            </div>
            <div className="reg-field">
              <label htmlFor="reg-birthDate">Birth Date</label>
              <input id="reg-birthDate" name="birthDate" type="date" onChange={handleChange} required />
            </div>
          </div>

          <div className="reg-row">
            <div className="reg-field">
              <label htmlFor="reg-password">Password</label>
              <div className="reg-input-wrapper">
                <input id="reg-password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" onChange={handleChange} required autoComplete="new-password" autoCorrect="off" autoCapitalize="off" />
                <button type="button" className="reg-toggle-password" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <p className="reg-hint">Min. 6 chars with uppercase, number &amp; symbol (e.g. Pass@123)</p>
            </div>
            <div className="reg-field">
              <label htmlFor="reg-confirmPassword">Confirm Password</label>
              <div className="reg-input-wrapper">
                <input id="reg-confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" onChange={handleChange} required />
                <button type="button" className="reg-toggle-password" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? "Hide password" : "Show password"}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          </div>

          <button className="reg-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="reg-spinner" aria-hidden="true" />
                Creating account…
              </>
            ) : "Create Account"}
          </button>
        </form>

        <p className="reg-login-text">
          Already have an account?{" "}
          <Link to="/" className="reg-login-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
