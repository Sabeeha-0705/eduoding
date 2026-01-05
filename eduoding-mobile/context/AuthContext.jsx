import { createContext, useContext } from "react";

// Minimal no-op AuthContext for temporary no-auth mobile mode
const AuthContext = createContext({});

export function AuthProvider({ children }) {
  // Provider simply renders children; no auth state is tracked
  return children;
}

export const useAuth = () => {
  // Return a stable, non-loading, no-auth object to prevent crashes
  return {
    user: null,
    token: null,
    loading: false,
    googleLogin: async () => ({ success: false, message: "Auth disabled" }),
    logout: async () => {},
    login: async () => ({ success: false, message: "Auth disabled" }),
    courseProgress: {},
    refreshProgress: async () => {},
    setToken: () => {},
    setUser: () => {},
  };
};
