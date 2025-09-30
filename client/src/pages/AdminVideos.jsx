// client/src/pages/AdminVideos.jsx
import React, { useEffect, useState } from "react";
import api from "../api"; // axios instance (default export)

/**
 * AdminVideos
 * - Shows pending videos
 * - Lets admin assign courseId to each video (dropdown)
 * - Approve (Publish) or Reject videos
 *
 * Behaviour:
 * 1. If admin picks a course, we first PATCH the video with courseId (PUT /videos/:id).
 * 2. Then we call PUT /admin/videos/:id/status with { status: "published" } (backend normalizes to "approved").
 * 3. On success we remove the video from the pending list and show a toast/alert.
 */

const allCourses = [
  { id: "1", title: "Full Stack Web Development (MERN)" },
  { id: "2", title: "Data Science & AI" },
  { id: "3", title: "Cloud & DevOps" },
  { id: "4", title: "Cybersecurity & Ethical Hacking" },
  { id: "5", title: "UI/UX Design" },
];

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/admin/videos/pending");
        const payload = res.data?.videos || [];
        // initialize local selectedCourse state on each video
        const withSel = payload.map((v) => ({
          ...v,
          _selectedCourse: v.courseId || "",
        }));
        if (mounted) setVideos(withSel);
      } catch (err) {
        console.error("Failed to fetch pending videos", err);
        setError("Failed to load pending videos. Check console.");
        if (mounted) setVideos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPending();
    return () => {
      mounted = false;
    };
  }, []);

  const setCourseForVideo = (videoId, courseId) => {
    setVideos((prev) => prev.map((v) => (v._id === videoId ? { ...v, _selectedCourse: courseId } : v)));
  };

  const changeStatus = async (id, newStatus) => {
    // prevent double clicks
    if (approving.has(id)) return;
    setApproving((s) => new Set(s).add(id));

    try {
      const vid = videos.find((v) => v._id === id);
      // If admin selected a course and it's different from current, save it first
      if (vid && vid._selectedCourse && vid._selectedCourse !== (vid.courseId || "")) {
        try {
          await api.put(`/videos/${id}`, { courseId: vid._selectedCourse });
        } catch (e) {
          console.error("Failed to save courseId on video:", e);
          alert("Failed to save course selection. See console.");
          // still allow approve if admin confirms
          if (!window.confirm("Failed to save course selection. Approve anyway?")) {
            setApproving((s) => {
              const copy = new Set(s);
              copy.delete(id);
              return copy;
            });
            return;
          }
        }
      }

      // now update status via admin route
      // send "published" — server normalizes to "approved"
      await api.put(`/admin/videos/${id}/status`, { status: newStatus });

      // remove from UI list
      setVideos((v) => v.filter((x) => x._id !== id));
      alert("✅ Video updated");
    } catch (err) {
      console.error("Change status failed", err);
      alert("Failed to update. See console.");
    } finally {
      setApproving((s) => {
        const copy = new Set(s);
        copy.delete(id);
        return copy;
      });
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Pending Videos</h2>

      {videos.length === 0 ? (
        <p>No pending videos 🎉</p>
      ) : (
        <ul className="space-y-4">
          {videos.map((video) => {
            const isBusy = approving.has(video._id);
            return (
              <li key={video._id} className="p-4 border rounded flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600 }}>{video.title}</h3>
                  <p style={{ color: "#444", marginTop: 6 }}>{video.description}</p>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                    <div>Uploader: {video.uploaderId?.username || video.uploaderId?.email || "—"}</div>
                    <div style={{ marginTop: 4 }}>Status: <strong>{video.status}</strong></div>
                    <div style={{ marginTop: 6 }}>
                      {/* Course selector */}
                      <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Assign to course</label>
                      <select
                        value={video._selectedCourse || ""}
                        onChange={(e) => setCourseForVideo(video._id, e.target.value)}
                        style={{ padding: 8, borderRadius: 6, minWidth: 220 }}
                      >
                        <option value="">— Select course (optional) —</option>
                        {allCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      {video.courseId ? (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#0a66c2" }}>
                          Current assigned course: <strong>{video.courseId}</strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="px-4 py-2"
                    style={{
                      background: "#16a34a",
                      color: "white",
                      borderRadius: 6,
                      border: "none",
                      cursor: isBusy ? "not-allowed" : "pointer",
                    }}
                    disabled={isBusy}
                    onClick={() => {
                      if (!video._selectedCourse) {
                        // warn if no course selected — admin might want to approve anyway
                        if (!window.confirm("No course selected. If you approve now, lesson auto-creation will NOT happen. Approve anyway?")) return;
                      }
                      changeStatus(video._id, "published");
                    }}
                  >
                    {isBusy ? "Working…" : "Approve"}
                  </button>

                  <button
                    className="px-4 py-2"
                    style={{
                      background: "#ef4444",
                      color: "white",
                      borderRadius: 6,
                      border: "none",
                      cursor: isBusy ? "not-allowed" : "pointer",
                    }}
                    disabled={isBusy}
                    onClick={() => {
                      if (!window.confirm("Reject this video?")) return;
                      changeStatus(video._id, "rejected");
                    }}
                  >
                    Reject
                  </button>

                  <button
                    className="px-3 py-2"
                    style={{
                      background: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "#111827",
                    }}
                    onClick={() => {
                      // open video preview in new tab if youtube or fileUrl exists
                      const url = video.sourceType === "youtube" ? video.youtubeUrl : video.fileUrl;
                      if (url) window.open(url, "_blank");
                      else alert("No preview available");
                    }}
                  >
                    Preview
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
