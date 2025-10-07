// client/src/pages/CodeTest.jsx
import { useEffect, useState, useCallback } from "react";
import API from "../api";
import "./CodeTest.css";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";

/**
 * CodeTest page with Monaco editor integration.
 * Props:
 *   - initialCourseId (optional) -> pre-select a course if provided
 */

const LOCAL_LANGS = [
  { id: 63, name: "javascript (node)", monaco: "javascript" },
  { id: 71, name: "python3", monaco: "python" },
  { id: 46, name: "bash", monaco: "shell" },
  { id: 62, name: "java", monaco: "java" },
];

function resolveMonacoLang(langOrId) {
  if (!langOrId && langOrId !== 0) return "plaintext";
  if (typeof langOrId === "number" || /^\d+$/.test(String(langOrId))) {
    const num = Number(langOrId);
    const found = LOCAL_LANGS.find((l) => l.id === num);
    if (found) return found.monaco;
    return "plaintext";
  }
  const key = String(langOrId).toLowerCase();
  const found = LOCAL_LANGS.find((l) => key.includes(String(l.id)) || key.includes(l.name.split(" ")[0]));
  if (found) return found.monaco;
  if (key.includes("js") || key.includes("javascript") || key.includes("node")) return "javascript";
  if (key.includes("py")) return "python";
  if (key.includes("bash") || key.includes("sh") || key.includes("shell")) return "shell";
  if (key.includes("java")) return "java";
  return "plaintext";
}

export default function CodeTest({ initialCourseId = null }) {
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId);
  const [courses, setCourses] = useState([]);
  const [codeQuestion, setCodeQuestion] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(null); // judge0 id or string
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/courses");
        const serverCourses = Array.isArray(res.data) ? res.data : res.data?.courses || [];
        setCourses(
          serverCourses.map((c) => ({
            id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title),
            title: c.title || c.name || c._id,
            raw: c,
          }))
        );
      } catch (err) {
        // fallback list if server not available
        setCourses([
          { id: "1", title: "Full Stack Web Development (MERN)" },
          { id: "2", title: "Data Science & AI" },
          { id: "3", title: "Cloud & DevOps" },
          { id: "4", title: "Cybersecurity & Ethical Hacking" },
          { id: "5", title: "UI/UX Design" },
        ]);
      }
    })();
  }, []);

  // when course changes -> fetch quiz and populate editor content
  useEffect(() => {
    if (!selectedCourse) return setCodeQuestion(null);
    (async () => {
      try {
        const res = await API.get(`/quiz/${selectedCourse}`);
        const quiz = res.data;
        const codeQ =
          (quiz && Array.isArray(quiz.questions) && quiz.questions.find((q) => q.type === "code")) || null;
        setCodeQuestion(codeQ);
        if (codeQ) {
          setCode(codeQ.boilerplate ?? codeQ.initial ?? codeQ.template ?? "");
          setLanguage(codeQ.languageId ?? codeQ.language ?? null);
        } else {
          setCode("");
          setLanguage(null);
        }
        setResult(null);
      } catch (err) {
        console.warn("No quiz for course:", err);
        setCodeQuestion(null);
        setCode("");
        setLanguage(null);
        setResult(null);
      }
    })();
  }, [selectedCourse]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCourse) return alert("Select a course");
    if (!codeQuestion) return alert("No code challenge for selected course");
    setRunning(true);
    setResult(null);

    try {
      const res = await API.post(`/code-test/${selectedCourse}/submit`, {
        code,
        language,
      });
      setResult(res.data);
      // notify Dashboard / other UI to refresh user points/badges
      window.dispatchEvent(new CustomEvent("eduoding:progress-updated", { detail: { courseId: selectedCourse } }));
    } catch (err) {
      console.error("Code test submit failed:", err);
      alert(err?.response?.data?.message || err.message || "Submission failed");
    } finally {
      setRunning(false);
    }
  }, [selectedCourse, codeQuestion, code, language]);

  const monacoLang = resolveMonacoLang(language ?? (codeQuestion?.languageId ?? codeQuestion?.language ?? null));

  return (
    <div className="code-test-wrap">
      <h2>Code Test</h2>
      <p className="small-meta">
        Pick a course and solve its code challenge. First successful pass awards points & a badge.
      </p>

      <div style={{ marginTop: 12 }}>
        <label>Course</label>
        <select
          value={selectedCourse || ""}
          onChange={(e) => {
            const v = e.target.value || null;
            setSelectedCourse(v);
          }}
        >
          <option value="">-- choose course --</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && !codeQuestion && (
        <div className="no-challenge">
          <p>No code challenge found for this course.</p>
          <button onClick={() => navigate(`/course/${selectedCourse}`)}>Open Course</button>
        </div>
      )}

      {codeQuestion && (
        <>
          <div style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 6 }}>{codeQuestion.question || "Code challenge"}</h3>
            <p className="small-meta">{codeQuestion.hint || ""}</p>

            <div style={{ marginTop: 10, marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label>Language (auto)</label>
                <select
                  value={language ?? ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setLanguage(val);
                  }}
                >
                  <option value="">-- auto --</option>
                  {LOCAL_LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ width: 220 }}>
                <label>Monaco mode</label>
                <input
                  readOnly
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                  }}
                  value={monacoLang}
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <Editor
                height="340px"
                defaultLanguage={monacoLang}
                language={monacoLang}
                value={code}
                onChange={(val) => setCode(val ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  formatOnPaste: true,
                  formatOnType: true,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            </div>

            <div className="code-test-submit" style={{ marginTop: 12 }}>
              <button onClick={handleSubmit} disabled={running}>
                {running ? "Running…" : "Run & Submit"}
              </button>
              <button
                onClick={() => {
                  setCode(codeQuestion.boilerplate ?? "");
                  setResult(null);
                }}
                className="reset-btn"
              >
                Reset to Template
              </button>
            </div>

            {result && (
              <div className={`result-box ${result.passed ? "passed" : "failed"}`}>
                <strong>{result.passed ? "✅ Passed" : "❌ Failed"}</strong>

                <div style={{ marginTop: 8 }}>
                  <div className="small-meta">
                    <strong>Expected:</strong> <code>{result.expected}</code>
                  </div>
                  <div className="small-meta" style={{ marginTop: 6 }}>
                    <strong>Got:</strong> <code>{result.got}</code>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {result.awarded?.firstPass ? (
                      <div>
                        Points awarded: <strong>{result.awarded.points}</strong> — Badge: <strong>{result.awarded.badge}</strong>
                      </div>
                    ) : (
                      <div>{result.passed ? "You already passed earlier — no extra points." : "No points awarded."}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
