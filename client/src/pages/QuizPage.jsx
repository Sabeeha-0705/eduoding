// client/src/pages/QuizPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function QuizPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/quiz/${courseId}`);
        setQuiz(res.data);
        setAnswers(new Array(res.data.questions.length).fill(null));
      } catch (err) {
        console.error("Quiz load failed:", err.response?.data || err.message);
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
    }
  };

  if (!quiz) return <p>Loading quiz...</p>;
  if (!quiz) return <p>No quiz available for this course.</p>;


  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{quiz.title}</h1>
      {result ? (
        <div>
          <p className="text-xl">Score: {result.score}%</p>
          {result.message === "Passed" ? (
            <div>
              <p className="text-green-600">✅ You passed!</p>
              <a
                href={result.certificate.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                Download Certificate
              </a>
            </div>
          ) : (
            <p className="text-red-600">❌ You failed. Try again!</p>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <>
          {quiz.questions.map((q, i) => (
            <div key={i} className="mb-6">
              <p className="font-medium">{i + 1}. {q.question}</p>
              <ul>
                {q.options.map((opt, j) => (
                  <li key={j}>
                    <label className="flex items-center gap-2">
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
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Submit Quiz
          </button>
        </>
      )}
    </div>
  );
}
