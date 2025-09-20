// src/pages/UploadPage.jsx
import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "./UploadPage.css";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setMsg("⚠️ Please select a video file.");

    const form = new FormData();
    form.append("video", file);
    if (title) form.append("title", title);

    try {
      const res = await api.post("/videos/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg("✅ Upload successful!");
      console.log("Upload response:", res.data);
      // Redirect to uploader dashboard
      setTimeout(() => navigate("/uploader/dashboard"), 1200);
    } catch (err) {
      setMsg(err.response?.data?.message || "❌ Upload failed");
    }
  };

  return (
    <div className="upload-page">
      <h2>📤 Upload a New Video</h2>
      <form onSubmit={handleSubmit} className="upload-form">
        <input
          type="text"
          placeholder="Video title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit">Upload</button>
      </form>
      {msg && <p className="upload-msg">{msg}</p>}
    </div>
  );
}
