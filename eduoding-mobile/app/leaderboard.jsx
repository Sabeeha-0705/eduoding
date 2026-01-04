// eduoding-mobile/app/leaderboard.jsx - Leaderboard
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import API from "../services/api";

const DEFAULT_AVATAR = require("../assets/images/default-avatar.png");

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await API.get("/leaderboard");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Leaderboard load failed:", err);
      setUsers([]);
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchLeaderboard();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading leaderboard…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading leaderboard. Check console / network.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        <Text style={styles.headerSubtitle}>Top learners by points</Text>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users yet.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.rankCol]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.userCol]}>User</Text>
              <Text style={[styles.tableHeaderCell, styles.pointsCol]}>Points</Text>
              <Text style={[styles.tableHeaderCell, styles.badgesCol]}>Badges</Text>
              <Text style={[styles.tableHeaderCell, styles.roleCol]}>Role</Text>
            </View>
            {users.map((u, i) => (
              <View key={u._id || i} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.rankCol]}>{i + 1}</Text>
                <View style={[styles.tableCell, styles.userCol]}>
                  <View style={styles.userInfo}>
                    <Image
                      source={
                        u.avatarUrl || u.avatar
                          ? { uri: u.avatarUrl || u.avatar }
                          : DEFAULT_AVATAR
                      }
                      style={styles.avatar}
                    />
                    <Text style={styles.username}>
                      {u.username || u.email || "Anonymous"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, styles.pointsCol]}>
                  {Number(u.points || 0)}
                </Text>
                <Text style={[styles.tableCell, styles.badgesCol]}>
                  {Array.isArray(u.badges) && u.badges.length ? (
                    <Text>🏅 {u.badges.join(", ")}</Text>
                  ) : (
                    "—"
                  )}
                </Text>
                <Text style={[styles.tableCell, styles.roleCol]}>
                  {u.role || "user"}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    fontSize: 14,
    color: "#ff4d4f",
    textAlign: "center",
    marginTop: 20,
  },
  content: {
    flex: 1,
  },
  table: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tableCell: {
    fontSize: 14,
    color: "#333",
    paddingVertical: 4,
  },
  rankCol: {
    width: 40,
  },
  userCol: {
    flex: 1,
    paddingRight: 8,
  },
  pointsCol: {
    width: 70,
    textAlign: "right",
  },
  badgesCol: {
    width: 100,
  },
  roleCol: {
    width: 60,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    flex: 1,
  },
});

