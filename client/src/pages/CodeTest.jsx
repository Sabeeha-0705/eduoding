// client/src/pages/CodeTest.jsx
import { useEffect, useState } from "react";
import API from "../api";
import "./CodeTest.css"; // optional for small styles
import { useNavigate } from "react-router-dom";

const LOCAL_LANGS = [
  { id: 63, name: "javascript (node)" },
  { id: 71, name: "python3" },
  { id: 46, name: "bash" },
  { id: 62, name: "java" },
];
export default function CodeTest({ initialCourseId = null }) {
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId);
  const [courses, setCourses] = useState([]);
  const [codeQuestion, setCodeQuestion] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/courses");
        const serverCourses = Array.isArray(res.data) ? res.data : res.data?.courses || [];
        setCourses(serverCourses.map(c => ({ id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title), title: c.title || c.name || c._id, raw: c })));
      } catch (err) {
        // fallback to dashboard's fallback list if needed
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
        // pick first code question
        const codeQ = (quiz.questions || []).find(q => q.type === "code") || null;
        setCodeQuestion(codeQ);
        if (codeQ) {
          setCode(codeQ.boilerplate || "");
          setLanguage(codeQ.languageId || null);
        } else {
          setCode("");
          setLanguage(null);
        }
      } catch (err) {
        console.warn("No quiz for course:", err);
        setCodeQuestion(null);
        setCode("");
        setLanguage(null);
      }
    })();
  }, [selectedCourse]);

  const handleSubmit = async () => {
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
      // Optionally refresh user/dashboard - dispatch a custom event so Dashboard will refresh points
      window.dispatchEvent(new CustomEvent("eduoding:progress-updated", { detail: { courseId: selectedCourse } }));
    } catch (err) {
      console.error("Code test submit failed:", err);
      alert(err?.response?.data?.message || err.message || "Submission failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 12 }}>
      <h2>Code Test</h2>
      <p>Pick a course and solve its single code challenge. First successful pass awards points & badge.</p>

      <div style={{ marginTop: 12 }}>
        <label>Course</label>
        <select value={selectedCourse || ""} onChange={(e) => setSelectedCourse(e.target.value || null)}>
          <option value="">-- choose course --</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {selectedCourse && !codeQuestion && (
        <div style={{ marginTop: 14, padding: 12, background: "#fff9", borderRadius: 8 }}>
          <p>No code challenge found for this course.</p>
          <button onClick={() => navigate(`/course/${selectedCourse}`)}>Open Course</button>
        </div>
      )}

      {codeQuestion && (
        <div style={{ marginTop: 14 }}>
          <h3>Challenge: {codeQuestion.question || "Code challenge"}</h3>
          <p><small>{codeQuestion.hint || ""}</small></p>

          <div style={{ marginTop: 8 }}>
            <label>Language</label>
            <select value={language || ""} onChange={(e) => setLanguage(e.target.value || null)}>
              <option value="">-- auto --</option>
              {LOCAL_LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Code</label>
            <textarea rows={12} style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }} value={code} onChange={(e) => setCode(e.target.value)} />
          </div>

          <div style={{ marginTop: 10 }}>
            <button onClick={handleSubmit} disabled={running} style={{ padding: "10px 14px" }}>
              {running ? "Running…" : "Run & Submit"}
            </button>
          </div>

          {result && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: result.passed ? "#e6ffef" : "#fff0f0" }}>
              <strong>{result.passed ? "✅ Passed" : "❌ Failed"}</strong>
              <div style={{ marginTop: 8 }}>
                <div><strong>Expected:</strong> <code>{result.expected}</code></div>
                <div><strong>Got:</strong> <code>{result.got}</code></div>
                <div style={{ marginTop: 6 }}>
                  {result.awarded?.firstPass ? (
                    <div>Points awarded: <strong>{result.awarded.points}</strong> — Badge: <strong>{result.awarded.badge}</strong></div>
                  ) : (
                    <div>{result.passed ? "You already passed earlier — no extra points." : "No points awarded"}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
