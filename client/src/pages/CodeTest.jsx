import { useEffect, useState, useCallback, useRef } from "react";
import API from "../api";
import "./CodeTest.css";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";

/**
 * CodeTest page with Monaco editor integration.
 */

const LOCAL_LANGS = [
  { id: 63, name: "javascript (node)", monaco: "javascript" },
  { id: 71, name: "python3", monaco: "python" },
  { id: 46, name: "bash", monaco: "shell" },
  { id: 62, name: "java", monaco: "java" },
];

// helper resolve monaco language
function resolveMonacoLang(langOrId) {
  if (!langOrId && langOrId !== 0) return "plaintext";
  if (typeof langOrId === "number" || /^\d+$/.test(String(langOrId))) {
    const num = Number(langOrId);
    const found = LOCAL_LANGS.find((l) => l.id === num);
    return found ? found.monaco : "plaintext";
  }
  const key = String(langOrId).toLowerCase();
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
  const [language, setLanguage] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const navigate = useNavigate();
  const resultRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/courses");
        const serverCourses = Array.isArray(res.data) ? res.data : res.data?.courses || [];
        setCourses(
          serverCourses.map((c) => ({
            id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title),
            title: c.title || c.name || c._id,
          }))
        );
      } catch {
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

  useEffect(() => {
    if (!selectedCourse) return setCodeQuestion(null);
    (async () => {
      try {
        const res = await API.get(`/quiz/${selectedCourse}`);
        const quiz = res.data;
        const codeQ =
          (quiz?.questions || []).find((q) => q.type === "code") || null;
        setCodeQuestion(codeQ);
        setCode(codeQ?.boilerplate ?? codeQ?.initial ?? codeQ?.template ?? "");
        setLanguage(codeQ?.languageId ?? codeQ?.language ?? null);
        setResult(null);
      } catch {
        setCodeQuestion(null);
        setCode("");
        setLanguage(null);
        setResult(null);
      }
    })();
  }, [selectedCourse]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCourse) return alert("Select a course first.");
    if (!codeQuestion) return alert("No code challenge found.");

    setRunning(true);
    setResult(null);
    try {
      const res = await API.post(`/code-test/${selectedCourse}/submit`, {
        code,
        language,
      });
      setResult(res.data);

      // auto-scroll to result box
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);

      window.dispatchEvent(
        new CustomEvent("eduoding:progress-updated", { detail: { courseId: selectedCourse } })
      );
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Submission failed");
    } finally {
      setRunning(false);
    }
  }, [selectedCourse, codeQuestion, code, language]);

  const monacoLang = resolveMonacoLang(language ?? codeQuestion?.languageId ?? codeQuestion?.language);

  return (
    <div className="code-test-wrap">
      <h2>Code Test</h2>
      <p className="small-meta">Solve the coding challenge to earn points and badges!</p>

      <div style={{ marginTop: 12 }}>
        <label>Course</label>
        <select
          value={selectedCourse || ""}
          onChange={(e) => setSelectedCourse(e.target.value || null)}
        >
          <option value="">-- choose course --</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
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
            <h3>{codeQuestion.question || "Code challenge"}</h3>
            <p className="small-meta">{codeQuestion.hint || ""}</p>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Language</label>
                <select
                  value={language ?? ""}
                  onChange={(e) => setLanguage(e.target.value || null)}
                >
                  <option value="">-- auto --</option>
                  {LOCAL_LANGS.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: 200 }}>
                <label>Editor mode</label>
                <input
                  readOnly
                  value={monacoLang}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Editor
                height="340px"
                language={monacoLang}
                value={code}
                onChange={(val) => setCode(val ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            </div>

            <div className="code-test-submit">
              <button onClick={handleSubmit} disabled={running}>
                {running ? "Running…" : "Run & Submit"}
              </button>
              <button
                onClick={() => {
                  setCode(codeQuestion.boilerplate ?? "");
                  setResult(null);
                }}
                className="secondary-btn"
              >
                Reset Template
              </button>
            </div>

            {result && (
              <div
                ref={resultRef}
                className={`result-box ${result.passed ? "passed" : "failed"}`}
              >
                <strong>{result.passed ? "✅ Passed" : "❌ Failed"}</strong>
                <div style={{ marginTop: 8 }}>
                  <div><strong>Expected:</strong> <code>{result.expected}</code></div>
                  <div><strong>Got:</strong> <code>{result.got}</code></div>
                  <div style={{ marginTop: 6 }}>
                    {result.awarded?.firstPass ? (
                      <div>🎉 Points: <b>{result.awarded.points}</b> — Badge: <b>{result.awarded.badge}</b></div>
                    ) : (
                      <div>{result.passed ? "Already passed earlier — no extra points." : "No points awarded."}</div>
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
