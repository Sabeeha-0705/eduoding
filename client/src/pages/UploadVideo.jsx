// src/pages/UploadVideo.jsx
import { useState, useEffect } from "react";
import { uploadVideoFile, addYoutubeVideo, getCourses } from "../api/videos";
import { useNavigate } from "react-router-dom";
import "./UploadPage.css"; // optional: reuse existing styles

export default function UploadVideo() {
  const [mode, setMode] = useState("upload"); // "upload" | "youtube"
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(""); // selected course
  const navigate = useNavigate();

  // Optional: load static or backend course list
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCourses();
        setCourses(res.data || []);
        if ((res.data || []).length > 0) setCourseId((res.data || [])[0].id || (res.data || [])[0]._id);
      } catch (err) {
        // Fallback to static list if API not available
        setCourses([
          { id: "1", title: "Full Stack Web Development (MERN)" },
          { id: "2", title: "Data Science & AI" },
          { id: "3", title: "Cloud & DevOps" },
          { id: "4", title: "Cybersecurity & Ethical Hacking" },
          { id: "5", title: "UI/UX Design" }
        ]);
        setCourseId("1");
      }
    };
    load();
  }, []);

  const handleFile = (e) => setFile(e.target.files?.[0] || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (!courseId) return setMsg("Please choose a course.");
      if (mode === "upload") {
        if (!file) return setMsg("Choose a video file first.");
        const fd = new FormData();
        fd.append("video", file);
        fd.append("title", title || file.name);
        fd.append("description", desc);
        fd.append("courseId", courseId);

        const res = await uploadVideoFile(fd, setProgress);
        setMsg(res.data?.message || "Uploaded");
        navigate("/uploader/dashboard");
      } else {
        if (!youtubeUrl) return setMsg("Paste YouTube URL");
        const payload = { youtubeUrl, title, description: desc, courseId };
        const res = await addYoutubeVideo(payload);
        setMsg(res.data?.message || "Saved");
        navigate("/uploader/dashboard");
      }
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || "Upload failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload / Add Video</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 12 }}>
          <input type="radio" checked={mode === "upload"} onChange={() => setMode("upload")} /> Upload file
        </label>
        <label>
          <input type="radio" checked={mode === "youtube"} onChange={() => setMode("youtube")} /> YouTube URL
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 12, maxWidth: 700 }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            <option value="">-- Select course --</option>
            {courses.map((c) => (
              <option key={c.id ?? c._id} value={c.id ?? c._id}>
                {c.title || c.name || `Course ${c.id ?? c._id}`}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" style={{ width: "100%" }} />
        </div>

        {mode === "upload" ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <input type="file" accept="video/*" onChange={handleFile} />
            </div>
            <div style={{ width: "100%", background: "#eee", height: 8, marginTop: 8 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#5b6bff" }} />
            </div>
            <p>{progress}%</p>
          </>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." style={{ width: "100%" }} />
          </div>
        )}

        <button type="submit" style={{ marginTop: 10 }}>
          Submit
        </button>
      </form>

      {msg && <p style={{ color: "red", marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
