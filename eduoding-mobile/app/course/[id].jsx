// eduoding-mobile/app/course/[id].jsx - CoursePage
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
import { useLocalSearchParams, useRouter } from "expo-router";
import API from "../../services/api";

export default function CoursePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const allCourses = [
    {
      id: "1",
      title: "Full Stack Web Development (MERN)",
      desc: "Learn MongoDB, Express, React, Node.js with real projects.",
    },
    {
      id: "2",
      title: "Data Science & AI",
      desc: "Master Python, Machine Learning, and AI applications.",
    },
    {
      id: "3",
      title: "Cloud & DevOps",
      desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines.",
    },
    {
      id: "4",
      title: "Cybersecurity & Ethical Hacking",
      desc: "Protect systems, learn penetration testing & network security.",
    },
    {
      id: "5",
      title: "UI/UX Design",
      desc: "Design modern apps using Figma, wireframes & prototypes.",
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch videos/lessons from backend
        const res = await API.get(`/courses/${id}/videos`);
        const serverVideos = Array.isArray(res.data) ? res.data : [];

        const normalized = serverVideos.map((v) => ({
          _id: v._id || v.id,
          title: v.title || v.name || v.videoTitle || "Untitled",
          youtubeUrl:
            v.youtubeUrl ||
            v.videoUrl ||
            (v.url && v.url.includes("youtube") ? v.url : undefined),
          fileUrl:
            v.fileUrl ||
            v.videoUrl ||
            (v.url && !v.url.includes("youtube") ? v.url : undefined),
          sourceType: v.sourceType || (v.youtubeUrl ? "youtube" : "upload"),
        }));

        setLessons(normalized);

        // Course details
        const selected = allCourses.find((c) => c.id === id);
        setCourse(selected || { id, title: `Course ${id}`, desc: "" });

        // Progress for this course
        try {
          const progRes = await API.get("/progress");
          const userProgressList = Array.isArray(progRes.data)
            ? progRes.data
            : [];
          const userProgress = userProgressList.find(
            (p) =>
              String(p.courseId) === String(id) ||
              String(p.courseId || "").endsWith(String(id))
          );
          setProgress(Number(userProgress?.completedPercent || 0));
        } catch (err) {
          console.error("Progress fetch error:", err);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        Alert.alert("Error", "Failed to load course data");
        setLessons([]);
        const selected = allCourses.find((c) => c.id === id);
        setCourse(selected || { id, title: `Course ${id}`, desc: "" });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Course not found!</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Course</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.desc}>{course.desc}</Text>

        {/* Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>Progress: {progress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Lessons */}
        <Text style={styles.lessonsTitle}>Lessons</Text>
        {lessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No lessons available yet.</Text>
          </View>
        ) : (
          lessons.map((lesson, idx) => (
            <Pressable
              key={lesson._id}
              style={styles.lessonCard}
              onPress={() => router.push(`/course/${id}/lesson/${lesson._id}`)}
            >
              <View style={styles.lessonHeader}>
                <Text style={styles.lessonNumber}>{idx + 1}.</Text>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
              </View>
              <Text style={styles.lessonButton}>Open Lesson →</Text>
            </Pressable>
          ))
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: "#6c63ff",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  desc: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  progressSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6c63ff",
  },
  lessonsTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 16,
  },
  lessonCard: {
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
  lessonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  lessonNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  lessonTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  lessonButton: {
    fontSize: 14,
    color: "#6c63ff",
    fontWeight: "600",
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#ff4d4f",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignSelf: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
