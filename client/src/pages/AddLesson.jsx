// src/pages/AddLesson.jsx
import { useState } from "react";
import { api } from "../api";
import "./Auth.css"; // reuse same style for neat form look

export default function AddLesson() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("type", type);

      if (type === "youtube") {
        formData.append("videoUrl", videoUrl);
      } else {
        formData.append("video", file); // 👈 multer upload
      }

      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

      const res = await api.post("/lessons", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setMsg(res.data.message);
      setTitle("");
      setVideoUrl("");
      setFile(null);
    } catch (err) {
      setMsg(err.response?.data?.message || "Error uploading lesson");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Add New Lesson</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Lesson Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="youtube">YouTube Link</option>
            <option value="upload">Upload Video</option>
          </select>

          {type === "youtube" ? (
            <input
              type="text"
              placeholder="YouTube Video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
            />
          ) : (
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          )}

          <button type="submit" className="btn-primary">
            Add Lesson
          </button>
        </form>
        <p className="msg">{msg}</p>
      </div>
    </div>
  );
}
