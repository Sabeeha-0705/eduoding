// client/src/pages/CodeTest.jsx
import { useEffect, useState, useCallback } from "react";
import API from "../api";
import "./CodeTest.css";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";

/**
 * Eduoding CodeTest Page
 * - Practice samples (auto loaded)
 * - Real Judge0 backend run
 * - VS Code-style output console with runtime info
 */

const LOCAL_LANGS = [
  { id: 63, name: "javascript (node)", monaco: "javascript" },
  { id: 71, name: "python3", monaco: "python" },
  { id: 46, name: "bash", monaco: "shell" },
  { id: 62, name: "java", monaco: "java" },
];

const PRACTICE_SAMPLES = {
  63: {
    title: "Print Hello Eduoding (Node.js)",
    boilerplate: `// Print exactly "Hello Eduoding" to stdout\nconsole.log('Hello Eduoding');`,
    expected: "Hello Eduoding",
    hint: "Use console.log()",
  },
  71: {
    title: "Print AI Ready (Python)",
    boilerplate: `# Print exactly "AI Ready" to stdout\nprint("AI Ready")`,
    expected: "AI Ready",
    hint: "Use print()",
  },
  46: {
    title: "Print Cloud Ready (bash)",
    boilerplate: `#!/bin/bash\necho "Cloud Ready"`,
    expected: "Cloud Ready",
    hint: "Use echo",
  },
  62: {
    title: "Print Design Ready (Java)",
    boilerplate: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Design Ready");\n  }\n}`,
    expected: "Design Ready",
    hint: "Use System.out.println",
  },
};

function resolveMonacoLang(langId) {
  const found = LOCAL_LANGS.find((l) => l.id === Number(langId));
  return found ? found.monaco : "plaintext";
}

export default function CodeTest({ initialCourseId = null }) {
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId);
  const [courses, setCourses] = useState([]);
  const [language, setLanguage] = useState(63);
  const [code, setCode] = useState(PRACTICE_SAMPLES[63].boilerplate);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [showConsole, setShowConsole] = useState(true);
  const navigate = useNavigate();

  // Load courses
  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/courses");
        const list = Array.isArray(res.data) ? res.data : res.data?.courses || [];
        setCourses(
          list.map((c) => ({
            id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title),
            title: c.title || c.name || "Untitled Course",
          }))
        );
      } catch {
        setCourses([
          { id: "1", title: "Full Stack Web Development (MERN)" },
          { id: "2", title: "Data Science & AI" },
        ]);
      }
    })();
  }, []);

  // Auto-update code when language changes
  useEffect(() => {
    const sample = PRACTICE_SAMPLES[language];
    if (sample) setCode(sample.boilerplate);
  }, [language]);

  const runPractice = useCallback(async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await API.post("/judge0/run", { code, language });
      setOutput(res.data);
    } catch (err) {
      setOutput({ error: err?.response?.data?.message || err.message || "Execution failed" });
    } finally {
      setRunning(false);
      setShowConsole(true);
    }
  }, [code, language]);

  const monacoLang = resolveMonacoLang(language);

  return (
    <div className="code-test-wrap">
      <h2>💻 Code Practice & Test</h2>
      <p className="small-meta">Run your code instantly and view output below — just like VS Code terminal.</p>

      {/* Language & Control Bar */}
      <div className="top-bar">
        <div className="lang-select">
          <label>Language</label>
          <select value={language} onChange={(e) => setLanguage(Number(e.target.value))}>
            {LOCAL_LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="top-buttons">
          <button onClick={runPractice} disabled={running}>
            {running ? "Running…" : "▶ Run"}
          </button>
          <button onClick={() => setCode(PRACTICE_SAMPLES[language]?.boilerplate || "")}>Reset</button>
        </div>
      </div>

      {/* Code Editor */}
      <Editor
        height="360px"
        language={monacoLang}
        value={code}
        onChange={(val) => setCode(val ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          wordWrap: "on",
          scrollBeyondLastLine: false,
        }}
      />

      {/* Collapsible Output Console */}
      <div className="output-console">
        <div className="console-header" onClick={() => setShowConsole((v) => !v)}>
          <strong>🧮 Output Console</strong>
          <span>{showConsole ? "▼" : "▲"}</span>
        </div>

        {showConsole && (
          <div className="console-body">
            {output ? (
              output.error ? (
                <pre className="console-error">{output.error}</pre>
              ) : (
                <>
                  <pre className="console-output">{output.output}</pre>
                  <div className="console-meta">
                    Time: {output.time ?? "—"}s | Memory: {output.memory ?? "—"}KB
                  </div>
                </>
              )
            ) : (
              <p className="console-hint">💡 Press “Run” to execute your code and see output here.</p>
            )}
          </div>
        )}
      </div>

      {/* Optional: show sample hint */}
      <div style={{ marginTop: 16, fontSize: 13, color: "#6b7280" }}>
        <strong>Hint:</strong> {PRACTICE_SAMPLES[language]?.hint}
      </div>
    </div>
  );
}
