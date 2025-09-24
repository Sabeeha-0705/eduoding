// client/src/pages/AdminRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context";

export default function AdminRoute({ children }) {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/auth" replace />;
  if (!user || user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}
