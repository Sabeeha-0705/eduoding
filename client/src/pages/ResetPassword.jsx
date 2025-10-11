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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // resend OTP logic
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownSeconds = 30;

  const otpRef = useRef(null);

  useEffect(() => {
    // Auto focus OTP input if email exists
    if (initialEmail && otpRef.current) {
      otpRef.current.focus();
    }
  }, [initialEmail]);

  // Decrease cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Validate password strength
  const validatePassword = (pw) => {
    if (!pw || pw.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter";
    if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter";
    if (!/[0-9]/.test(pw)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include a special character";
    return null;
  };

  // Handle reset password form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!email.trim()) return setMsg("Please provide your email");
    if (!otp.trim()) return setMsg("Please enter the OTP sent to your email");
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) return setMsg(pwdErr);
    if (newPassword !== confirmPassword)
      return setMsg("Password and Confirm Password do not match");

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      const backendMsg = res?.data?.message || "✅ Password reset successful!";
      setMsg(backendMsg);

      // optional dev OTP view
      if (res?.data?.otp) {
        alert("⚠️ Dev OTP: " + res.data.otp);
      }

      // redirect to login
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err) {
      const emsg =
        err?.response?.data?.message || err?.message || "Error resetting password";
      setMsg(emsg);
      console.error("reset-password error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP function
  const handleResendOtp = async () => {
    const cleaned = (email || "").trim().toLowerCase();
    if (!cleaned) return setMsg("Enter your email to resend OTP");

    if (resendCooldown > 0)
      return setMsg(`Please wait ${resendCooldown}s before requesting again.`);

    setResendCooldown(cooldownSeconds);
    setMsg("Sending new OTP...");

    try {
      const res = await api.post("/auth/forgot-password", { email: cleaned });
      const backendMessage =
        res?.data?.message || "A new OTP has been sent to your email.";
      setMsg(backendMessage);

      if (res?.data?.otp) {
        alert("⚠️ Dev OTP: " + res.data.otp);
        console.info("DEV OTP:", res.data.otp);
      }
    } catch (err) {
      const emsg =
        err?.response?.data?.message || err?.message || "Error sending OTP";
      setMsg(emsg);
      setResendCooldown(0); // allow retry
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-label="Email"
          />

          {/* OTP + Resend */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={otpRef}
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              autoComplete="one-time-code"
              aria-label="OTP"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0}
              style={{
                background: resendCooldown > 0 ? "#bbb" : "#6c63ff",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
              }}
            >
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend OTP"}
            </button>
          </div>

          {/* Password */}
          <div style={{ position: "relative", marginTop: 10 }}>
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
            <span
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {/* Confirm Password */}
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ marginTop: 8, width: "100%" }}
            autoComplete="new-password"
            aria-label="Confirm password"
          />

          <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
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
