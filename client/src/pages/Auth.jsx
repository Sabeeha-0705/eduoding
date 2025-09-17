// src/pages/Auth.jsx
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
// removed: import jwtDecode from "jwt-decode";
import { api } from "../api";
import bg from "../assets/bg.png";
import "./Auth.css";
import { useNavigate } from "react-router-dom";

/**
 * Small client-side JWT payload decoder (base64url -> JSON).
 * Works only to read token payload on client (do NOT rely on this for security).
 */
const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    // base64url -> base64
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    // decode
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

  // 👁️ Eye toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // ✅ Login/Register
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      if (isLogin) {
        const res = await api.post("/auth/login", data);
        if (res?.data?.token) {
          if (remember) {
            localStorage.setItem("authToken", res.data.token);
          } else {
            sessionStorage.setItem("authToken", res.data.token);
          }
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

  // ✅ Forgot Password
  const handleForgot = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const res = await api.post("/auth/forgot-password", { email: data.email });
      setMsg(res.data.message || "Reset OTP sent to email!");
      setForgotMode(false);
    } catch (err) {
      setMsg(err.response?.data?.message || "Error in forgot password");
    }
  };

  // ✅ OTP Verify
  const handleOtpVerify = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const res = await api.post("/auth/verify-otp", { email, otp: data.otp });
      setMsg(res.data.message);
      setOtpStep(false);
      setIsLogin(true);
    } catch (err) {
      setMsg(err.response?.data?.message || "OTP verification failed");
    }
  };

  // ✅ Google Login
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse?.credential;
      if (!token) {
        setMsg("Google login failed: no credential returned");
        return;
      }

      // decode token payload locally (for UI use only)
      const userInfo = decodeJwt(token);

      // send Google token to backend for verification + app token
      const res = await api.post("/auth/google", { token });
      if (res.data?.token) {
        localStorage.setItem("authToken", res.data.token);
        setMsg("✅ Google login success!");
        navigate("/dashboard");
      } else {
        setMsg("Google login failed: no app token returned");
      }
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

          {/* Forgot Password Form */}
          {forgotMode ? (
            <form onSubmit={handleForgot}>
              <input type="email" name="email" placeholder="Enter your email" required />
              <button type="submit" className="btn-primary">Send Reset Link</button>
              <button type="button" className="switch-btn" onClick={() => setForgotMode(false)}>
                Back to Login
              </button>
            </form>
          ) : otpStep ? (
            <form onSubmit={handleOtpVerify}>
              <input type="text" name="otp" placeholder="Enter OTP" required />
              <button type="submit" className="btn-primary">Verify OTP</button>
            </form>
          ) : (
            <>
              {/* Google Login */}
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setMsg("Google login failed")}
                useOneTap={false}
              />

              <div className="divider">
                <hr />
                <span>OR</span>
                <hr />
              </div>

              {/* Normal Login/Register */}
              <form onSubmit={handleSubmit}>
                {!isLogin && <input type="text" name="username" placeholder="Username" required />}

                <input type="email" name="email" placeholder="Email" required />

                {/* Password Field 👁️ */}
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
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

                {/* Confirm Password 👁️ (only signup) */}
                {!isLogin && (
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      required
                      style={{ width: "100%", paddingRight: "35px" }}
                    />
                    <span
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </span>
                  </div>
                )}

                {/* Remember Me */}
                {isLogin && (
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember Me
                  </label>
                )}

                <button type="submit" className="btn-primary">
                  {isLogin ? "Login" : "Sign Up"}
                </button>
              </form>

              {/* Forgot Password */}
              {isLogin && (
                <p className="forgot-password" onClick={() => setForgotMode(true)}>
                  Forgot Password?
                </p>
              )}

              {/* Switch Button */}
              <button className="switch-btn" onClick={() => setIsLogin(!isLogin)}>
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
