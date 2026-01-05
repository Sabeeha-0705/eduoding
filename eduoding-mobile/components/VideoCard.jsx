// eduoding-mobile/components/VideoCard.jsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function VideoCard({ video }) {
  const router = useRouter();
  const title = video.title || video.name || "Untitled";
  const status = video.status || "pending";
  const createdAt = video.createdAt
    ? new Date(video.createdAt).toLocaleDateString()
    : "";

  const getStatusColor = () => {
    switch (status) {
      case "approved":
        return "#4caf50";
      case "rejected":
        return "#ff4d4f";
      default:
        return "#ff9800";
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.meta}>
        <Text style={styles.status} style={{ color: getStatusColor() }}>
          Status: {status}
        </Text>
        {createdAt && <Text style={styles.date}>{createdAt}</Text>}
      </View>
      {video.description && (
        <Text style={styles.description}>{video.description}</Text>
      )}
      {video.courseId && (
        <Pressable
          style={styles.viewButton}
          onPress={() => router.push(`/course/${video.courseId}`)}
        >
          <Text style={styles.viewButtonText}>View Course</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
