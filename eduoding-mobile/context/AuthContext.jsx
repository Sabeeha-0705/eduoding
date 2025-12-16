import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadToken();
  }, []);

  async function loadToken() {
    const saved = await AsyncStorage.getItem("authToken");
    if (saved) {
      setToken(saved);
      decodeUser(saved);
    }
  }

  function decodeUser(jwt) {
    try {
      const payload = JSON.parse(
        atob(jwt.split(".")[1])
      );
      setUser({
        id: payload.id,
        email: payload.email,
        role: payload.role,
      });
    } catch {
      setUser(null);
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, setToken, user, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
