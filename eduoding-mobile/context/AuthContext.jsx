import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../app/services/api";



const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

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
      const payload = JSON.parse(
        atob(token.split(".")[1])
      );
      setUser({
        id: payload.id,
        email: payload.email,
        role: payload.role,
      });
    } catch {
      setUser(null);
    }
  }, [token]);

  const logout = async () => {
    await AsyncStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, setToken, user, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
