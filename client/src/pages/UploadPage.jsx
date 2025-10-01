// client/src/pages/UploadPage.jsx
import { useState, useEffect } from "react";
import { uploadVideoFile, addYoutubeVideo, getCourses } from "../api/videos";
import "./UploadPage.css";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mode, setMode] = useState("file");
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCourses();
        setCourses(res.data || []);
        if ((res.data || []).length) setCourseId((res.data || [])[0].id || (res.data || [])[0]._id);
      } catch (e) {
        setCourses([
          { id: "1", title: "Full Stack Web Development (MERN)" },
          { id: "2", title: "Data Science & AI" },
        ]);
        setCourseId("1");
      }
    };
    load();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setStatus("");
    setProgress(0);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setStatus("");
    if (!courseId) return setStatus("Please select a course.");
    if (mode === "file") {
      if (!file) return setStatus("Please choose a video file first.");
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", title || file.name);
      formData.append("courseId", courseId);
      try {
        setProgress(0);
        await uploadVideoFile(formData, setProgress);
        setStatus("Upload successful ✅");
        setFile(null); setTitle("");
      } catch (err) {
        setStatus(err?.response?.data?.message || "Upload failed ❌");
      }
    } else {
      if (!youtubeUrl) return setStatus("Please enter a YouTube URL");
      try {
        await addYoutubeVideo({ youtubeUrl, title, courseId });
        setStatus("YouTube saved ✅");
        setYoutubeUrl("");
        setTitle("");
      } catch (err) {
        setStatus(err?.response?.data?.message || "Failed to save YouTube video");
      }
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Upload a New Video</h2>

        <div className="mode-switch">
          <button className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}>File Upload</button>
          <button className={mode === "youtube" ? "active" : ""} onClick={() => setMode("youtube")}>Add YouTube</button>
        </div>

        <form onSubmit={handleUpload}>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            <option value="">-- Select course --</option>
            {courses.map(c => <option key={c.id ?? c._id} value={c.id ?? c._id}>{c.title}</option>)}
          </select>

          <input type="text" placeholder="Video title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />

          {mode === "file" ? (
            <>
              <input type="file" accept="video/*" onChange={handleFileChange} />
              <div className="progress-bar"><div className="progress" style={{ width: `${progress}%` }} /></div>
            </>
          ) : (
            <input type="url" placeholder="YouTube URL (https://...)" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} required />
          )}

          <button type="submit" className="upload-btn">{mode === "file" ? "Upload" : "Save YouTube"}</button>
        </form>

        {status && <p className={`status ${status.toLowerCase().includes("fail") ? "error" : "ok"}`}>{status}</p>}
      </div>
    </div>
  );
}
