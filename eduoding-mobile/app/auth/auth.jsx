// eduoding-mobile/app/auth/auth.jsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../context/AuthContext";
import {
  getGoogleClientId,
  getGoogleRedirectUri,
  GOOGLE_SCOPES,
} from "../../config/googleAuth";

// Complete the auth session for better UX
// This allows Expo to automatically dismiss the OAuth browser window
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { setToken, handleGoogleLogin: authHandleGoogleLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [msg, setMsg] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requestedUploader, setRequestedUploader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth hook - handles the authentication flow
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: getGoogleClientId(),
    scopes: GOOGLE_SCOPES,
    redirectUri: getGoogleRedirectUri(),
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === "success") {
      // Extract ID token from response
      // Google.useAuthRequest returns it in authentication.idToken
      // Fallback to params.id_token for compatibility
      const idToken =
        response.authentication?.idToken ||
        response.params?.id_token ||
        null;
      handleGoogleAuthSuccess(idToken);
    } else if (response?.type === "error") {
      handleGoogleAuthError(response.error);
    } else if (response?.type === "cancel") {
      setGoogleLoading(false);
      setMsg("Google login cancelled");
    }
  }, [response]);

  /**
   * Handle successful Google authentication
   * Sends the ID token to the backend and processes the response
   */
  const handleGoogleAuthSuccess = async (idToken) => {
    if (!idToken) {
      setGoogleLoading(false);
      setMsg("❌ Google login failed: No ID token received");
      return;
    }

    try {
      console.log("✅ Received Google ID token, sending to backend...");

      // Use AuthContext helper to handle backend call and token storage
      const result = await authHandleGoogleLogin(idToken);

      if (result.success) {
        setMsg("✅ Google login successful!");
        
        // Navigate to dashboard
        router.replace("/(tabs)");
      } else {
        setMsg(`❌ ${result.message || "Google login failed"}`);
      }
    } catch (err) {
      console.error("Backend Google login error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Google login failed. Please try again.";
      setMsg(`❌ ${errorMessage}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  /**
   * Handle Google authentication errors
   */
  const handleGoogleAuthError = (error) => {
    setGoogleLoading(false);
    console.error("Google OAuth error:", error);
    
    if (error?.code === "ERR_REQUEST_CANCELED") {
      setMsg("Google login cancelled");
    } else if (error?.message) {
      setMsg(`❌ Google login failed: ${error.message}`);
    } else {
      setMsg("❌ Google login failed. Please try again.");
    }
  };

  /**
   * Initiate Google login flow
   * This triggers the OAuth prompt
   */
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setMsg("");

      // Check if Google Client ID is configured
      const clientId = getGoogleClientId();
      if (!clientId) {
        setMsg("❌ Google login is not configured. Please set GOOGLE_CLIENT_ID in app.json");
        setGoogleLoading(false);
        return;
      }

      // Check if request is ready
      if (!request) {
        setMsg("❌ Google login is initializing. Please wait...");
        setGoogleLoading(false);
        return;
      }

      console.log("🚀 Starting Google OAuth flow...");
      console.log("Redirect URI:", getGoogleRedirectUri());

      // Prompt the user for Google authentication
      await promptAsync();
    } catch (err) {
      console.error("Google login initiation error:", err);
      setMsg(err.message || "❌ Failed to start Google login. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setMsg("");
    if (!email || !password) {
      setMsg("Email and password are required");
      return;
    }

    if (!isLogin && !username) {
      setMsg("Username is required");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        const res = await API.post("/auth/login", {
          email: email.toLowerCase().trim(),
          password,
        });

        if (res?.data?.token) {
          await AsyncStorage.setItem("authToken", res.data.token);
          setToken(res.data.token);
          setMsg("✅ Logged in!");
          router.replace("/(tabs)");
        } else {
          setMsg("Login failed: no token returned.");
        }
      } else {
        const payload = {
          username,
          email: email.toLowerCase().trim(),
          password,
          requestedUploader: !!requestedUploader,
        };
        const res = await API.post("/auth/register", payload);
        setMsg(res.data.message || "OTP sent to email!");
        setOtpStep(true);

        if (res.data.otp) {
          Alert.alert("⚠️ Dev OTP", `Since email failed: ${res.data.otp}`);
        }
      }
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || "Error");
    } finally {
      setLoading(false);
    }
  };


  const handleForgot = async () => {
    setMsg("");
    const em = email.toLowerCase().trim();
    if (!em) {
      setMsg("Enter an email");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/forgot-password", { email: em });
      setMsg(res.data.message || "Reset OTP sent to email!");
      setEmail(em);
      setOtpStep(true);
      setForgotMode(false);

      if (res.data?.otp) {
        Alert.alert("Dev OTP (email fallback)", res.data.otp);
      }
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || "Error in forgot password");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!otp) {
      setMsg("Enter OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/verify-otp", {
        email,
        otp,
      });
      setMsg(res.data.message || "OTP verified — you can now set a new password.");
      // Navigate to reset password (we'll create this later)
      router.push({
        pathname: "/reset-password",
        params: { email },
      });
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (forgotMode) return "Forgot Password";
    if (isLogin) return "Login";
    if (otpStep) return "Verify OTP";
    return "Sign Up";
  };

  return (
    <ScrollView
      contentContainerStyle={styles.wrapper}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>{getTitle()}</Text>

        {forgotMode ? (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Pressable
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleForgot}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Sending..." : "Send Reset OTP"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.switchBtn}
              onPress={() => {
                setForgotMode(false);
                setMsg("");
              }}
            >
              <Text style={styles.switchText}>Back to Login</Text>
            </Pressable>
          </View>
        ) : otpStep ? (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              autoFocus
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.primaryBtn, styles.flex1, loading && styles.btnDisabled]}
                onPress={handleOtpVerify}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.switchBtn, styles.flex1]}
                onPress={() => {
                  setOtpStep(false);
                  setMsg("");
                }}
              >
                <Text style={styles.switchText}>Back</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
            {/* Google Login Button */}
            <Pressable
              style={[
                styles.googleButton,
                (googleLoading || loading || !request) && styles.btnDisabled,
              ]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading || !request}
            >
              <Image
                source={require("../../assets/images/google.png")}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>
                {googleLoading
                  ? "Signing in..."
                  : !request
                  ? "Initializing..."
                  : "Continue with Google"}
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeText}>
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!isLogin && (
              <View style={styles.roleSelector}>
                <Text style={styles.label}>Request special role</Text>
                <View style={styles.roleButtons}>
                  <Pressable
                    style={[
                      styles.roleBtn,
                      !requestedUploader && styles.roleBtnActive,
                    ]}
                    onPress={() => setRequestedUploader(false)}
                  >
                    <Text
                      style={[
                        styles.roleBtnText,
                        !requestedUploader && styles.roleBtnTextActive,
                      ]}
                    >
                      User
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.roleBtn,
                      requestedUploader && styles.roleBtnActive,
                    ]}
                    onPress={() => setRequestedUploader(true)}
                  >
                    <Text
                      style={[
                        styles.roleBtnText,
                        requestedUploader && styles.roleBtnTextActive,
                      ]}
                    >
                      Uploader (request approval)
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.warning}>
                  ⚠️ You'll remain a User until Admin approves. Uploader requests
                  will notify admins.
                </Text>
              </View>
            )}

            {isLogin && (
              <Pressable
                style={styles.checkboxContainer}
                onPress={() => setRemember(!remember)}
              >
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remember Me</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Text>
            </Pressable>

            {isLogin && (
              <Pressable
                style={styles.forgotBtn}
                onPress={() => {
                  setForgotMode(true);
                  setMsg("");
                }}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.switchBtn}
              onPress={() => {
                setIsLogin(!isLogin);
                setMsg("");
              }}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : "Already have an account? Login"}
              </Text>
            </Pressable>
          </View>
        )}

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    backgroundColor: "#f2f4ff",
    justifyContent: "center",
    padding: 20,
    minHeight: "100%",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    color: "#222",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 10,
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeText: {
    fontSize: 18,
  },
  primaryBtn: {
    backgroundColor: "#6c63ff",
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  switchBtn: {
    marginTop: 12,
    padding: 8,
  },
  switchText: {
    textAlign: "center",
    fontSize: 13,
    color: "#555",
  },
  forgotBtn: {
    marginTop: 8,
    padding: 8,
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: 13,
    color: "#007bff",
  },
  msg: {
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#6c63ff",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#6c63ff",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#444",
  },
  roleSelector: {
    marginTop: 12,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: "#333",
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  roleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  roleBtnActive: {
    backgroundColor: "#6c63ff",
    borderColor: "#6c63ff",
  },
  roleBtnText: {
    textAlign: "center",
    fontSize: 13,
    color: "#555",
  },
  roleBtnTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  warning: {
    fontSize: 12,
    color: "#b02",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  flex1: {
    flex: 1,
  },
  googleButton: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    color: "#333",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#999",
  },
});
