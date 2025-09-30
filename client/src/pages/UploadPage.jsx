//client/src/pages UploadPage.jsx
import { useState } from "react";
import { uploadVideoFile, addYoutubeVideo, getMyVideos } from "../api/videos";
import "./UploadPage.css";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(""); // success / error messages
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mode, setMode] = useState("file"); // "file" or "youtube"

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setStatus("");
    setProgress(0);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setStatus("");
    if (mode === "file") {
      if (!file) return setStatus("Please choose a video file first.");
      const formData = new FormData();
      formData.append("video", file);              // must match server multer field name
      formData.append("title", title || file.name);

      try {
        setProgress(0);
        const res = await uploadVideoFile(formData, setProgress);
        setStatus("Upload successful ✅");
        setFile(null);
        setTitle("");
      } catch (err) {
        setStatus(err.message || "Upload failed ❌");
      }
    } else {
      // youtube mode
      if (!youtubeUrl) return setStatus("Please enter a YouTube URL");
      try {
        const res = await addYoutubeVideo({ youtubeUrl, title });
        setStatus("YouTube saved ✅");
        setYoutubeUrl("");
        setTitle("");
      } catch (err) {
        setStatus(err.message || "Failed to save YouTube video");
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
          <input
            type="text"
            placeholder="Video title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {mode === "file" ? (
            <>
              <input type="file" accept="video/*" onChange={handleFileChange} />
              <div className="progress-bar">
                <div className="progress" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <input
              type="url"
              placeholder="YouTube URL (https://youtube.com/...)"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              required
            />
          )}

          <button type="submit" className="upload-btn">
            {mode === "file" ? "Upload" : "Save YouTube"}
          </button>
        </form>

        {status && <p className={`status ${status.toLowerCase().includes("fail") ? "error" : "ok"}`}>{status}</p>}
      </div>
    </div>
  );
}
