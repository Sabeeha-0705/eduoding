// client/src/pages/AdminVideos.jsx
import React, { useEffect, useState } from "react";
import { getMyVideos, updateVideo } from "../api/videos"; // named exports — ensure file exists
import { useAuth } from "../context";

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingIds, setApprovingIds] = useState(new Set());
  const { token } = useAuth();

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      setLoading(true);
      try {
        const res = await getMyVideos();
        const payload = Array.isArray(res.data) ? res.data : res.data?.videos ?? [];
        const pending = payload.filter((v) => v.status === "pending");
        if (mounted) setVideos(pending);
      } catch (err) {
        console.error("Failed to fetch videos", err);
        if (mounted) setVideos([]);
        alert("Failed to load videos. Check console.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (token) fetchPending();
    return () => { mounted = false; };
  }, [token]);

  const approveVideo = async (id) => {
    if (approvingIds.has(id)) return;
    setApprovingIds((s) => new Set(s).add(id));
    try {
      await updateVideo(id, { status: "published" });
      setVideos((prev) => prev.filter((v) => v._id !== id));
      alert("✅ Video approved!");
    } catch (err) {
      console.error("Approve failed", err);
      alert("Approve failed. See console.");
    } finally {
      setApprovingIds((s) => {
        const copy = new Set(s);
        copy.delete(id);
        return copy;
      });
    }
  };

  if (loading) return <div className="p-4"><h2 className="text-xl mb-4">Pending Videos</h2><p>Loading…</p></div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pending Videos</h2>
      {videos.length === 0 ? (
        <p>No pending videos 🎉</p>
      ) : (
        <ul className="space-y-4">
          {videos.map((video) => {
            const approving = approvingIds.has(video._id);
            return (
              <li key={video._id} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{video.title}</h3>
                  <p className="text-sm text-gray-600">Status: {video.status}</p>
                </div>
                <button
                  className={`px-4 py-2 rounded text-white ${approving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
                  onClick={() => approveVideo(video._id)}
                  disabled={approving}
                >
                  {approving ? "Approving…" : "Approve"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
