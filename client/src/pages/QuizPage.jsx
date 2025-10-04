// client/src/pages/QuizPage.jsx  (DEBUG VERSION)
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api"; // if your api is default export change below comment
import "./QuizPage.css";

export default function QuizPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);

  // code runner states (kept minimal)
  const [code, setCode] = useState("// demo\nconsole.log('hi');");
  const [codeRunning, setCodeRunning] = useState(false);
  const [runOutput, setRunOutput] = useState("");
  const [runError, setRunError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        // SAFETY: if your API export is default named "API" change to API.get(...)
        if (!api || typeof api.get !== "function") {
          throw new Error("api.get is not available — check client/src/api.js export (named vs default).");
        }

        const res = await api.get(`/quiz/${courseId}`);
        const q = res && res.data ? res.data : null;
        console.log("[QuizPage] /quiz response:", res);

        if (!mounted) return;

        if (!q) {
          setQuiz(null);
          setAnswers([]);
          return;
        }

        // log quiz structure
        console.log("[QuizPage] quiz:", q);
        setQuiz(q);

        const qLen = Array.isArray(q.questions) ? q.questions.length : 0;
        setAnswers(new Array(qLen).fill(null));
      } catch (err) {
        console.error("[QuizPage] fetchQuiz error:", err);
        setQuiz(null);
        setAnswers([]);
        // surface nicer message
        setRenderError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchQuiz();
    return () => { mounted = false; };
  }, [courseId]);

  // Defensive event handlers
  const handleSelect = (qIndex, optIndex) => {
    try {
      setAnswers((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        while (next.length <= qIndex) next.push(null);
        next[qIndex] = optIndex;
        return next;
      });
    } catch (err) {
      console.error("handleSelect error:", err);
      setRenderError(String(err));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!api || typeof api.post !== "function") {
        throw new Error("api.post not available — check client/src/api.js");
      }
      const res = await api.post(`/quiz/${courseId}/submit`, { answers });
      console.log("[QuizPage] submit response:", res);
      setResult(res.data || res);
    } catch (err) {
      console.error("Submit failed:", err);
      setRenderError(err?.response?.data?.message || err.message || String(err));
    }
  };

  const handleCodeRun = async (language = "javascript") => {
    try {
      setRunOutput("");
      setRunError("");
      setCodeRunning(true);
      if (!api || typeof api.post !== "function") throw new Error("api.post not available");
      const payload = { source: code, language, stdin: "" };
      const res = await api.post("/code/submit", payload);
      console.log("[QuizPage] code submit response:", res);
      const jr = res?.data?.judgeResult || res?.data || res;
      // best-effort extraction
      const stdout = jr?.stdout || jr?.stdout_text || jr?.output || "";
      const stderr = jr?.stderr || jr?.compile_output || "";
      setRunOutput(String(stdout));
      setRunError(String(stderr));
    } catch (err) {
      console.error("Run failed:", err);
      setRunError(err?.response?.data?.message || err.message || String(err));
    } finally {
      setCodeRunning(false);
    }
  };

  // render-level try/catch: capture exceptions and show them
  try {
    if (loading) return <div className="quiz-root"><p>Loading quiz...</p></div>;
    if (renderError) return <div className="quiz-root"><h3>Error</h3><pre>{renderError}</pre></div>;
    if (!quiz) return <div className="quiz-root"><p>No quiz available for this course.</p></div>;

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

    return (
      <div className="quiz-root">
        <h1 className="quiz-title">{quiz.title || "Quiz"}</h1>

        {result ? (
          <div className="quiz-result">
            <p className="quiz-score">Score: {result.score}%</p>
            <button onClick={() => navigate("/dashboard")}>Back</button>
            <h4>Correct answers (server):</h4>
            <pre>{JSON.stringify(result.correctAnswers, null, 2)}</pre>
          </div>
        ) : (
          <>
            {questions.map((q, i) => (
              <div key={i} className="quiz-card">
                <p>{i + 1}. {String(q.question)}</p>

                {q.type === "code" ? (
                  <div>
                    <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={8} style={{ width: "100%" }} />
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => handleCodeRun(q.language || "javascript")} disabled={codeRunning}>
                        {codeRunning ? "Running…" : "Run"}
                      </button>
                    </div>
                    <pre>Output: {runOutput}</pre>
                    <pre style={{ color: "darkred" }}>Error: {runError}</pre>
                  </div>
                ) : (
                  <ul>
                    {(Array.isArray(q.options) ? q.options : []).map((opt, j) => (
                      <li key={j}>
                        <label>
                          <input type="radio" name={`q-${i}`} checked={answers[i] === j} onChange={() => handleSelect(i, j)} />
                          {' '}{String(opt)}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <button onClick={handleSubmit}>Submit Quiz</button>
            </div>
          </>
        )}
      </div>
    );
  } catch (renderErr) {
    // final fallback — show the message and log full object
    console.error("Render error in QuizPage:", renderErr);
    setRenderError(String(renderErr));
    return <div className="quiz-root"><h3>Render error</h3><pre>{String(renderErr)}</pre></div>;
  }
}
