// eduoding-mobile/components/ProtectedRoute.jsx
import { useEffect } from "react";
import { router, useSegments } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function ProtectedRoute({ children }) {
  const { token, user } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (token === null) {
      // Not loaded yet, wait
      return;
    }

    const inAuthGroup = segments[0] === "auth";

    if (!token && !inAuthGroup) {
      // Redirect to auth if not authenticated
      router.replace("/auth/auth");
    } else if (token && inAuthGroup) {
      // Redirect to dashboard if authenticated
      router.replace("/(tabs)");
    }
  }, [token, segments]);

  // Show loading while checking auth
  if (token === null && segments[0] !== "auth") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
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

