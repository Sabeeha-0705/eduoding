// client/src/pages/SubmissionView.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./SubmissionView.css";

export default function SubmissionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/code/${id}`);
        setSubmission(res.data);
      } catch (err) {
        console.error("Load submission failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="sub-view"><p>Loading submission…</p></div>;
  if (!submission) return <div className="sub-view"><p>Submission not found.</p></div>;

  return (
    <div className="sub-view">
      <div className="sub-meta">
        <b>Title:</b> {submission.title || "Untitled"} <br />
        <b>Language:</b> {submission.languageName || submission.languageId} <br />
        <b>Created:</b> {new Date(submission.createdAt).toLocaleString()} <br />
        <b>Status:</b> {submission.status}
      </div>

      <pre className="sub-code">{submission.source}</pre>

      <div className="sub-output">
        {submission.stdout && (
          <pre className="stdout">Output:\n{submission.stdout}</pre>
        )}
        {submission.stderr && (
          <pre className="stderr">Error:\n{submission.stderr}</pre>
        )}
        {submission.compileOutput && (
          <pre className="stderr">Compiler:\n{submission.compileOutput}</pre>
        )}
      </div>

      <div className="sub-actions">
        <button className="btn primary" onClick={() => navigate(`/course/${submission.courseId}/quiz`)}>Back to Quiz</button>
        <button className="btn ghost" onClick={() => navigate(-1)}>⬅ Back</button>
      </div>
    </div>
  );
}
