// eduoding-mobile/app/badges.jsx - BadgesPage
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from "react-native";
import API from "../services/api";

export default function BadgesPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/users/me").catch(() => API.get("/auth/profile"));
        const u = res.data?.user || res.data;
        setUser(u);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading badges…</Text>
      </View>
    );
  }

  const badges = Array.isArray(user?.badges) ? user.badges.slice().reverse() : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Badges</Text>
        <Text style={styles.headerSubtitle}>
          Congrats! Badges are awarded for milestones and first code challenge passes.
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.heroSection}>
          <Image
            source={require("../assets/images/cup.png")}
            style={styles.cupImage}
            resizeMode="contain"
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.username || user?.email || "Learner"}</Text>
            <Text style={styles.points}>
              Points: <Text style={styles.pointsBold}>{user?.points ?? 0}</Text>
            </Text>
            <Text style={styles.badgeCount}>
              {user?.badges && user.badges.length
                ? `${user.badges.length} badge(s)`
                : "No badges yet"}
            </Text>
          </View>
        </View>

        <View style={styles.badgesList}>
          {badges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No badges yet — complete code challenges and quizzes to earn badges.
              </Text>
            </View>
          ) : (
            badges.map((b, i) => (
              <View key={i} style={styles.badgeCard}>
                <Image
                  source={require("../assets/images/badge-icon.png")}
                  style={styles.badgeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.badgeTitle}>{b}</Text>
                <Text style={styles.badgeDate}>Awarded: —</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  content: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: "#fff",
    padding: 24,
    margin: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cupImage: {
    width: 80,
    height: 80,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  points: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  pointsBold: {
    fontWeight: "700",
    color: "#222",
  },
  badgeCount: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  badgesList: {
    padding: 16,
    gap: 12,
  },
  badgeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  badgeDate: {
    fontSize: 12,
    color: "#999",
  },
  emptyContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

