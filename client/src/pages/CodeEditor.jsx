// client/src/pages/CodeEditor.jsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api";
import "./CodeEditor.css";

export default function CodeEditor() {
  const navigate = useNavigate();
  // optional: courseId from route if editor is course-scoped
  const { courseId, lessonId } = useParams();

  const [source, setSource] = useState(`// Hello world\nconsole.log("Hello from Eduoding");`);
  // default to numeric Judge0 id for Node.js (63)
  const [language, setLanguage] = useState("63"); // keep as string from <select>
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
      // prepare payload: if `language` is numeric (string of digits), send languageId (number)
      const isNumeric = /^\d+$/.test(String(language));
      const payload = {
        source,
        stdin,
        courseId: courseId || null,
        lessonId: lessonId || null,
        title: `Solution ${new Date().toLocaleString()}`,
      };

      if (isNumeric) {
        // Judge0 wants `language_id` or your backend expects `languageId` — include both to be safe
        payload.languageId = Number(language);
        payload.language_id = Number(language);
      } else {
        // send the name (backend must map name -> id)
        payload.language = language;
      }

      // backend will create DB record and call Judge0 (wait=true)
      const res = await API.post("/code/submit", payload);
      const { submission, judgeResult } = res.data;

      // unify result for UI
      setResult({
        submission,
        judgeResult,
      });
    } catch (err) {
      console.error("Run failed:", err);
      // try to show helpful message from backend
      const msg = err?.response?.data?.message || err?.message || "Execution failed";
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="editor-root">
      <div className="editor-header">
        <button className="btn back" onClick={() => navigate(-1)}>⬅ Back</button>
        <h2>Code Editor</h2>
        <div className="header-right">
          <button className="btn primary" onClick={runCode} disabled={running}>
            {running ? "Running…" : "Run & Save"}
          </button>
          <button className="btn" onClick={() => navigate("/code/mine/all")}>My Solutions</button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-controls">
          <label>
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {/* Prefer numeric ids (Judge0): using string form here so select works */}
              <option value="63">JavaScript (Node) — 63</option>
              <option value="71">Python (3) — 71</option>
              <option value="62">Java — 62</option>
              <option value="50">C — 50</option>
              <option value="54">C++ (g++) — 54</option>
              <option value="80">Go — 80</option>

              {/* fallback names (if backend resolves names) */}
              <option value="javascript">javascript (name)</option>
              <option value="python">python (name)</option>
              <option value="c">c (name)</option>
              <option value="cpp">cpp (name)</option>
            </select>
          </label>

          <label>
            Stdin (optional)
            <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} />
          </label>
        </div>

        <div className="editor-area">
          <textarea
            className="code-input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
          />

          <div className="editor-output">
            <h4>Output</h4>
            {error && <div className="output-error">{error}</div>}

            {!result && !error && <div className="output-muted">No output yet — run the code.</div>}

            {result && (
              <>
                <div className="output-section">
                  <strong>Stdout:</strong>
                  <pre className="mono">{result.judgeResult?.stdout ?? result.submission?.stdout ?? "(empty)"}</pre>
                </div>

                {result.judgeResult?.stderr && (
                  <div className="output-section">
                    <strong>Stderr:</strong>
                    <pre className="mono error">{result.judgeResult.stderr}</pre>
                  </div>
                )}

                {result.judgeResult?.compile_output && (
                  <div className="output-section">
                    <strong>Compile Output:</strong>
                    <pre className="mono error">{result.judgeResult.compile_output}</pre>
                  </div>
                )}

                {result.submission && (
                  <div className="output-meta">
                    <small>Submission saved. <button className="link" onClick={() => navigate(`/code/${result.submission._id}`)}>View</button> · <button className="link" onClick={() => navigate("/code/mine/all")}>My Solutions</button></small>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
