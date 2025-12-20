// eduoding-mobile/app/uploader/dashboard.jsx - UploaderDashboard
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { getMyVideos } from "../services/videos";
import VideoCard from "../../components/VideoCard";

export default function UploaderDashboard() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getMyVideos();
        setVideos(res.data || []);
      } catch (e) {
        setErr(e.response?.data?.message || e.message || "Failed to load videos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Uploader Dashboard</Text>
        <Pressable
          style={styles.uploadButton}
          onPress={() => router.push("/uploader/upload")}
        >
          <Text style={styles.uploadButtonText}>+ Upload Video</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : err ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No uploads yet</Text>
          <Pressable
            style={styles.uploadButtonLarge}
            onPress={() => router.push("/uploader/upload")}
          >
            <Text style={styles.uploadButtonLargeText}>Upload your first video</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {videos.map((v) => (
            <VideoCard key={v._id} video={v} />
          ))}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
  },
  uploadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#ff4d4f",
    textAlign: "center",
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
    marginBottom: 20,
  },
  uploadButtonLarge: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  uploadButtonLargeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

