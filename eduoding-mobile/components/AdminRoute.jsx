// eduoding-mobile/components/AdminRoute.jsx
import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function AdminRoute({ children }) {
  const auth = useAuth();
  const { user, token, loading } = auth || { user: null, token: null, loading: true };

  useEffect(() => {
    if (loading) return;

    if (!token) {
      router.replace("/auth/login");
    } else if (!user || user?.role !== "admin") {
      router.replace("/(tabs)");
    }
  }, [token, user, loading, router]);

  if (loading || (token && !user)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

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

