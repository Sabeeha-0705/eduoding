// eduoding-mobile/app/code/[id].jsx - SubmissionView
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import API from "../../services/api";

export default function SubmissionView() {
  const { id } = useLocalSearchParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get(`/code/${id}`);
        setSubmission(res.data);
      } catch (err) {
        console.error("Load submission failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading submission…</Text>
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTextStyle}>Submission not found.</Text>
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
        <Text style={styles.headerTitle}>Submission</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.metaSection}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Title:</Text> {submission.title || "Untitled"}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Language:</Text>{" "}
            {submission.languageName || submission.languageId}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Created:</Text>{" "}
            {new Date(submission.createdAt).toLocaleString()}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Status:</Text> {submission.status}
          </Text>
        </View>

        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{submission.source}</Text>
          </View>
        </View>

        <View style={styles.outputSection}>
          <Text style={styles.sectionTitle}>Output</Text>
          {submission.stdout && (
            <View style={styles.outputContainer}>
              <Text style={styles.outputLabel}>Output:</Text>
              <Text style={styles.outputText}>{submission.stdout}</Text>
            </View>
          )}
          {submission.stderr && (
            <View style={styles.errorOutputContainer}>
              <Text style={styles.errorLabel}>Error:</Text>
              <Text style={styles.errorOutputText}>{submission.stderr}</Text>
            </View>
          )}
          {submission.compileOutput && (
            <View style={styles.errorOutputContainer}>
              <Text style={styles.errorLabel}>Compiler:</Text>
              <Text style={styles.errorOutputText}>{submission.compileOutput}</Text>
            </View>
          )}
        </View>

        {submission.courseId && (
          <View style={styles.actions}>
            <Pressable
              style={styles.quizButton}
              onPress={() => router.push(`/course/${submission.courseId}/quiz`)}
            >
              <Text style={styles.quizButtonText}>Back to Quiz</Text>
            </Pressable>
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
  metaSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metaItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  metaLabel: {
    fontWeight: "700",
    color: "#222",
  },
  codeSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  codeText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#333",
  },
  outputSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  outputContainer: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  outputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
    marginBottom: 8,
  },
  outputText: {
    fontSize: 12,
    color: "#1b5e20",
    fontFamily: "monospace",
  },
  errorOutputContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#c62828",
    marginBottom: 8,
  },
  errorOutputText: {
    fontSize: 12,
    color: "#b71c1c",
    fontFamily: "monospace",
  },
  actions: {
    marginTop: 16,
    marginBottom: 16,
  },
  quizButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
  },
  quizButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignSelf: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#ff4d4f",
    textAlign: "center",
    marginTop: 20,
  },
});

