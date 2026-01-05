// eduoding-mobile/app/admin/requests.jsx - AdminRequests
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import API from "../../services/api";
import AdminRoute from "../../components/AdminRoute";

function AdminRequestsContent() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await API.get("/admin/uploader-requests");
        setRequests(res.data || []);
      } catch (e) {
        console.error("Fetch uploader requests failed:", e);
        setErr(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load uploader requests"
        );
      } finally {
        setLoading(false);
      }
    };

    // Attempt to fetch (may fail without auth) — handle error gracefully
    fetchRequests();
  }, []);

  const approve = async (id) => {
    Alert.alert("Approve User", "Approve this user as uploader?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        style: "default",
        onPress: async () => {
          try {
            await API.put(`/admin/approve-uploader/${id}`);
            setRequests((r) => r.filter((u) => u._id !== id));
            Alert.alert("Success", "User approved as uploader ✅");
          } catch (e) {
            console.error("Approve failed:", e);
            Alert.alert(
              "Error",
              e?.response?.data?.message || e?.message || "Approve failed."
            );
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {err}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Uploader Requests</Text>
        <View style={styles.headerSpacer} />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No requests at the moment.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {requests.map((u) => (
            <View key={u._id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.username}>{u.username || u.email}</Text>
                <Text style={styles.email}>{u.email}</Text>
                {u.requestedUploader && (
                  <Text style={styles.requestedLabelText}>
                    Requested uploader
                  </Text>
                )}
              </View>

              <View style={styles.requestActions}>
                <Pressable
                  style={styles.approveButton}
                  onPress={() => approve(u._id)}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </Pressable>

                <Pressable
                  style={styles.viewButton}
                  onPress={() => router.push(`/admin/user/${u._id}`)}
                >
                  <Text style={styles.viewButtonText}>View</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function AdminRequests() {
  return (
    <AdminRoute>
      <AdminRequestsContent />
    </AdminRoute>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#6c63ff",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    flex: 1,
    marginLeft: 12,
  },
  headerSpacer: {
    width: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 14,
    color: "#ff4d4f",
    padding: 16,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  requestedLabelText: {
    fontSize: 12,
    color: "#0a66c2",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#16a34a",
    borderRadius: 6,
  },
  approveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
  },
  viewButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
});
