// client/src/pages/AdminRequests.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api"; // uses your existing api helper
import { useNavigate } from "react-router-dom";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setErr(null);
      try {
        // server route expected: GET /api/admin/uploader-requests
        const res = await api.get("/admin/uploader-requests");
        setRequests(res.data || []);
      } catch (e) {
        console.error("Fetch uploader requests failed:", e);
        setErr(e.message || "Failed to load requests");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const approve = async (id) => {
    if (!window.confirm("Approve this user as uploader?")) return;
    try {
      // server route expected: PUT /api/admin/approve-uploader/:id
      await api.put(`/admin/approve-uploader/${id}`, { role: "uploader" });
      // remove from UI
      setRequests((r) => r.filter((u) => u._id !== id));
      alert("User approved as uploader ✅");
    } catch (e) {
      console.error("Approve failed:", e);
      alert(e.message || "Approve failed");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl mb-4">Uploader Requests</h2>

      {requests.length === 0 ? (
        <p>No requests at the moment.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((u) => (
            <li key={u._id} className="flex justify-between items-center border p-3 rounded">
              <div>
                <div style={{ fontWeight: 600 }}>{u.username || u.email}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{u.email}</div>
                {u.requestedUploader && <div style={{ fontSize: 12, color: "#0a66c2" }}>Requested uploader</div>}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => approve(u._id)}
                  style={{ background: "#16a34a", color: "white", padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer" }}
                >
                  Approve
                </button>

                <button
                  onClick={() => navigate(`/admin/user/${u._id}`)}
                  style={{ background: "#f3f4f6", color: "#111827", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", cursor: "pointer" }}
                >
                  View
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
