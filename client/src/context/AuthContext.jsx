import React, { createContext, useContext, useState, useEffect } from "react";
import API, { fetchCourseProgress } from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
  const [user, setUser] = useState(null);
  const [courseProgress, setCourseProgress] = useState({}); // { courseId: percent }

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({ id: payload.id, email: payload.email, role: payload.role });
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

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        user,
        setUser,
        courseProgress,
        refreshProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
