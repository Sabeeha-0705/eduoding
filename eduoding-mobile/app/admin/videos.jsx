// eduoding-mobile/app/admin/videos.jsx - AdminVideos
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

function AdminVideosContent() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(new Set());
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      setLoading(true);
      try {
        const res = await API.get("/admin/videos/pending");
        const payload = res.data?.videos || [];
        if (mounted) setVideos(payload);
      } catch (err) {
        console.error("Failed to fetch pending videos", err);
        Alert.alert("Error", "Failed to load videos. Check console.");
        if (mounted) setVideos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPending();
    return () => {
      mounted = false;
    };
  }, []);

  const changeStatus = async (id, newStatus) => {
    if (approving.has(id)) return;
    setApproving((s) => new Set(s).add(id));
    try {
      await API.put(`/admin/videos/${id}/status`, { status: newStatus });
      setVideos((v) => v.filter((x) => x._id !== id));
      Alert.alert("Success", "✅ Video updated");
    } catch (err) {
      console.error("Change status failed", err);
      Alert.alert("Error", "Failed to update. See console.");
    } finally {
      setApproving((s) => {
        const copy = new Set(s);
        copy.delete(id);
        return copy;
      });
    }
  };

  const handleReject = (id) => {
    Alert.alert("Reject Video", "Reject this video?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => changeStatus(id, "rejected"),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Pending Videos</Text>
        <View style={styles.headerSpacer} />
      </View>

      {videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pending videos 🎉</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {videos.map((video) => {
            const isBusy = approving.has(video._id);
            const uploaderName =
              (video.uploaderId &&
                (video.uploaderId.username || video.uploaderId.email)) ||
              "Uploader";
            return (
              <View key={video._id} style={styles.videoCard}>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoMeta}>By: {uploaderName}</Text>
                  <Text style={styles.videoMeta}>Status: {video.status}</Text>
                  {video.description && (
                    <Text style={styles.videoDescription}>
                      {video.description}
                    </Text>
                  )}
                </View>
                <View style={styles.videoActions}>
                  <Pressable
                    style={[
                      styles.approveButton,
                      isBusy && styles.buttonDisabled,
                    ]}
                    disabled={isBusy}
                    onPress={() => changeStatus(video._id, "approved")}
                  >
                    <Text style={styles.approveButtonText}>
                      {isBusy ? "Working…" : "Approve"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.rejectButton,
                      isBusy && styles.buttonDisabled,
                    ]}
                    disabled={isBusy}
                    onPress={() => handleReject(video._id)}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default function AdminVideos() {
  return (
    <AdminRoute>
      <AdminVideosContent />
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
  content: {
    flex: 1,
    padding: 16,
  },
  videoCard: {
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
  videoInfo: {
    flex: 1,
    marginRight: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
  },
  videoMeta: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
  },
  videoActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#16a34a",
    borderRadius: 6,
  },
  approveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#ef4444",
    borderRadius: 6,
  },
  rejectButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
