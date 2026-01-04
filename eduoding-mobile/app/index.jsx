import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const router = useRouter();
  const auth = useAuth();
  const { user, loading } = auth || { user: null, loading: true };
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    const timer = setTimeout(() => {
      if (!user) {
        router.replace("/auth/login");
      } else {
        router.replace("/(tabs)");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, router, mounted]);

  if (loading || !mounted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return null;
}

