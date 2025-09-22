// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || null
  );
  const [user, setUser] = useState(null);

  // inside useEffect in AuthProvider
useEffect(() => {
  if (!token) { setUser(null); return; }
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));
    setUser({ email: json.email, id: json.id, role: json.role }); // if your JWT includes role
  } catch (e) {
    setUser(null);
  }
}, [token]);


  return (
    <AuthContext.Provider value={{ token, setToken, user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
