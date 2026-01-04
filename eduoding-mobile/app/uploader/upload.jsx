// eduoding-mobile/app/uploader/upload.jsx - UploadVideo
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
// TODO: Install expo-document-picker: npx expo install expo-document-picker
// import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { uploadVideoFile, addYoutubeVideo, getCourses } from "../../services/videos";

export default function UploadVideo() {
  const [mode, setMode] = useState("upload"); // "upload" | "youtube"
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCourses();
        const data = res?.data || [];
        if (data.length) {
          setCourses(data);
          setCourseId(data[0].id ?? data[0]._id ?? "");
        } else {
          throw new Error("No courses returned");
        }
      } catch (err) {
        const staticCourses = [
          { id: "1", title: "Full Stack Web Development (MERN)" },
          { id: "2", title: "Data Science & AI" },
          { id: "3", title: "Cloud & DevOps" },
          { id: "4", title: "Cybersecurity & Ethical Hacking" },
          { id: "5", title: "UI/UX Design" },
        ];
        setCourses(staticCourses);
        setCourseId("1");
      }
    };
    load();
  }, []);

  const pickVideo = async () => {
    // TODO: Install expo-document-picker and uncomment below
    Alert.alert("Coming Soon", "Video picker will be available after installing expo-document-picker");
    // try {
    //   const DocumentPicker = require("expo-document-picker");
    //   const result = await DocumentPicker.getDocumentAsync({
    //     type: "video/*",
    //     copyToCacheDirectory: true,
    //   });
    //   if (!result.canceled && result.assets[0]) {
    //     setFile(result.assets[0]);
    //     setMsg("");
    //   }
    // } catch (err) {
    //   Alert.alert("Error", "Failed to pick video file");
    // }
  };

  const isYoutube = (url) => {
    if (!url) return false;
    return /youtube\.com|youtu\.be/.test(url);
  };

  const handleSubmit = async () => {
    setMsg("");
    try {
      if (!courseId) {
        setMsg("Please choose a course.");
        return;
      }

      setUploading(true);

      if (mode === "upload") {
        if (!file) {
          setMsg("Choose a video file first.");
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("video", {
          uri: file.uri,
          type: file.mimeType || "video/mp4",
          name: file.name || "video.mp4",
        });
        formData.append("title", title || file.name);
        formData.append("description", desc);
        formData.append("courseId", courseId);

        const res = await uploadVideoFile(formData, setProgress);
        setMsg(res.data?.message || "Uploaded");
        setTimeout(() => router.push("/uploader/dashboard"), 700);
      } else {
        if (!youtubeUrl) {
          setMsg("Paste YouTube URL");
          setUploading(false);
          return;
        }
        if (!isYoutube(youtubeUrl)) {
          setMsg("Please paste a valid YouTube URL.");
          setUploading(false);
          return;
        }

        const payload = { youtubeUrl, title, description: desc, courseId };
        const res = await addYoutubeVideo(payload);
        setMsg(res.data?.message || "Saved");
        setTimeout(() => router.push("/uploader/dashboard"), 700);
      }
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || "Upload failed");
      console.error("UploadVideo.handleSubmit error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Upload / Add Video</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.modeSelector}>
          <Pressable
            style={[styles.modeButton, mode === "upload" && styles.modeButtonActive]}
            onPress={() => {
              setMode("upload");
              setMsg("");
            }}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "upload" && styles.modeButtonTextActive,
              ]}
            >
              Upload file
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === "youtube" && styles.modeButtonActive]}
            onPress={() => {
              setMode("youtube");
              setMsg("");
            }}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === "youtube" && styles.modeButtonTextActive,
              ]}
            >
              YouTube URL
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Course</Text>
            <View style={styles.selectContainer}>
              {courses.map((c) => (
                <Pressable
                  key={c.id ?? c._id}
                  style={[
                    styles.courseOption,
                    courseId === (c.id ?? c._id) && styles.courseOptionActive,
                  ]}
                  onPress={() => setCourseId(c.id ?? c._id)}
                >
                  <Text
                    style={[
                      styles.courseOptionText,
                      courseId === (c.id ?? c._id) && styles.courseOptionTextActive,
                    ]}
                  >
                    {c.title || c.name || `Course ${c.id ?? c._id}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Video title"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {mode === "upload" ? (
            <>
              <View style={styles.formGroup}>
                <Pressable style={styles.fileButton} onPress={pickVideo}>
                  <Text style={styles.fileButtonText}>
                    {file ? `Selected: ${file.name}` : "Choose Video File"}
                  </Text>
                </Pressable>
              </View>
              {progress > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progress}%</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.formGroup}>
              <Text style={styles.label}>YouTube URL</Text>
              <TextInput
                style={styles.input}
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://youtube.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={styles.hint}>
                Paste full YouTube link (watch?v= or youtu.be). We'll keep it and admin will
                approve.
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            <Text style={styles.submitButtonText}>
              {uploading ? "Uploading..." : "Submit"}
            </Text>
          </Pressable>

          {msg ? (
            <View style={styles.msgContainer}>
              <Text style={styles.msgText}>{msg}</Text>
            </View>
          ) : null}
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
  content: {
    flex: 1,
    padding: 16,
  },
  modeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#6c63ff",
    borderColor: "#6c63ff",
  },
  modeButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  modeButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
  },
  selectContainer: {
    gap: 8,
  },
  courseOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  courseOptionActive: {
    backgroundColor: "#e3f2fd",
    borderColor: "#6c63ff",
  },
  courseOptionText: {
    fontSize: 14,
    color: "#333",
  },
  courseOptionTextActive: {
    color: "#6c63ff",
    fontWeight: "600",
  },
  fileButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: "#6c63ff",
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f0f0ff",
  },
  fileButtonText: {
    fontSize: 14,
    color: "#6c63ff",
    fontWeight: "600",
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6c63ff",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  submitButton: {
    paddingVertical: 14,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  msgContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  msgText: {
    fontSize: 14,
    color: "#c62828",
  },
});

