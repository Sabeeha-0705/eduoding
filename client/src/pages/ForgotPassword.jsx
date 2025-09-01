//src/pages/ForgotPassword.jsx
import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";  // ✅ ADD
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate(); // ✅ Hook

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/forgot-password", { email });
      setMsg("✅ OTP sent to your email!");
      
      // 🚀 Delay 2s, then go to ResetPassword
      setTimeout(() => {
        navigate("/reset-password", { state: { email } }); 
        // 👉 pass email so ResetPassword page can pre-fill
      }, 2000);

    } catch (err) {
      setMsg(err.response?.data?.message || "Error sending reset OTP");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your email and we’ll send you an OTP to reset password.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            Send OTP
          </button>
        </form>
        <p className="msg">{msg}</p>
      </div>
    </div>
  );
}
