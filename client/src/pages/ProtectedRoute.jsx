// src/pages/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");


  // token illa na => login page ku redirect
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
