// eduoding-mobile/app/code/mine/all.jsx - MySolutions
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
import API from "../../../services/api";

export default function MySolutions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/code/mine/all");
        setSubs(res.data || []);
      } catch (err) {
        console.error("Failed to load submissions:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Code Submissions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : subs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No submissions yet. Go to a quiz or code editor and submit your code.
          </Text>
          <Pressable
            style={styles.dashboardButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {subs.map((s) => (
            <Pressable
              key={s._id}
              style={styles.solutionCard}
              onPress={() => router.push(`/code/${s._id}`)}
            >
              <View style={styles.solutionMeta}>
                <Text style={styles.metaText}>
                  <Text style={styles.metaLabel}>Submitted:</Text>{" "}
                  {new Date(s.createdAt).toLocaleString()}
                </Text>
                <Text style={styles.metaText}>
                  <Text style={styles.metaLabel}>Language:</Text>{" "}
                  {s.languageName || s.languageId}
                </Text>
                <Text style={styles.metaText}>
                  <Text style={styles.metaLabel}>Status:</Text> {s.status}
                </Text>
              </View>
              <View style={styles.codePreview}>
                <Text style={styles.codePreviewText} numberOfLines={5}>
                  {s.source}
                </Text>
              </View>
              {s.stdout && (
                <View style={styles.outputContainer}>
                  <Text style={styles.outputLabel}>Output:</Text>
                  <Text style={styles.outputText} numberOfLines={3}>
                    {s.stdout}
                  </Text>
                </View>
              )}
              {s.stderr && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorLabel}>Error:</Text>
                  <Text style={styles.errorText} numberOfLines={3}>
                    {s.stderr}
                  </Text>
                </View>
              )}
              <Text style={styles.viewText}>Tap to view full submission →</Text>
            </Pressable>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  dashboardButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  dashboardButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  solutionCard: {
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
  solutionMeta: {
    marginBottom: 12,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  metaLabel: {
    fontWeight: "600",
    color: "#333",
  },
  codePreview: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  codePreviewText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#333",
  },
  outputContainer: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  outputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2e7d32",
    marginBottom: 4,
  },
  outputText: {
    fontSize: 12,
    color: "#1b5e20",
    fontFamily: "monospace",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c62828",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#b71c1c",
    fontFamily: "monospace",
  },
  viewText: {
    fontSize: 12,
    color: "#6c63ff",
    fontWeight: "600",
    textAlign: "right",
    marginTop: 8,
  },
});

