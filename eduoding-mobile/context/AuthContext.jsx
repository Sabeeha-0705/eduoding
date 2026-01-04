import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API, { fetchCourseProgress, googleLogin as googleLoginAPI } from "../services/api";

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  googleLogin: async () => ({ success: false, message: "Not initialized" }),
  logout: async () => {},
  login: async () => ({ success: false, message: "Not initialized" }),
  courseProgress: {},
  refreshProgress: async () => {},
  setToken: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState({});

  // load token on app start
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const t = await AsyncStorage.getItem("authToken");
        if (t) {
          setToken(t);
        } else {
          setToken(null);
        }
      } catch (err) {
        console.error("Failed to load auth token:", err);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  // decode token
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        id: payload.id,
        email: payload.email,
        role: payload.role,
      });
    } catch (err) {
      console.error("Failed to decode token:", err);
      setUser(null);
    }
  }, [token]);

  async function refreshProgress(courseId) {
    try {
      const res = await fetchCourseProgress(courseId);
      setCourseProgress((prev) => ({
        ...prev,
        [courseId]: res.data.completedPercent,
      }));
    } catch (err) {
      console.error("refreshProgress failed", err);
    }
  }

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  const login = async (email, password, remember = false) => {
    try {
      const res = await API.post("/auth/login", {
        email: email.toLowerCase().trim(),
        password,
      });

      if (res?.data?.token) {
        await AsyncStorage.setItem("authToken", res.data.token);
        setToken(res.data.token);
        return { success: true, message: "Login successful" };
      } else {
        return { success: false, message: "Login failed: no token returned" };
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Login failed";
      return { success: false, message: errorMessage };
    }
  };

  /**
   * Handle Google login with ID token
   * @param {string} token - Google ID token from OAuth flow
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  const googleLogin = async (token) => {
    try {
      if (!token) {
        return { success: false, message: "No ID token provided" };
      }

      const res = await googleLoginAPI(token);

      if (res?.data?.token) {
        await AsyncStorage.setItem("authToken", res.data.token);
        setToken(res.data.token);
        return { success: true, message: "Google login successful" };
      } else {
        return { success: false, message: "No token returned from backend" };
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Google login failed";
      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
    setCourseProgress({});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        googleLogin,
        logout,
        token,
        setToken,
        setUser,
        courseProgress,
        refreshProgress,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      loading: true,
      googleLogin: async () => ({ success: false, message: "AuthContext not available" }),
      logout: async () => {},
      login: async () => ({ success: false, message: "AuthContext not available" }),
      courseProgress: {},
      refreshProgress: async () => {},
      setToken: () => {},
      setUser: () => {},
    };
  }
  return context;
};
