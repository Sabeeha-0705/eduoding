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

  // Optional: load courses from backend; fallback to static set
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCourses();
        const data = res?.data || [];
        if (data.length) {
          // normalize: each course should have id/_id and title/name
          setCourses(data);
          setCourseId(data[0].id ?? data[0]._id ?? "");
        } else {
          throw new Error("No courses returned");
        }
      } catch (err) {
        // Fallback to static list if API not available
        const staticCourses = [
          { id: "1", title: "Full Stack Web Development (MERN)" },
          { id: "2", title: "Data Science & AI" },
          { id: "3", title: "Cloud & DevOps" },
          { id: "4", title: "Cybersecurity & Ethical Hacking" },
          { id: "5", title: "UI/UX Design" },
        ];
        setCourses(staticCourses);
        setCourseId("1");
      }
    };
    load();
  }, []);

  const handleFile = (e) => {
    setFile(e.target.files?.[0] || null);
    setMsg("");
  };

  // helper: basic youtube url validation (not exhaustive)
  const isYoutube = (url) => {
    if (!url) return false;
    return /youtube\.com|youtu\.be/.test(url);
  };

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

        // uploadVideoFile should accept (formData, onProgress?)
        const res = await uploadVideoFile(fd, setProgress);
        setMsg(res.data?.message || "Uploaded");
        // small delay to let user see message, then navigate
        setTimeout(() => navigate("/uploader/dashboard"), 700);
      } else {
        if (!youtubeUrl) return setMsg("Paste YouTube URL");
        if (!isYoutube(youtubeUrl)) return setMsg("Please paste a valid YouTube URL.");
        const payload = { youtubeUrl, title, description: desc, courseId };
        const res = await addYoutubeVideo(payload);
        setMsg(res.data?.message || "Saved");
        setTimeout(() => navigate("/uploader/dashboard"), 700);
      }
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || "Upload failed");
      console.error("UploadVideo.handleSubmit error:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload / Add Video</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            checked={mode === "upload"}
            onChange={() => {
              setMode("upload");
              setMsg("");
            }}
          />{" "}
          Upload file
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "youtube"}
            onChange={() => {
              setMode("youtube");
              setMsg("");
            }}
          />{" "}
          YouTube URL
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 12, maxWidth: 700 }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Course</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            required
          >
            <option value="">-- Select course --</option>
            {courses.map((c) => (
              <option key={c.id ?? c._id} value={c.id ?? c._id}>
                {c.title || c.name || `Course ${c.id ?? c._id}`}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description"
            style={{ width: "100%" }}
          />
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
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              style={{ width: "100%" }}
              required
            />
            <small style={{ color: "#666" }}>
              Paste full YouTube link (watch?v= or youtu.be). We'll keep it and admin will approve.
            </small>
          </div>
        )}

        <button type="submit" style={{ marginTop: 10 }}>
          Submit
        </button>
      </form>

      {msg && <p style={{ color: "crimson", marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
