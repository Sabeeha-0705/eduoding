// client/src/pages/BadgesPage.jsx
import { useEffect, useState } from "react";
import API from "../api";
import "./BadgesPage.css";

export default function BadgesPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/users/me").catch(() => API.get("/auth/profile"));
        const u = res.data?.user || res.data;
        setUser(u);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading badges…</div>;

  const badges = Array.isArray(user?.badges) ? user.badges.slice().reverse() : [];

  return (
    <div className="badges-container">
      <div className="badges-header">
        <div>
          <h2>Your Badges</h2>
          <div className="badges-intro">
            Congrats! Badges are awarded for milestones and first code challenge passes.
          </div>
        </div>
      </div>

      <div className="badge-hero" role="region" aria-label="Badge hero">
        <img src="/assets/cup.png" alt="Trophy cup" />
        <div className="badge-user-info">
          <div className="name">{user?.username || user?.email || "Learner"}</div>
          <div className="points">Points: <strong>{user?.points ?? 0}</strong></div>
          <div className="small-meta" style={{ marginTop: 6 }}>
            {(user?.badges && user.badges.length) ? `${user.badges.length} badge(s)` : "No badges yet"}
          </div>
        </div>
      </div>

      <div className="badges-list">
        {badges.length === 0 ? (
          <div className="badges-empty">
            <p>No badges yet — complete code challenges and quizzes to earn badges.</p>
          </div>
        ) : (
          badges.map((b, i) => (
            <div key={i} className="badge-card" role="listitem" aria-label={`Badge ${b}`}>
              <img src="/assets/badge-icon.png" alt="Badge icon" />
              <div className="badge-title">{b}</div>
              <small>Awarded: —</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
