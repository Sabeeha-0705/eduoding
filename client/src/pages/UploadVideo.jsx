// src/pages/UploadVideo.jsx
import { useState } from "react";
import { uploadVideoFile, addYoutubeVideo } from "../api/videos";
import { useNavigate } from "react-router-dom";

export default function UploadVideo() {
  const [mode, setMode] = useState("upload"); // upload | youtube
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleFile = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "upload") {
        if (!file) return setMsg("Choose a video file first.");
        const fd = new FormData();
        fd.append("video", file);
        fd.append("title", title);
        fd.append("description", desc);

        const res = await uploadVideoFile(fd, setProgress);
        setMsg(res.data.message || "Uploaded");
        navigate("/uploader/dashboard");
      } else {
        if (!youtubeUrl) return setMsg("Paste YouTube URL");
        const res = await addYoutubeVideo({ youtubeUrl, title, description: desc });
        setMsg(res.data.message || "Saved");
        navigate("/uploader/dashboard");
      }
    } catch (err) {
      setMsg(err.response?.data?.message || err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload / Add Video</h2>

      <div>
        <label>
          <input type="radio" checked={mode === "upload"} onChange={() => setMode("upload")} />
          Upload file
        </label>
        <label style={{ marginLeft: 12 }}>
          <input type="radio" checked={mode === "youtube"} onChange={() => setMode("youtube")} />
          YouTube URL
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <br />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />

        {mode === "upload" ? (
          <>
            <input type="file" accept="video/*" onChange={handleFile} />
            <div style={{ width: "100%", background: "#eee", height: 8, marginTop: 8 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#5b6bff" }} />
            </div>
            <p>{progress}%</p>
          </>
        ) : (
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
        )}

        <button type="submit" style={{ marginTop: 10 }}>
          Submit
        </button>
      </form>

      <p style={{ color: "red" }}>{msg}</p>
    </div>
  );
}
