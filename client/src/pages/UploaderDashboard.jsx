// src/pages/UploaderDashboard.jsx
import { useEffect, useState } from "react";
import { getMyVideos } from "../api/videos";
import VideoCard from "../components/VideoCard";
import { Link } from "react-router-dom";

export default function UploaderDashboard() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getMyVideos();
        setVideos(res.data);
      } catch (e) {
        setErr(e.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Uploader Dashboard</h2>
      <p>
        <Link to="/uploader/upload">Upload new video</Link>
      </p>

      {loading ? (
        <p>Loading...</p>
      ) : err ? (
        <p style={{ color: "red" }}>{err}</p>
      ) : videos.length === 0 ? (
        <p>No uploads yet</p>
      ) : (
        videos.map((v) => <VideoCard key={v._id} video={v} />)
      )}
    </div>
  );
}
