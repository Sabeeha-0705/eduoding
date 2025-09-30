import React, { useEffect, useState } from "react";
import api from "../api"; // axios instance (default export)

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/videos/pending");
        const payload = res.data?.videos || [];
        if (mounted) setVideos(payload);
      } catch (err) {
        console.error("Failed to fetch pending videos", err);
        alert("Failed to load videos. Check console.");
        if (mounted) setVideos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPending();
    return () => { mounted = false; };
  }, []);

  const changeStatus = async (id, newStatus) => {
    if (approving.has(id)) return;
    setApproving(s => new Set(s).add(id));
    try {
      await api.put(`/admin/videos/${id}/status`, { status: newStatus });
      // Remove from list after change
      setVideos(v => v.filter(x => x._id !== id));
      alert("✅ Video updated");
    } catch (err) {
      console.error("Change status failed", err);
      alert("Failed to update. See console.");
    } finally {
      setApproving(s => {
        const copy = new Set(s);
        copy.delete(id);
        return copy;
      });
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pending Videos</h2>
      {videos.length === 0 ? (
        <p>No pending videos 🎉</p>
      ) : (
        <ul className="space-y-4">
          {videos.map(video => {
            const isBusy = approving.has(video._id);
            const uploaderName = (video.uploaderId && (video.uploaderId.username || video.uploaderId.email)) || "Uploader";
            return (
              <li key={video._id} className="p-4 border rounded flex justify-between">
                <div>
                  <h3 className="font-semibold">{video.title}</h3>
                  <p className="text-sm text-gray-600">By: {uploaderName}</p>
                  <p className="text-sm text-gray-600">Status: {video.status}</p>
                  {video.description && <p className="text-sm text-gray-600 mt-2">{video.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded"
                    disabled={isBusy}
                    onClick={() => changeStatus(video._id, "approved")}
                  >
                    {isBusy ? "Working…" : "Approve"}
                  </button>
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded"
                    disabled={isBusy}
                    onClick={() => {
                      if (!window.confirm("Reject this video?")) return;
                      changeStatus(video._1d, "rejected");
                    }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
