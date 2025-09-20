// src/pages/Auth.jsx
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api";
import bg from "../assets/bg.png";
import "./Auth.css";
import { useNavigate } from "react-router-dom";

/* Small client-side JWT payload decoder (base64url -> JSON). UI-only. */
const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
};

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [msg, setMsg] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      if (isLogin) {
        const res = await api.post("/auth/login", data);
        if (res?.data?.token) {
          if (remember) localStorage.setItem("authToken", res.data.token);
          else sessionStorage.setItem("authToken", res.data.token);
          setMsg("✅ Logged in!");
          navigate("/dashboard");
        } else {
          setMsg("Login failed: no token returned.");
        }
      } else {
        const res = await api.post("/auth/register", data);
        setMsg(res.data.message || "OTP sent to email!");
        setOtpStep(true);
        setEmail(data.email);
      }
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || "Error");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await api.post("/auth/forgot-password", { email: data.email });
      setMsg(res.data.message || "Reset OTP sent to email!");
      setForgotMode(false);
    } catch (err) {
      setMsg(err.response?.data?.message || "Error in forgot password");
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await api.post("/auth/verify-otp", { email, otp: data.otp });
      setMsg(res.data.message);
      setOtpStep(false);
      setIsLogin(true);
    } catch (err) {
      setMsg(err.response?.data?.message || "OTP verification failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse?.credential;
      if (!token) {
        setMsg("Google login failed: no credential returned");
        return;
      }
      const res = await api.post("/auth/google", { token });
      if (res.data?.token) {
        localStorage.setItem("authToken", res.data.token);
        setMsg("✅ Google login success!");
        navigate("/dashboard");
      } else setMsg("Google login failed: no app token returned");
    } catch (err) {
      console.error(err);
      setMsg("Google login failed");
    }
  };

  return (
    <div
      className="auth-wrapper"
      style={{
        background: `url(${bg}) no-repeat center center fixed`,
        backgroundSize: "cover",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="auth-container">
        <div className="auth-card">
          <img src="/logo.png" alt="Logo" className="logo" />
          <h2>
            {forgotMode ? "Forgot Password" : isLogin ? "Login" : otpStep ? "Verify OTP" : "Sign Up"}
          </h2>

          {forgotMode ? (
            <form onSubmit={handleForgot}>
              <input type="email" name="email" placeholder="Enter your email" required />
              <button type="submit" className="btn-primary">Send Reset Link</button>
              <button type="button" className="switch-btn" onClick={() => setForgotMode(false)}>Back to Login</button>
            </form>
          ) : otpStep ? (
            <form onSubmit={handleOtpVerify}>
              <input type="text" name="otp" placeholder="Enter OTP" required />
              <button type="submit" className="btn-primary">Verify OTP</button>
            </form>
          ) : (
            <>
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setMsg("Google login failed")} useOneTap={false} />

              <div className="divider"><hr /><span>OR</span><hr /></div>

              <form onSubmit={handleSubmit}>
                {!isLogin && <input type="text" name="username" placeholder="Username" required />}

                <input type="email" name="email" placeholder="Email" required />

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    required
                    style={{ width: "100%", paddingRight: "35px" }}
                  />
                  <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "14px", color: "#555" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </span>
                </div>

                {!isLogin && (
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      required
                      style={{ width: "100%", paddingRight: "35px" }}
                    />
                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "14px", color: "#555" }}>
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </span>
                  </div>
                )}

                {/* ROLE SELECT (only shown on signup). WARNING: enabling uploader/admin here is insecure for production */}
                {!isLogin && (
                  <div style={{ textAlign: "left", marginTop: 8 }}>
                    <label style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>
                      Choose role (for testing only)
                    </label>
                    <select name="role" defaultValue="user" style={{ width: "100%", padding: 9, borderRadius: 6 }}>
                      <option value="user">User</option>
                      {/* uploader option included for local testing only — remove/disable for production */}
                      <option value="uploader">Uploader (testing only)</option>
                    </select>
                    <small style={{ color: "#b02", display: "block", marginTop: 6 }}>
                      ⚠️ Allowing uploader/admin during signup is insecure. For production, remove this and promote via admin script / Atlas.
                    </small>
                  </div>
                )}

                {isLogin && (
                  <label className="remember-me">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    Remember Me
                  </label>
                )}

                <button type="submit" className="btn-primary">{isLogin ? "Login" : "Sign Up"}</button>
              </form>

              {isLogin && <p className="forgot-password" onClick={() => setForgotMode(true)}>Forgot Password?</p>}

              <button className="switch-btn" onClick={() => { setIsLogin(!isLogin); setMsg(""); }}>
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
              </button>
            </>
          )}

          <p className="msg">{msg}</p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
