// client/src/pages/MySolutions.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import "./MySolutions.css"; // optional styling file

export default function MySolutions() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get(`/quiz/${courseId}/submissions`);
        setSubs(res.data || []);
      } catch (err) {
        console.error("Failed to load submissions:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>⬅ Back</button>
      <h1>My Code Submissions</h1>
      <p>Course: {courseId}</p>

      {loading ? <p>Loading…</p> : (
        <>
          {subs.length === 0 ? (
            <div>
              <p>No submissions yet. From the quiz page you can write & save your code.</p>
              <button onClick={() => navigate(`/course/${courseId}/quiz`)}>Go to Quiz</button>
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {subs.map((s) => (
                <li key={s._id} style={{ marginBottom: 18, background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>Submitted:</strong> {new Date(s.createdAt).toLocaleString()} <br />
                      <strong>Status:</strong> {s.result?.status || "saved"} | <strong>Language:</strong> {s.language}
                    </div>
                  </div>
                  <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 6, marginTop: 8, overflowX: "auto" }}>
                    {s.code}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
