import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api";
import "./CoursePage.css";

export default function CoursePage() {
  const { id } = useParams(); // courseId from URL (string like "1")
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]); // renamed from lessons -> videos
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(0);

  const allCourses = [
    { id: "1", title: "Full Stack Web Development (MERN)", desc: "Learn MongoDB, Express, React, Node.js with real projects." },
    { id: "2", title: "Data Science & AI", desc: "Master Python, Machine Learning, and AI applications." },
    { id: "3", title: "Cloud & DevOps", desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines." },
    { id: "4", title: "Cybersecurity & Ethical Hacking", desc: "Protect systems, learn penetration testing & network security." },
    { id: "5", title: "UI/UX Design", desc: "Design modern apps using Figma, wireframes & prototypes." },
  ];

  // convert any YouTube link to /embed/
  const toEmbed = (url) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ---- NEW: fetch approved videos for this course
        // backend route: GET /api/courses/:id/videos
        const res = await API.get(`/courses/${id}/videos`);
        setVideos(res.data || []);

        // course details (static for now)
        const selected = allCourses.find((c) => c.id === id);
        setCourse(selected || null);

        // progress for this course
        const progRes = await API.get("/progress");
        const userProgress = progRes.data.find((p) => p.courseId === id);
        setProgress(Number(userProgress?.completedPercent || 0));
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [id]);

  const handleProgressChange = async (e) => {
    const newValue = Number(e.target.value);
    setProgress(newValue);
    try {
      await API.post("/progress", { courseId: id, completedPercent: newValue });
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };

  if (!course) return <h2>Course not found!</h2>;

  return (
    <div className="course-page">
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      <h1>{course.title}</h1>
      <p>{course.desc}</p>

      {/* Progress Control */}
      <div className="progress-control">
        <label>Progress: {progress}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleProgressChange}
        />
      </div>

      <div className="lessons">
        <h3>Lessons</h3>
        {videos.length === 0 ? (
          <p>No lessons available yet.</p>
        ) : (
          <ul>
            {videos.map((v, idx) => (
              <li key={v._id}>
                <div className="lesson-row">
                  <span>🎬 {idx + 1}. {v.title}</span>

                  {/* Open dedicated player page — reuse lesson route pattern */}
                  <Link className="open-btn" to={`/course/${id}/lesson/${v._id}`}>
                    Open Lesson ▶
                  </Link>
                </div>

                <div className="lesson-preview">
                  {v.sourceType === "youtube" ? (
                    <iframe
                      width="100%"
                      height="250"
                      src={toEmbed(v.youtubeUrl || v.fileUrl || "")}
                      title={v.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video width="100%" height="250" controls>
                      <source
                        src={v.fileUrl && v.fileUrl.startsWith("http") ? v.fileUrl : `${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${v.fileUrl}`}
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
