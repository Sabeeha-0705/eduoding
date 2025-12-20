// eduoding-mobile/app/code/editor.jsx - CodeEditor
import { useState } from "react";
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
import { useLocalSearchParams, router } from "expo-router";
import API from "../services/api";

export default function CodeEditor() {
  const { courseId, lessonId } = useLocalSearchParams();
  const [source, setSource] = useState(`// Hello world\nconsole.log("Hello from Eduoding");`);
  const [language, setLanguage] = useState("63"); // Default to Node.js
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const runCode = async () => {
    setError("");
    setResult(null);

    if (!source || source.trim() === "") {
      setError("Source code is empty.");
      return;
    }

    setRunning(true);
    try {
      const isNumeric = /^\d+$/.test(String(language));
      const payload = {
        source,
        stdin,
        courseId: courseId || null,
        lessonId: lessonId || null,
        title: `Solution ${new Date().toLocaleString()}`,
      };

      if (isNumeric) {
        payload.languageId = Number(language);
        payload.language_id = Number(language);
      } else {
        payload.language = language;
      }

      const res = await API.post("/code/submit", payload);
      const { submission, judgeResult } = res.data;

      setResult({
        submission,
        judgeResult,
      });
    } catch (err) {
      console.error("Run failed:", err);
      const msg = err?.response?.data?.message || err?.message || "Execution failed";
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Code Editor</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.runButton, running && styles.buttonDisabled]}
            onPress={runCode}
            disabled={running}
          >
            <Text style={styles.runButtonText}>{running ? "Running…" : "Run & Save"}</Text>
          </Pressable>
          <Pressable
            style={styles.solutionsButton}
            onPress={() => router.push("/code/mine/all")}
          >
            <Text style={styles.solutionsButtonText}>My Solutions</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.controls}>
          <View style={styles.controlGroup}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.languageButtons}>
              {[
                { value: "63", label: "JavaScript (Node)" },
                { value: "71", label: "Python 3" },
                { value: "62", label: "Java" },
                { value: "50", label: "C" },
                { value: "54", label: "C++" },
                { value: "80", label: "Go" },
              ].map((lang) => (
                <Pressable
                  key={lang.value}
                  style={[
                    styles.languageButton,
                    language === lang.value && styles.languageButtonActive,
                  ]}
                  onPress={() => setLanguage(lang.value)}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      language === lang.value && styles.languageButtonTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.controlGroup}>
            <Text style={styles.label}>Stdin (optional)</Text>
            <TextInput
              style={styles.stdinInput}
              value={stdin}
              onChangeText={setStdin}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Input for your program..."
            />
          </View>
        </View>

        <View style={styles.editorSection}>
          <Text style={styles.editorLabel}>Code</Text>
          <TextInput
            style={styles.codeInput}
            value={source}
            onChangeText={setSource}
            multiline
            textAlignVertical="top"
            spellCheck={false}
            autoCorrect={false}
            autoCapitalize="none"
            placeholder="Write your code here..."
          />
        </View>

        <View style={styles.outputSection}>
          <Text style={styles.outputLabel}>Output</Text>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!result && !error && (
            <View style={styles.emptyOutput}>
              <Text style={styles.emptyOutputText}>No output yet — run the code.</Text>
            </View>
          )}

          {result && (
            <>
              <View style={styles.outputContainer}>
                <Text style={styles.outputTitle}>Stdout:</Text>
                <Text style={styles.outputText}>
                  {result.judgeResult?.stdout ?? result.submission?.stdout ?? "(empty)"}
                </Text>
              </View>

              {result.judgeResult?.stderr && (
                <View style={styles.errorOutputContainer}>
                  <Text style={styles.errorTitle}>Stderr:</Text>
                  <Text style={styles.errorOutputText}>{result.judgeResult.stderr}</Text>
                </View>
              )}

              {result.judgeResult?.compile_output && (
                <View style={styles.errorOutputContainer}>
                  <Text style={styles.errorTitle}>Compile Output:</Text>
                  <Text style={styles.errorOutputText}>{result.judgeResult.compile_output}</Text>
                </View>
              )}

              {result.submission && (
                <View style={styles.metaContainer}>
                  <Text style={styles.metaText}>
                    Submission saved.{" "}
                    <Text
                      style={styles.linkText}
                      onPress={() => router.push(`/code/${result.submission._id}`)}
                    >
                      View
                    </Text>{" "}
                    ·{" "}
                    <Text
                      style={styles.linkText}
                      onPress={() => router.push("/code/mine/all")}
                    >
                      My Solutions
                    </Text>
                  </Text>
                </View>
              )}
            </>
          )}
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
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  runButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  runButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  solutionsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  solutionsButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  controls: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  controlGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  languageButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  languageButtonActive: {
    backgroundColor: "#6c63ff",
    borderColor: "#6c63ff",
  },
  languageButtonText: {
    fontSize: 12,
    color: "#333",
  },
  languageButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  stdinInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
    minHeight: 80,
  },
  editorSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  editorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "monospace",
    backgroundColor: "#f9f9f9",
    minHeight: 300,
    textAlignVertical: "top",
  },
  outputSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  outputLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },
  emptyOutput: {
    padding: 20,
    alignItems: "center",
  },
  emptyOutputText: {
    fontSize: 14,
    color: "#999",
  },
  outputContainer: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  outputTitle: {
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
    marginBottom: 12,
  },
  errorTitle: {
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
  metaContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  linkText: {
    color: "#6c63ff",
    fontWeight: "600",
  },
});

