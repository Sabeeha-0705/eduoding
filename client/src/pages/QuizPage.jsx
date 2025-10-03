// client/src/pages/QuizPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./QuizPage.css";

export default function QuizPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // coding challenge state
  const [code, setCode] = useState("// write your code here");
  const [codeSaved, setCodeSaved] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/quiz/${courseId}`);
        setQuiz(res.data);
        setAnswers(new Array(res.data.questions.length).fill(null));
      } catch (err) {
        console.error("Quiz load failed:", err.response?.data || err.message);
        setQuiz(null);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [courseId]);

  const handleSelect = (qIndex, optIndex) => {
    const newAns = [...answers];
    newAns[qIndex] = optIndex;
    setAnswers(newAns);
  };

  const handleSubmit = async () => {
    try {
      const res = await api.post(`/quiz/${courseId}/submit`, { answers });
      setResult(res.data);
    } catch (err) {
      console.error("Submit failed:", err.response?.data || err.message);
      alert(err.response?.data?.message || err.message || "Submit failed");
    }
  };

  const handleCodeSave = async () => {
    try {
      await api.post(`/quiz/${courseId}/submit-code`, { code });
      setCodeSaved(true);
      setTimeout(() => setCodeSaved(false), 2000);
    } catch (err) {
      console.error("Code save failed:", err.response?.data || err.message);
      alert("Failed to save code");
    }
  };

  if (loading) return <p>Loading quiz...</p>;
  if (!quiz) return <p>No quiz available for this course.</p>;

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
                <a
                  href={result.certificate.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="quiz-cert"
                >
                  Download Certificate
                </a>
              ) : (
                <p>Certificate will appear soon in My Certificates.</p>
              )}
            </div>
          ) : (
            <p className="quiz-fail">❌ You failed. Try again!</p>
          )}

          <h3>Review Answers:</h3>
          {quiz.questions.map((q, i) => (
            <div key={i} className="quiz-card">
              <p className="quiz-q">{i + 1}. {q.question}</p>
              <ul>
                {q.options.map((opt, j) => {
                  const isCorrect = result.correctAnswers[i] === j;
                  const isSelected = answers[i] === j;
                  let className = "quiz-opt";
                  if (isSelected && isCorrect) className += " correct";
                  else if (isSelected && !isCorrect) className += " wrong";
                  else if (isCorrect) className += " correct";
                  return (
                    <li key={j} className={className}>{opt}</li>
                  );
                })}
              </ul>
            </div>
          ))}

          <button
            onClick={() => navigate("/dashboard")}
            className="quiz-btn back"
          >
            ⬅ Back to Dashboard
          </button>
        </div>
      ) : (
        <>
          {quiz.questions.map((q, i) => (
            <div key={i} className="quiz-card">
              <p className="quiz-q">{i + 1}. {q.question}</p>
              <ul>
                {q.options.map((opt, j) => (
                  <li key={j}>
                    <label className="quiz-opt">
                      <input
                        type="radio"
                        name={`q-${i}`}
                        checked={answers[i] === j}
                        onChange={() => handleSelect(i, j)}
                      />
                      {opt}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button onClick={handleSubmit} className="quiz-btn submit">
            Submit Quiz
          </button>

          {/* coding challenge area */}
          <div className="quiz-code">
            <h3>💻 Coding Challenge</h3>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={10}
            />
            <button onClick={handleCodeSave} className="quiz-btn code">
              Save Code
            </button>
            {codeSaved && <p className="saved-msg">✅ Code saved!</p>}
          </div>
        </>
      )}
    </div>
  );
}
