// eduoding-mobile/components/ProtectedRoute.jsx
import { useEffect } from "react";
import { router, useSegments } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  const { token, loading } = auth || { token: null, loading: true };
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!token && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (token && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [token, loading, segments]);

  if (loading) {
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

