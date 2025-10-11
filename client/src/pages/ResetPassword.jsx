// src/pages/ResetPassword.jsx
import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { useLocation, useNavigate } from "react-router-dom";
import "./Auth.css";

export default function ResetPassword() {
  const loc = useLocation();
  const navigate = useNavigate();

  // Prefill email from navigation state if provided
  const initialEmail = loc?.state?.email ? String(loc.state.email) : "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRef = useRef(null);

  useEffect(() => {
    // If email was prefilled, focus OTP input for faster flow
    if (initialEmail && otpRef.current) {
      otpRef.current.focus();
    }
  }, [initialEmail]);

  const validatePassword = (pw) => {
    if (!pw || pw.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter";
    if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter";
    if (!/[0-9]/.test(pw)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include a special character";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!email.trim()) {
      setMsg("Please provide your email");
      return;
    }
    if (!otp.trim()) {
      setMsg("Please enter the OTP sent to your email");
      return;
    }
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setMsg(pwdErr);
      return;
    }

    setLoading(true);
    try {
      // Matches server: { email, otp, newPassword }
      const res = await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      // Show backend message (or fallback)
      const backendMsg = res?.data?.message || "Password reset successful";
      setMsg(backendMsg);

      // If server returns otp (dev mode), show it (helpful for local dev)
      if (res?.data?.otp) {
        setMsg((prev) => `${prev}\n\n⚠️ Dev OTP: ${res.data.otp}`);
      }

      // Redirect to login after short delay
      setTimeout(() => navigate("/auth"), 1200);
    } catch (err) {
      const emsg = err?.response?.data?.message || err?.message || "Error resetting password";
      setMsg(emsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-label="Email"
          />

          <input
            ref={otpRef}
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            autoComplete="one-time-code"
            aria-label="OTP"
          />

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: "100%", paddingRight: "35px" }}
              autoComplete="new-password"
              aria-label="New password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: "6px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special
            character.
          </p>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>

        {msg && (
          <pre
            className="msg"
            style={{
              marginTop: 10,
              whiteSpace: "pre-wrap",
              color: msg.startsWith("✅") ? "#0a7d3a" : "#b02",
            }}
          >
            {msg}
          </pre>
        )}
      </div>
    </div>
  );
}
