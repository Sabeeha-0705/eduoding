import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API, { fetchCourseProgress, googleLogin } from "../app/services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [courseProgress, setCourseProgress] = useState({}); // { courseId: percent }

  // load token on app start
  useEffect(() => {
    AsyncStorage.getItem("authToken").then((t) => {
      if (t) setToken(t);
    });
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
    } catch {
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
   * Handle Google login with ID token
   * This method sends the Google ID token to the backend and stores the JWT token
   * 
   * @param {string} idToken - Google ID token from OAuth flow
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  const handleGoogleLogin = async (idToken) => {
    try {
      if (!idToken) {
        return { success: false, message: "No ID token provided" };
      }

      // Send ID token to backend for verification
      const res = await googleLogin(idToken);

      if (res?.data?.token) {
        // Save token securely
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
        token,
        setToken,
        user,
        setUser,
        courseProgress,
        refreshProgress,
        handleGoogleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
