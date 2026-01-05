// eduoding-mobile/app/course/[courseId]/lesson/[lessonId].jsx - LessonPage
import { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import API from "../../../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LessonPage() {
  const { courseId, lessonId } = useLocalSearchParams();
  const router = useRouter();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState(null);
  const [hasQuiz, setHasQuiz] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const [updating, setUpdating] = useState(false);
  const debounceRef = useRef(null);

  const toEmbed = (url) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/"))
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await API.get(`/courses/${courseId}/videos`);
        setVideos(res.data || []);

        const p = await API.get(`/progress/${courseId}`);
        setCompletedIds(p.data?.completedLessonIds || []);
      } catch (e) {
        setErr(
          e?.response?.data?.message || e.message || "Failed to load videos"
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId]);

  useEffect(() => {
    let mounted = true;
    const checkQuiz = async () => {
      setHasQuiz(null);
      try {
        const res = await API.get(`/quiz/${courseId}`);
        if (!mounted) return;
        setHasQuiz(res?.status >= 200 && res?.status < 300);
      } catch (e) {
        if (!mounted) return;
        setHasQuiz(false);
      }
    };
    checkQuiz();
    return () => (mounted = false);
  }, [courseId]);

  const currentVideo = useMemo(() => {
    if (!videos?.length) return null;
    if (lessonId) {
      return (
        videos.find((v) => String(v._id) === String(lessonId)) || videos[0]
      );
    }
    return videos[0];
  }, [videos, lessonId]);

  const loadLocalOrBackendNote = async () => {
    if (!currentVideo) return setNote("");
    const key = `note-${courseId}-${currentVideo._id}`;

    try {
      const res = await API.get("/notes");
      const notes = Array.isArray(res.data) ? res.data : [];
      const my = notes.find(
        (n) =>
          String(n.lessonId || "") === String(currentVideo._id) &&
          (String(n.courseId || "") === String(courseId) || !n.courseId)
      );
      if (my) {
        setNote(my.content || "");
        setNoteId(my._id || null);
        await AsyncStorage.setItem(key, my.content || "");
        return;
      }
    } catch (e) {
      // fallback to AsyncStorage
    }

    const saved = (await AsyncStorage.getItem(key)) || "";
    setNote(saved || "");
    setNoteId(null);
  };

  useEffect(() => {
    loadLocalOrBackendNote();
  }, [currentVideo?._id, courseId]);

  const saveNote = async () => {
    if (!currentVideo) {
      Alert.alert("Error", "Select a lesson first.");
      return;
    }
    const key = `note-${courseId}-${currentVideo._id}`;
    const payload = {
      content: note,
      courseId,
      lessonId: currentVideo._id,
    };

    setUpdating(true);
    try {
      let res;
      if (noteId) {
        try {
          res = await API.put(`/notes/${noteId}`, payload);
        } catch (err) {
          res = await API.post("/notes", payload);
        }
      } else {
        res = await API.post("/notes", payload);
      }

      const savedNote = res.data;
      setNoteId(savedNote._id || savedNote.id || null);
      await AsyncStorage.setItem(key, savedNote.content || note || "");
      Alert.alert("Success", "✅ Note saved to server!");
    } catch (err) {
      console.error("Save note failed:", err);
      await AsyncStorage.setItem(key, note);
      Alert.alert(
        "Saved Locally",
        "Saved locally (offline). Will sync when network available."
      );
    } finally {
      setUpdating(false);
    }
  };

  const toggleCompleted = async (lessonIdParam, completed) => {
    if (updating) return;
    setUpdating(true);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const totalLessons = videos?.length || 0;
        const res = await API.post(`/progress/${courseId}/lesson`, {
          lessonId: lessonIdParam,
          completed,
          totalLessons,
        });

        const newCompleted = res.data?.completedLessonIds || [];
        setCompletedIds(newCompleted.map(String));
      } catch (e) {
        console.error("toggle complete failed", e);
        Alert.alert("Error", "Failed to update progress.");
      } finally {
        setUpdating(false);
      }
    }, 300);
  };

  const markComplete = async (lessonIdParam) => {
    await toggleCompleted(lessonIdParam, true);
  };

  const goPrev = () => {
    if (!currentVideo) return;
    const idx = videos.findIndex(
      (l) => String(l._id) === String(currentVideo._id)
    );
    if (idx > 0)
      router.push(`/course/${courseId}/lesson/${videos[idx - 1]._id}`);
  };

  const goNext = () => {
    if (!currentVideo) return;
    const idx = videos.findIndex(
      (l) => String(l._id) === String(currentVideo._id)
    );
    if (idx < videos.length - 1) {
      router.push(`/course/${courseId}/lesson/${videos[idx + 1]._id}`);
    } else {
      // If last lesson, mark complete and maybe show quiz option
      markComplete(currentVideo._id);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading lessons…</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{err}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!currentVideo) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Lesson not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isCompleted = completedIds.includes(String(currentVideo._id));
  const videoUrl =
    currentVideo?.sourceType === "youtube" || currentVideo?.youtubeUrl
      ? toEmbed(currentVideo?.youtubeUrl)
      : currentVideo?.fileUrl;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.push(`/course/${courseId}`)}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Lesson</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>{currentVideo?.title}</Text>

        {/* Completion Toggle */}
        <View style={styles.completionRow}>
          <Text style={styles.completionLabel}>Mark as completed</Text>
          <Switch
            value={isCompleted}
            onValueChange={(value) => toggleCompleted(currentVideo._id, value)}
            disabled={updating}
          />
        </View>

        {/* Video Container */}
        <View style={styles.videoContainer}>
          {currentVideo?.sourceType === "youtube" ||
          currentVideo?.youtubeUrl ? (
            <WebView
              source={{ uri: `${videoUrl}?enablejsapi=1` }}
              style={styles.video}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
            />
          ) : (
            <WebView
              source={{ uri: videoUrl }}
              style={styles.video}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              onMessage={(event) => {
                // Handle video end event if needed
                if (event.nativeEvent.data === "video-ended") {
                  markComplete(currentVideo._id);
                }
              }}
            />
          )}
        </View>

        {/* Navigation */}
        <View style={styles.pager}>
          <Pressable
            style={[
              styles.pagerBtn,
              !videos.findIndex(
                (l) => String(l._id) === String(currentVideo._id)
              ) && styles.pagerBtnDisabled,
            ]}
            onPress={goPrev}
          >
            <Text style={styles.pagerBtnText}>◀ Prev</Text>
          </Pressable>
          <Pressable
            style={[
              styles.pagerBtn,
              videos.findIndex(
                (l) => String(l._id) === String(currentVideo._id)
              ) >=
                videos.length - 1 && styles.pagerBtnDisabled,
            ]}
            onPress={goNext}
          >
            <Text style={styles.pagerBtnText}>Next ▶</Text>
          </Pressable>
        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Your Notes</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Write your notes here…"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <View style={styles.notesActions}>
            <Pressable
              style={[styles.saveNoteBtn, updating && styles.btnDisabled]}
              onPress={saveNote}
              disabled={updating}
            >
              <Text style={styles.saveNoteBtnText}>
                {updating ? "Saving…" : "Save Note"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quiz Actions */}
        {hasQuiz !== null && (
          <View style={styles.quizSection}>
            {hasQuiz && (
              <Pressable
                style={styles.quizBtn}
                onPress={() => router.push(`/course/${courseId}/quiz`)}
              >
                <Text style={styles.quizBtnText}>Take Quiz</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.certBtn}
              onPress={() => router.push("/certificates")}
            >
              <Text style={styles.certBtnText}>My Certificates</Text>
            </Pressable>
          </View>
        )}

        {/* Lessons List */}
        <View style={styles.lessonsList}>
          <Text style={styles.lessonsListTitle}>All Lessons</Text>
          {videos.map((v, i) => {
            const active = String(v._id) === String(currentVideo._id);
            const checked = completedIds.includes(String(v._id));
            return (
              <Pressable
                key={v._id}
                style={[
                  styles.lessonListItem,
                  active && styles.lessonListItemActive,
                ]}
                onPress={() =>
                  router.push(`/course/${courseId}/lesson/${v._id}`)
                }
              >
                <View style={styles.lessonListItemContent}>
                  <Switch
                    value={checked}
                    onValueChange={(value) => toggleCompleted(v._id, value)}
                    disabled={updating}
                  />
                  <Text
                    style={[
                      styles.lessonListItemText,
                      active && styles.lessonListItemTextActive,
                    ]}
                  >
                    #{i + 1} {v.title}
                  </Text>
                </View>
              </Pressable>
            );
          })}
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
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  videoContainer: {
    height: 220,
    backgroundColor: "#000",
    marginBottom: 8,
  },
  video: {
    flex: 1,
  },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  pagerBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  pagerBtnDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.5,
  },
  pagerBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  notesSection: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  notesActions: {
    flexDirection: "row",
    gap: 12,
  },
  saveNoteBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
  },
  saveNoteBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  quizSection: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    gap: 12,
  },
  quizBtn: {
    paddingVertical: 12,
    backgroundColor: "#4caf50",
    borderRadius: 8,
    alignItems: "center",
  },
  quizBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  certBtn: {
    paddingVertical: 12,
    backgroundColor: "#ff9800",
    borderRadius: 8,
    alignItems: "center",
  },
  certBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  lessonsList: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  lessonsListTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  lessonListItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  lessonListItemActive: {
    backgroundColor: "#f0f0ff",
  },
  lessonListItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lessonListItemText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  lessonListItemTextActive: {
    color: "#6c63ff",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#ff4d4f",
    textAlign: "center",
    marginTop: 20,
  },
  backButton: {
    marginTop: 20,
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
