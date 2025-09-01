
// src/pages/ResetPassword.jsx
import { useState } from "react";
import { api } from "../api";
import "./Auth.css";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁️ toggle
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      setMsg(res.data.message);
    } catch (err) {
      setMsg(err.response?.data?.message || "Error resetting password");
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
          />

          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />

          {/* Password field with 👁️ */}
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: "100%", paddingRight: "35px" }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                fontSize: "14px",
                color: "#555",
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {/* Password rules hint */}
          <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1
            special character.
          </p>

          <button type="submit" className="btn-primary">
            Reset Password
          </button>
        </form>
        <p className="msg">{msg}</p>
      </div>
    </div>
  );
}
