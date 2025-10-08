// client/src/pages/Leaderboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import "./Leaderboard.css";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await API.get("/leaderboard");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Leaderboard load failed:", err);
      setUsers([]);
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchLeaderboard();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchLeaderboard]);

  // listen for global user-updated event (triggered after avatar upload / profile save)
  useEffect(() => {
    const handler = (e) => {
      // simply refetch leaderboard so updated avatar is shown
      fetchLeaderboard();
    };
    window.addEventListener("eduoding:user-updated", handler);
    return () => window.removeEventListener("eduoding:user-updated", handler);
  }, [fetchLeaderboard]);

  if (loading)
    return (
      <div className="leaderboard">
        <p>Loading leaderboard…</p>
      </div>
    );

  if (loadError)
    return (
      <div className="leaderboard">
        <p>Error loading leaderboard. Check console / network.</p>
      </div>
    );

  return (
    <div className="leaderboard page-inner">
      <h2>🏆 Leaderboard</h2>
      <p>Top learners by points</p>

      {users.length === 0 ? (
        <div className="empty-card">
          <p>No users yet.</p>
        </div>
      ) : (
        <div className="table-wrap">
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
                <tr key={u._id || i}>
                  <td>{i + 1}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <img
                        src={
                          u.avatarUrl ||
                          u.avatar ||
                          "/assets/default-avatar.png"
                        }
                        alt={u.username || u.email}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #ddd",
                        }}
                        onError={(e) => {
                          // fallback to default avatar if broken url
                          e.currentTarget.src = "/assets/default-avatar.png";
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>
                        {u.username || u.email || "Anonymous"}
                      </span>
                    </div>
                  </td>
                  <td>{Number(u.points || 0)}</td>
                  <td>
                    {Array.isArray(u.badges) && u.badges.length ? (
                      <span>🏅 {u.badges.join(", ")}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{u.role || "user"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
