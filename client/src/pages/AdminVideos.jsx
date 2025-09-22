// client/src/pages/AdminVideos.jsx
import React from "react";
import { useEffect, useState } from "react";
import api from "../api/videos"; // adjust path to your axios instance
import { useAuth } from "../context/AuthContext";


export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const { token } = useAuth(); // your auth hook

  // Fetch all pending videos
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get("/api/videos/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pending = res.data.filter((v) => v.status === "pending");
        setVideos(pending);
      } catch (err) {
        console.error("Failed to fetch videos", err);
      }
    };
    fetchPending();
  }, [token]);

  // Approve handler
  const approveVideo = async (id) => {
    try {
      await api.put(
        `/api/videos/${id}`,
        { status: "published" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVideos((prev) => prev.filter((v) => v._id !== id)); // remove from list
      alert("✅ Video approved!");
    } catch (err) {
      console.error("Approve failed", err);
      alert("❌ Approve failed");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pending Videos</h2>
      {videos.length === 0 ? (
        <p>No pending videos 🎉</p>
      ) : (
        <ul className="space-y-4">
          {videos.map((video) => (
            <li key={video._id} className="p-4 border rounded flex justify-between">
              <div>
                <h3 className="font-semibold">{video.title}</h3>
                <p>Status: {video.status}</p>
              </div>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={() => approveVideo(video._id)}
              >
                Approve
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
