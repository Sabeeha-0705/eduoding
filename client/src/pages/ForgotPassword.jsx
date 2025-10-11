// src/pages/ForgotPassword.jsx
import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const EMAIL_RE =
  // simple email validation, good enough for client-side check
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    // autofocus for accessibility
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = (email || "").trim().toLowerCase();

    if (!cleaned) {
      setMsg("Please enter your email");
      return;
    }
    if (!EMAIL_RE.test(cleaned)) {
      setMsg("Please enter a valid email address");
      return;
    }

    setSending(true);
    setMsg("");

    try {
      const res = await api.post("/auth/forgot-password", { email: cleaned });

      // backend message (friendly)
      const backendMessage = res.data?.message;
      let devOtp = res.data?.otp; // server may return otp in dev mode

      // Show message to user
      setMsg(backendMessage || "✅ Reset OTP sent to your email (if delivery succeeds).");

      // If backend returned OTP (dev mode), show it below for convenience
      if (devOtp) {
        setMsg((prev) =>
          `${prev}\n\n⚠️ Dev OTP: ${devOtp} (email delivery may be disabled in dev)`
        );
      }

      // Navigate to Reset page and pass email in state so ResetPassword can pre-fill
      navigate("/reset-password", { state: { email: cleaned } });
    } catch (err) {
      // Prefer server message, fallback to generic
      const errorMessage =
        err?.response?.data?.message || err?.message || "Error sending reset OTP";
      setMsg(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your email and we’ll send you an OTP to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-label="Email"
          />
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? "Sending…" : "Send OTP"}
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
