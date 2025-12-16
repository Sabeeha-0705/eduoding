// app/(tabs)/index.jsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function HomeScreen() {
  const { token, user, logout } = useAuth();
  const [ready, setReady] = useState(false);

  // 🟢 wait till RootLayout + context ready
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!token) {
      router.replace("/auth"); // auth.jsx
    }
  }, [ready, token]);

  if (!ready || !token) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Eduoding 🎓</Text>

      <Text style={styles.subtitle}>
        Logged in as: {user?.email}
      </Text>

      <Text style={styles.role}>
        Role: {user?.role}
      </Text>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
  },
  role: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
  },
  logoutBtn: {
    backgroundColor: "#ff4d4f",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
  },
});
