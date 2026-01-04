import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import Constants from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import { Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const getGoogleClientId = () => {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  return extra.GOOGLE_CLIENT_ID;
};

export default function LoginScreen() {
  const auth = useAuth();
  const { login, googleLogin } = auth || { login: async () => ({ success: false, message: "Not initialized" }), googleLogin: async () => ({ success: false, message: "Not initialized" }) };
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [remember, setRemember] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");

  const clientId = getGoogleClientId();
  const redirectUri = makeRedirectUri({ useProxy: true });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId,
    scopes: ["profile", "email"],
    redirectUri,
  });

  useEffect(() => {
    if (!response) return;
    
    if (response.type === "success") {
      const idToken = response.authentication?.idToken || response.params?.id_token || null;
      if (idToken) {
        handleGoogleAuthSuccess(idToken);
      } else {
        setGoogleLoading(false);
        setMsg("Google login failed: No ID token received");
      }
    } else if (response.type === "error") {
      setGoogleLoading(false);
      setMsg("Google login failed");
    } else if (response.type === "cancel") {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (idToken) => {
    if (!idToken || !googleLogin) {
      setGoogleLoading(false);
      setMsg("Google login failed: Invalid configuration");
      return;
    }
    
    try {
      setGoogleLoading(true);
      setMsg("");
      const result = await googleLogin(idToken);
      
      if (result?.success) {
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 100);
      } else {
        setMsg(result?.message || "Google login failed");
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google login error:", err);
      setMsg(err?.message || "Google login failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!clientId) {
      setMsg("Google login is not configured");
      return;
    }
    if (!request) {
      setMsg("Google login is initializing. Please wait...");
      return;
    }
    
    setGoogleLoading(true);
    setMsg("");
    try {
      await promptAsync();
    } catch (err) {
      setMsg("Failed to start Google login");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setMsg("");
    if (!email || !password) {
      setMsg("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const result = await login(email, password, remember);
      
      if (result.success) {
        router.replace("/(tabs)");
      } else {
        setMsg(result.message || "Login failed");
        setLoading(false);
      }
    } catch (err) {
      setMsg(err.message || "Login failed");
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

  if (forgotMode) {
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
          <Text style={styles.title}>Forgot Password</Text>
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
          {msg ? <Text style={styles.msg}>{msg}</Text> : null}
        </View>
      </ScrollView>
    );
  }

  if (otpStep) {
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
          <Text style={styles.title}>Verify OTP</Text>
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
          {msg ? <Text style={styles.msg}>{msg}</Text> : null}
        </View>
      </ScrollView>
    );
  }

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

        <Text style={styles.title}>Login</Text>

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

        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setRemember(!remember)}
        >
          <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
            {remember && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Remember Me</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? "Please wait..." : "Login"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.forgotBtn}
          onPress={() => {
            setForgotMode(true);
            setMsg("");
          }}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          style={styles.switchBtn}
          onPress={() => router.replace("/auth/signup")}
        >
          <Text style={styles.switchText}>
            Don't have an account? Sign Up
          </Text>
        </Pressable>

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
  msg: {
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
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
  forgotBtn: {
    marginTop: 8,
    padding: 8,
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: 13,
    color: "#007bff",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  flex1: {
    flex: 1,
  },
});

