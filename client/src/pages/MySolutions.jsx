// client/src/pages/MySolutions.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./MySolutions.css";

export default function MySolutions() {
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/code/mine/all");
        setSubs(res.data || []);
      } catch (err) {
        console.error("Failed to load submissions:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="mysol-root">
      <button className="back-btn" onClick={() => navigate(-1)}>⬅ Back</button>
      <h1>My Code Submissions</h1>

      {loading ? (
        <p>Loading…</p>
      ) : subs.length === 0 ? (
        <div className="empty-card">
          <p>No submissions yet. Go to a quiz or code editor and submit your code.</p>
          <button className="btn" onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
        </div>
      ) : (
        <ul className="solutions-list">
          {subs.map((s) => (
            <li key={s._id} className="solution-card">
              <div className="solution-meta">
                <strong>Submitted:</strong> {new Date(s.createdAt).toLocaleString()} <br />
                <strong>Language:</strong> {s.languageName || s.languageId} <br />
                <strong>Status:</strong> {s.status}
              </div>
              <pre className="solution-code">{s.source}</pre>
              {s.stdout && (
                <div className="solution-output">
                  <strong>Output:</strong>
                  <pre>{s.stdout}</pre>
                </div>
              )}
              {s.stderr && (
                <div className="solution-error">
                  <strong>Error:</strong>
                  <pre>{s.stderr}</pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
