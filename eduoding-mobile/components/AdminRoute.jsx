// eduoding-mobile/components/AdminRoute.jsx
import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function AdminRoute({ children }) {
  const { user, token } = useAuth();

  useEffect(() => {
    if (token === null) {
      // Not loaded yet, wait
      return;
    }

    if (!token) {
      router.replace("/auth/auth");
    } else if (!user || user.role !== "admin") {
      router.replace("/(tabs)");
    }
  }, [token, user]);

  // Show loading while checking auth
  if (token === null || (token && !user)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  // If not admin, return null (redirect will happen)
  if (token && user && user.role !== "admin") {
    return null;
  }

  return children;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

