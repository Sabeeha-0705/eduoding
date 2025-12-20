// eduoding-mobile/app/course/[courseId]/quiz.jsx - QuizPage
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import API from "../../services/api";

export default function QuizPage() {
  const { courseId } = useLocalSearchParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Coding challenge state
  const [code, setCode] = useState("// write your code here\nconsole.log('Hello Eduoding');");
  const [codeSaved, setCodeSaved] = useState(false);
  const [codeRunning, setCodeRunning] = useState(false);
  const [runOutput, setRunOutput] = useState(null);
  const [runError, setRunError] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await API.get(`/quiz/${courseId}`);
        const qobj = res.data || null;
        setQuiz(qobj);
        setAnswers(
          new Array(Array.isArray(qobj?.questions) ? qobj.questions.length : 0).fill(null)
        );
      } catch (err) {
        console.error("Quiz load failed:", err);
        setQuiz(null);
        setLoadError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [courseId]);

  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];

  const handleSelect = (qIndex, optIndex) => {
    const newAns = [...answers];
    newAns[qIndex] = optIndex;
    setAnswers(newAns);
  };

  const handleSubmit = async () => {
    try {
      const res = await API.post(`/quiz/${courseId}/submit`, { answers });
      setResult(res.data);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message || "Submit failed");
    }
  };

  const handleCodeSave = async () => {
    try {
      setCodeSaved(false);
      await API.post(`/quiz/${courseId}/submit-code`, { code });
      setCodeSaved(true);
      setTimeout(() => setCodeSaved(false), 2000);
    } catch (err) {
      Alert.alert("Error", "Failed to save code");
    }
  };

  const handleCodeRun = async (language = "javascript") => {
    try {
      setRunOutput(null);
      setRunError(null);
      setCodeRunning(true);

      const payload = { source: code, language, stdin: "", title: `Quiz-${courseId}-run` };
      const res = await API.post("/code/submit", payload);
      const jr = res.data.judgeResult || res.data.judge || res.data;
      const stdout = (jr && (jr.stdout || jr.stdout_text || jr.output)) || "";
      const stderr = jr && (jr.stderr || jr.compile_output || jr.compile_output_text) || "";
      setRunOutput(stdout);
      setRunError(stderr);
    } catch (err) {
      setRunError(err.response?.data?.message || err.message || "Run failed");
    } finally {
      setCodeRunning(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading quiz. Check console / network tab.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No quiz available for this course.</Text>
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
        <Text style={styles.headerTitle}>Quiz</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>{quiz.title || "Quiz"}</Text>

        {result ? (
          <View style={styles.resultContainer}>
            <Text style={styles.score}>Score: {result.score}%</Text>
            {result.message === "Passed" ? (
              <>
                <Text style={styles.passText}>✅ You passed!</Text>
                {result.certificate?.pdfUrl ? (
                  <Pressable
                    style={styles.certButton}
                    onPress={() => {
                      // Open PDF in browser or download
                      router.push("/certificates");
                    }}
                  >
                    <Text style={styles.certButtonText}>Download Certificate</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.noteText}>Certificate will appear in "My Certificates".</Text>
                )}
              </>
            ) : (
              <Text style={styles.failText}>❌ You failed. Try again!</Text>
            )}

            <Text style={styles.reviewTitle}>Review Answers</Text>
            {questions.map((q, i) => {
              const isCorrect = result.correctAnswers && result.correctAnswers[i] === answers[i];
              const isSelected = answers[i] !== null;
              const correctAnswer = result.correctAnswers && result.correctAnswers[i];

              return (
                <View key={i} style={styles.questionCard}>
                  <Text style={styles.questionText}>
                    {i + 1}. {q.question}
                  </Text>
                  <View style={styles.optionsList}>
                    {(Array.isArray(q.options) ? q.options : []).map((opt, j) => {
                      const isCorrectOption = correctAnswer === j;
                      const isSelectedOption = answers[i] === j;
                      let optionStyle = styles.option;
                      if (isCorrectOption) optionStyle = [styles.option, styles.optionCorrect];
                      if (isSelectedOption && !isCorrectOption)
                        optionStyle = [styles.option, styles.optionWrong];

                      return (
                        <View key={j} style={optionStyle}>
                          <Text style={styles.optionText}>
                            {opt}
                            {isSelectedOption ? " (your answer)" : ""}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <Pressable
              style={styles.backButton}
              onPress={() => router.push("/(tabs)")}
            >
              <Text style={styles.backButtonText}>⬅ Back to Dashboard</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {questions.map((q, i) => (
              <View key={i} style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {i + 1}. {q.question}
                </Text>

                {q.type === "code" ? (
                  <View style={styles.codeSection}>
                    <TextInput
                      style={styles.codeEditor}
                      value={code}
                      onChangeText={setCode}
                      multiline
                      numberOfLines={8}
                      textAlignVertical="top"
                    />
                    <View style={styles.codeActions}>
                      <Pressable
                        style={[styles.codeButton, codeRunning && styles.buttonDisabled]}
                        onPress={() => handleCodeRun(q.language || "javascript")}
                        disabled={codeRunning}
                      >
                        <Text style={styles.codeButtonText}>
                          {codeRunning ? "Running…" : "Run"}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.saveButton} onPress={handleCodeSave}>
                        <Text style={styles.saveButtonText}>Save</Text>
                      </Pressable>
                    </View>
                    {runOutput && (
                      <View style={styles.outputContainer}>
                        <Text style={styles.outputLabel}>Output:</Text>
                        <Text style={styles.outputText}>{runOutput}</Text>
                      </View>
                    )}
                    {runError && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorLabel}>Error:</Text>
                        <Text style={styles.errorText}>{runError}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.optionsList}>
                    {(Array.isArray(q.options) ? q.options : []).map((opt, j) => (
                      <Pressable
                        key={j}
                        style={[
                          styles.optionButton,
                          answers[i] === j && styles.optionButtonSelected,
                        ]}
                        onPress={() => handleSelect(i, j)}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            answers[i] === j && styles.optionButtonTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <View style={styles.actions}>
              <Pressable style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Submit Quiz</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => router.back()}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>

            {quiz.allowGlobalCode && (
              <View style={styles.globalCodeSection}>
                <Text style={styles.globalCodeTitle}>💻 Global Coding Challenge</Text>
                <TextInput
                  style={styles.codeEditor}
                  value={code}
                  onChangeText={setCode}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
                <View style={styles.codeActions}>
                  <Pressable
                    style={[styles.codeButton, codeRunning && styles.buttonDisabled]}
                    onPress={() => handleCodeRun("javascript")}
                    disabled={codeRunning}
                  >
                    <Text style={styles.codeButtonText}>
                      {codeRunning ? "Running…" : "Run Code"}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={handleCodeSave}>
                    <Text style={styles.saveButtonText}>Save Code</Text>
                  </Pressable>
                  {codeSaved && <Text style={styles.savedMsg}>Saved ✓</Text>}
                </View>
                {runOutput && (
                  <View style={styles.outputContainer}>
                    <Text style={styles.outputLabel}>Output:</Text>
                    <Text style={styles.outputText}>{runOutput}</Text>
                  </View>
                )}
                {runError && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorLabel}>Error:</Text>
                    <Text style={styles.errorText}>{runError}</Text>
                  </View>
                )}
              </View>
            )}
          </>
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
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginBottom: 20,
  },
  resultContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  score: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  passText: {
    fontSize: 18,
    color: "#4caf50",
    marginBottom: 12,
  },
  failText: {
    fontSize: 18,
    color: "#ff4d4f",
    marginBottom: 12,
  },
  certButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  certButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  noteText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginTop: 20,
    marginBottom: 12,
  },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 12,
  },
  optionsList: {
    gap: 8,
  },
  option: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optionCorrect: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4caf50",
  },
  optionWrong: {
    backgroundColor: "#ffebee",
    borderColor: "#ff4d4f",
  },
  optionText: {
    fontSize: 14,
    color: "#333",
  },
  optionButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optionButtonSelected: {
    backgroundColor: "#e3f2fd",
    borderColor: "#6c63ff",
  },
  optionButtonText: {
    fontSize: 14,
    color: "#333",
  },
  optionButtonTextSelected: {
    color: "#6c63ff",
    fontWeight: "600",
  },
  codeSection: {
    marginTop: 12,
  },
  codeEditor: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "monospace",
    backgroundColor: "#f9f9f9",
    minHeight: 150,
    marginBottom: 12,
  },
  codeActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  codeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#4caf50",
    borderRadius: 8,
  },
  codeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  savedMsg: {
    fontSize: 14,
    color: "#4caf50",
    alignSelf: "center",
    marginLeft: 12,
  },
  outputContainer: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
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
    marginTop: 12,
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
  globalCodeSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  globalCodeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6c63ff",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

