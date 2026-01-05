// eduoding-mobile/app/(tabs)/index.jsx - Dashboard
import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  // No auth: treat as no user
  const user = null;

  const [activeTab, setActiveTab] = useState("courses");
  const [notes, setNotes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [certCount, setCertCount] = useState(0);
  const mountedRef = useRef(true);
  const router = useRouter();

  // Normalize progress list
  const normalizeProgressList = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const map = {};
    arr.forEach((p) => {
      const key = String(p.courseId ?? p.course ?? "");
      map[key] = { ...p, completedPercent: Number(p.completedPercent || 0) };
    });
    return map;
  };

  // Fetch certificates count (public endpoint)
  const fetchCertificatesCount = useCallback(async () => {
    try {
      const res = await API.get("/certificates");
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.certificates || [];
      if (mountedRef.current) setCertCount(list.length);
    } catch {
      if (mountedRef.current) setCertCount(0);
    }
  }, []);

  // Fetch all dashboard data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await fetchCertificatesCount();

      // Notes
      try {
        const notesRes = await API.get("/notes");
        if (mountedRef.current) setNotes(notesRes.data || []);
      } catch {
        if (mountedRef.current) setNotes([]);
      }

      // Courses
      try {
        const coursesRes = await API.get("/courses");
        const serverCourses = Array.isArray(coursesRes.data)
          ? coursesRes.data
          : coursesRes.data?.courses || [];
        if (mountedRef.current) {
          setCourses(
            serverCourses.map((c) => ({
              id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title),
              title: c.title || c.name || `Course ${c._id}`,
              desc: c.description || c.desc || "",
            }))
          );
        }
      } catch {
        if (mountedRef.current) setCourses(null);
      }

      // Progress
      try {
        const progRes = await API.get("/progress");
        const list = progRes.data || [];
        if (mountedRef.current) {
          setProgressData(list);
          setProgressMap(normalizeProgressList(list));
        }
      } catch {
        if (mountedRef.current) {
          setProgressData([]);
          setProgressMap({});
        }
      }
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchCertificatesCount]);

  useEffect(() => {
    mountedRef.current = true;

    // No auth gating - just fetch data
    fetchAll();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchAll]);

  const handleDeleteNote = async (noteId) => {
    try {
      await API.delete(`/notes/${noteId}`);
      setNotes((n) => n.filter((x) => x._id !== noteId));
    } catch (err) {
      Alert.alert("Error", "Failed to delete note");
    }
  };

  const getProgressForCourse = (courseId) => {
    if (!progressMap) return 0;
    const cid = String(courseId);
    return Math.round(progressMap[cid]?.completedPercent || 0);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll().finally(() => setRefreshing(false));
  }, [fetchAll]);

  const fallbackCourses = [
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

  const effectiveCourses =
    Array.isArray(courses) && courses.length ? courses : fallbackCourses;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Eduoding</Text>
        <Pressable onPress={() => router.push("/settings")}>
          <Text style={styles.headerIcon}>⚙</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["courses", "notes", "progress"].map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "courses" && "📘 "}
              {tab === "notes" && "📝 "}
              {tab === "progress" && "📊 "}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "courses" && (
          <View style={styles.coursesContainer}>
            <Text style={styles.sectionTitle}>
              Welcome, {user?.username || user?.email}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Select a course and start learning 🚀
            </Text>

            {/* Certificates Card */}
            <Pressable
              style={styles.certCard}
              onPress={() => router.push("/certificates")}
            >
              <Text style={styles.certCardTitle}>🎓 My Certificates</Text>
              <Text style={styles.certCardCount}>{certCount} earned</Text>
              <Text style={styles.certCardButton}>View Certificates →</Text>
            </Pressable>

            {/* Courses */}
            {effectiveCourses.map((course) => {
              const progress = getProgressForCourse(course.id);
              return (
                <Pressable
                  key={course.id}
                  style={styles.courseCard}
                  onPress={() => router.push(`/course/${course.id}`)}
                >
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseDesc}>{course.desc}</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${progress}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{progress}% Completed</Text>
                  <Text style={styles.courseButton}>
                    {progress === 100 ? "Review Course" : "Continue"} →
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {activeTab === "notes" && (
          <View style={styles.notesContainer}>
            <Text style={styles.sectionTitle}>📝 Your Notes</Text>
            {notes.length > 0 ? (
              notes.map((note) => (
                <View key={note._id} style={styles.noteItem}>
                  <Text style={styles.noteText}>
                    {note.content || note.text || ""}
                  </Text>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteNote(note._id)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No notes yet — take notes while watching lessons.
                </Text>
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => setActiveTab("courses")}
                >
                  <Text style={styles.emptyButtonText}>Go to Courses</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {activeTab === "progress" && (
          <View style={styles.progressContainer}>
            <Text style={styles.sectionTitle}>📊 Progress</Text>
            {progressData.length > 0 ? (
              progressData.map((p) => (
                <View
                  key={p._id || `${p.courseId}`}
                  style={styles.progressItem}
                >
                  <Text style={styles.progressItemText}>
                    Course {String(p.courseId)}:{" "}
                    {Math.round(p.completedPercent)}%
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No progress yet. Join a course to track progress.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* User Stats Footer */}
        <View style={styles.statsFooter}>
          <Text style={styles.statsTitle}>Stats</Text>
          <Text style={styles.statsText}>
            🔥 Streak: {user?.streakCount ?? 0} days
          </Text>
          <Text style={styles.statsText}>💎 Points: {user?.points ?? 0}</Text>
          <Text style={styles.statsText}>
            🏅 Badges:{" "}
            {user?.badges?.length
              ? user.badges.map((b, i) => (
                  <Text key={i} style={styles.badgeText}>
                    {b}{" "}
                  </Text>
                ))
              : "—"}
          </Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#0f1724",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerIcon: {
    fontSize: 20,
    color: "#fff",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#6c63ff",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#6c63ff",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  coursesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  certCard: {
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
  certCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  certCardCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  certCardButton: {
    fontSize: 14,
    color: "#6c63ff",
    fontWeight: "600",
  },
  courseCard: {
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
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  courseDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6c63ff",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  courseButton: {
    fontSize: 14,
    color: "#6c63ff",
    fontWeight: "600",
  },
  notesContainer: {
    padding: 16,
  },
  noteItem: {
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
  noteText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
  },
  deleteBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ff4d4f",
    borderRadius: 6,
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  progressContainer: {
    padding: 16,
  },
  progressItem: {
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
  progressItemText: {
    fontSize: 14,
    color: "#333",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statsFooter: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 14,
    color: "#333",
  },
});
