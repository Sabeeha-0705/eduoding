// client/src/pages/Leaderboard.jsx
import React, { useEffect, useState } from "react";
import API from "../api";
import "./Leaderboard.css";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await API.get("/leaderboard");
        setUsers(res.data || []);
      } catch (err) {
        console.error("Leaderboard load failed:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="leaderboard"><p>Loading leaderboard…</p></div>;

  return (
    <div className="leaderboard page-inner">
      <h2>🏆 Leaderboard</h2>
      <p>Top learners by points</p>

      {users.length === 0 ? (
        <div className="empty-card"><p>No users yet.</p></div>
      ) : (
        <table className="ldb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Points</th>
              <th>Badges</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u._id}>
                <td>{i + 1}</td>
                <td>{u.username || u.email}</td>
                <td>{u.points || 0}</td>
                <td>{(u.badges && u.badges.length) ? u.badges.join(", ") : "—"}</td>
                <td>{u.role || "user"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
