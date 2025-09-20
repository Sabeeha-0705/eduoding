// src/components/VideoCard.jsx
import React from "react";

export default function VideoCard({ video }) {
  const thumb = video.thumbnailUrl
    ? video.thumbnailUrl.startsWith("/uploads")
      ? video.thumbnailUrl
      : video.thumbnailUrl
    : video.sourceType === "youtube" && video.youtubeUrl
    ? `https://img.youtube.com/vi/${getYouTubeID(video.youtubeUrl)}/hqdefault.jpg`
    : "/logo.png";

  function getYouTubeID(url) {
    try {
      const u = new URL(url);
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      // short url
      const p = u.pathname.split("/");
      return p[p.length - 1];
    } catch {
      return "";
    }
  }

  return (
    <div style={{ border: "1px solid #eee", padding: 12, display: "flex", gap: 12 }}>
      <img src={thumb} alt={video.title} style={{ width: 160, height: 90, objectFit: "cover" }} />
      <div>
        <h4>{video.title}</h4>
        <p style={{ margin: 0 }}>{video.description}</p>
        <small>Status: {video.status}</small>
      </div>
    </div>
  );
}
