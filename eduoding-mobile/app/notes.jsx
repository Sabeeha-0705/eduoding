// eduoding-mobile/app/notes.jsx - Notes
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import API from "../services/api";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchNotes = async () => {
    try {
      setFetching(true);
      const res = await API.get("/notes");
      setNotes(res.data || []);
    } catch (err) {
      console.error("Fetch failed:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to load notes");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const addNote = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await API.post("/notes", { content });
      setNotes([res.data, ...notes]);
      setContent("");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/notes/${id}`);
            setNotes(notes.filter((n) => n._id !== id));
          } catch {
            Alert.alert("Error", "Failed to delete note");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 My Notes</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textArea}
            value={content}
            onChangeText={setContent}
            placeholder="Write a new note..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.saveButton, (!content.trim() || loading) && styles.saveButtonDisabled]}
            onPress={addNote}
            disabled={!content.trim() || loading}
          >
            <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>

        {fetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6c63ff" />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notes saved yet.</Text>
          </View>
        ) : (
          <View style={styles.notesList}>
            {notes.map((note) => (
              <View key={note._id} style={styles.noteItem}>
                <View style={styles.noteContent}>
                  <Text style={styles.noteText}>{note.content}</Text>
                  {note.createdAt && (
                    <Text style={styles.noteDate}>
                      {new Date(note.createdAt).toLocaleString()}
                    </Text>
                  )}
                </View>
                <View style={styles.noteActions}>
                  {note.lessonId && (
                    <Pressable
                      style={styles.openButton}
                      onPress={() =>
                        router.push(`/course/${note.courseId || ""}/lesson/${note.lessonId}`)
                      }
                    >
                      <Text style={styles.openButtonText}>Open Lesson</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => deleteNote(note._id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
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
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
    minHeight: 100,
    marginBottom: 12,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
  },
  notesList: {
    gap: 12,
  },
  noteItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noteContent: {
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: "#999",
  },
  noteActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  openButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 6,
  },
  openButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#ff4d4f",
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

