// client/src/pages/QuizPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api"; // keep this if your api export is named `api`
import "./QuizPage.css";

export default function QuizPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // coding challenge state (single global code area for now)
  const [code, setCode] = useState("// write your code here\nconsole.log('Hello Eduoding');");
  const [codeSaved, setCodeSaved] = useState(false);
  const [codeRunning, setCodeRunning] = useState(false);
  const [runOutput, setRunOutput] = useState(null);
  const [runError, setRunError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/quiz/${courseId}`);
        const q = res && res.data ? res.data : null;

        if (!mounted) return;

        if (!q) {
          setQuiz(null);
          setAnswers([]);
          return;
        }

        setQuiz(q);

        // safe initialization for answers (guard when q.questions missing)
        const qLen = Array.isArray(q.questions) ? q.questions.length : 0;
        setAnswers(new Array(qLen).fill(null));

        // optional: if quiz contains per-question code templates you can initialize here
        // (left simple — you use single global `code` editor here)
      } catch (err) {
        console.error("Quiz load failed:", err);
        setQuiz(null);
        setAnswers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchQuiz();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const handleSelect = (qIndex, optIndex) => {
    // guard: ensure answers array big enough
    setAnswers((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      while (next.length <= qIndex) next.push(null);
      next[qIndex] = optIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      const res = await api.post(`/quiz/${courseId}/submit`, { answers });
      const data = res && res.data ? res.data : null;
      setResult(data);
    } catch (err) {
      console.error("Submit failed:", err);
      alert(err?.response?.data?.message || err?.message || "Submit failed");
    }
  };

  // Save code (store on server — endpoint implemented on backend: POST /api/quiz/:courseId/submit-code)
  const handleCodeSave = async () => {
    try {
      setCodeSaved(false);
      await api.post(`/quiz/${courseId}/submit-code`, { code });
      setCodeSaved(true);
      setTimeout(() => setCodeSaved(false), 2000);
    } catch (err) {
      console.error("Code save failed:", err);
      alert(err?.response?.data?.message || "Failed to save code");
    }
  };

  // Run code via server /code/submit which wraps Judge0
  const handleCodeRun = async (language = "javascript") => {
    try {
      setRunOutput(null);
      setRunError(null);
      setCodeRunning(true);

      const payload = {
        source: code,
        language: language,
        stdin: "",
        title: `Quiz-${courseId}-run`,
      };

      const res = await api.post("/code/submit", payload);
      // server returns { submission, judgeResult } or judgeResult directly
      const jr = (res && res.data && (res.data.judgeResult || res.data)) || null;

      // Judge0 response fields vary by provider/wrapper.
      // Try to extract common fields (stdout, stderr, compile_output)
      let stdout = "";
      let stderr = "";

      if (jr) {
        // if wrapper returned judgeResult under `judgeResult`
        const body = jr.stdout || jr.stdout_text || jr.output || jr;
        stdout = typeof body === "string" ? body : (jr.stdout || "");
        stderr = jr.stderr || jr.compile_output || jr.compile_output_text || "";
      }

      setRunOutput(stdout || "");
      setRunError(stderr || "");
    } catch (err) {
      console.error("Run failed:", err);
      setRunError(err?.response?.data?.message || err?.message || "Run failed");
    } finally {
      setCodeRunning(false);
    }
  };

  // safe helpers for rendering lists
  const questionsList = Array.isArray(quiz?.questions) ? quiz.questions : [];

  if (loading) return <div className="quiz-root"><p>Loading quiz...</p></div>;
  if (!quiz) return <div className="quiz-root"><p>No quiz available for this course.</p></div>;

  return (
    <div className="quiz-root">
      <h1 className="quiz-title">{quiz.title}</h1>

      {result ? (
        <div className="quiz-result">
          <p className="quiz-score">Score: {result.score}%</p>
          {result.message === "Passed" ? (
            <div>
              <p className="quiz-pass">✅ You passed!</p>
              {result.certificate?.pdfUrl ? (
                <a href={result.certificate.pdfUrl} target="_blank" rel="noreferrer" className="quiz-cert">Download Certificate</a>
              ) : (
                <p className="quiz-note">Certificate will appear in "My Certificates" soon.</p>
              )}
            </div>
          ) : (
            <p className="quiz-fail">❌ You failed. Try again!</p>
          )}

          <h3>Review Answers</h3>
          {questionsList.map((q, i) => (
            <div key={i} className="quiz-card">
              <p className="quiz-q">{i + 1}. {q.question}</p>
              <ul className="quiz-options">
                {(Array.isArray(q.options) ? q.options : []).map((opt, j) => {
                  const isCorrect = result?.correctAnswers && result.correctAnswers[i] === j;
                  const isSelected = answers[i] === j;
                  let cls = "quiz-opt";
                  if (isCorrect) cls += " correct";
                  if (isSelected && !isCorrect) cls += " wrong";
                  return <li key={j} className={cls}>{opt}{isSelected ? " (your answer)" : ""}</li>;
                })}
              </ul>
            </div>
          ))}

          <div className="quiz-actions">
            <button className="quiz-btn back" onClick={() => navigate("/dashboard")}>⬅ Back to Dashboard</button>
          </div>
        </div>
      ) : (
        <>
          {questionsList.map((q, i) => (
            <div key={i} className="quiz-card">
              <p className="quiz-q">{i + 1}. {q.question}</p>

              {q.type === "code" ? (
                <div className="quiz-code-question">
                  <textarea
                    className="quiz-code-editor"
                    rows={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <div className="code-actions">
                    <button
                      className="quiz-btn code"
                      onClick={() => handleCodeRun(q.language || "javascript")}
                      disabled={codeRunning}
                    >
                      {codeRunning ? "Running…" : "Run"}
                    </button>
                    <button className="quiz-btn" onClick={handleCodeSave}>Save</button>
                    <div className="code-output">
                      {runOutput && <pre className="stdout">Output:\n{runOutput}</pre>}
                      {runError && <pre className="stderr">Error:\n{runError}</pre>}
                    </div>
                  </div>
                </div>
              ) : (
                <ul className="quiz-options">
                  {(Array.isArray(q.options) ? q.options : []).map((opt, j) => (
                    <li key={j}>
                      <label className="quiz-opt choice">
                        <input
                          type="radio"
                          name={`q-${i}`}
                          checked={answers[i] === j}
                          onChange={() => handleSelect(i, j)}
                        />
                        <span className="opt-text">{opt}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="quiz-actions">
            <button onClick={handleSubmit} className="quiz-btn submit">Submit Quiz</button>
            <button onClick={() => navigate(-1)} className="quiz-btn back">Cancel</button>
          </div>

          {quiz.allowGlobalCode && (
            <div className="quiz-code global">
              <h3>💻 Global Coding Challenge</h3>
              <textarea className="quiz-code-editor" rows={10} value={code} onChange={(e) => setCode(e.target.value)} />
              <div className="code-actions">
                <button className="quiz-btn code" onClick={() => handleCodeRun("javascript")} disabled={codeRunning}>
                  {codeRunning ? "Running…" : "Run Code"}
                </button>
                <button className="quiz-btn" onClick={handleCodeSave}>Save Code</button>
                {codeSaved && <span className="saved-msg">Saved ✓</span>}
              </div>
              <div className="code-output">
                {runOutput && <pre className="stdout">Output:\n{runOutput}</pre>}
                {runError && <pre className="stderr">Error:\n{runError}</pre>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
