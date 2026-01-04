// eduoding-mobile/app/add-lesson.jsx - AddLesson
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
// TODO: Install expo-document-picker: npx expo install expo-document-picker
// import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import API from "../services/api";

export default function AddLesson() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    setMsg("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("type", type);

      if (type === "youtube") {
        formData.append("videoUrl", videoUrl);
      } else {
        if (!file) {
          setMsg("Please select a video file");
          setSubmitting(false);
          return;
        }
        formData.append("video", {
          uri: file.uri,
          type: file.mimeType || "video/mp4",
          name: file.name || "video.mp4",
        });
      }

      const res = await API.post("/lessons", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg(res.data.message || "Lesson added successfully!");
      setTitle("");
      setVideoUrl("");
      setFile(null);
    } catch (err) {
      setMsg(err.response?.data?.message || "Error uploading lesson");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add New Lesson</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Lesson Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Lesson Title"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeSelector}>
                <Pressable
                  style={[styles.typeButton, type === "youtube" && styles.typeButtonActive]}
                  onPress={() => setType("youtube")}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === "youtube" && styles.typeButtonTextActive,
                    ]}
                  >
                    YouTube Link
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeButton, type === "upload" && styles.typeButtonActive]}
                  onPress={() => setType("upload")}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === "upload" && styles.typeButtonTextActive,
                    ]}
                  >
                    Upload Video
                  </Text>
                </Pressable>
              </View>
            </View>

            {type === "youtube" ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>YouTube Video URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YouTube Video URL"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Video File</Text>
                <Pressable style={styles.fileButton} onPress={pickVideo}>
                  <Text style={styles.fileButtonText}>
                    {file ? `Selected: ${file.name}` : "Choose Video File"}
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !title || (type === "youtube" ? !videoUrl : !file)}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? "Adding..." : "Add Lesson"}
              </Text>
            </Pressable>

            {msg ? (
              <View style={styles.msgContainer}>
                <Text style={styles.msgText}>{msg}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4ff",
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
    padding: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  form: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#6c63ff",
    borderColor: "#6c63ff",
  },
  typeButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#fff",
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
    textAlign: "center",
  },
});

