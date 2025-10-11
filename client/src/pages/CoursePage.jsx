// client/src/pages/CoursePage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api";
import "./CoursePage.css";

export default function CoursePage() {
  const { id } = useParams(); // courseId from URL (string like "1")
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(0);

  // Use env so it works in dev & Render
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

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
        // fetch videos from backend route
        const res = await API.get(`/courses/${id}/videos`);
        const serverVideos = Array.isArray(res.data) ? res.data : [];

        const normalized = serverVideos.map((v) => ({
          _id: v._id || v.id,
          title: v.title || v.name || v.videoTitle || "Untitled",
          youtubeUrl: v.youtubeUrl || v.videoUrl || (v.url && (v.url.includes("youtube") ? v.url : undefined)),
          fileUrl: v.fileUrl || v.videoUrl || (v.url && !v.url.includes("youtube") ? v.url : undefined),
          sourceType: v.sourceType || (v.youtubeUrl ? "youtube" : "upload"),
          raw: v,
        }));

        setLessons(normalized);

        // course details (local fallback list)
        const selected = allCourses.find((c) => c.id === id);
        setCourse(selected || { id, title: `Course ${id}`, desc: "" });

        // progress for this course
        const progRes = await API.get("/progress");
        const userProgressList = Array.isArray(progRes.data) ? progRes.data : [];
        const userProgress = userProgressList.find((p) =>
          String(p.courseId) === String(id) ||
          String(p.courseId || "").endsWith(String(id))
        );
        setProgress(Number(userProgress?.completedPercent || 0));
      } catch (err) {
        console.error("Error fetching data:", err);
        setLessons([]);
        const selected = allCourses.find((c) => c.id === id);
        setCourse(selected || { id, title: `Course ${id}`, desc: "" });
      }
    };
    fetchData();
  }, [id]);

  // kept for future (if you want an editable slider again)
  const handleProgressChange = async (e) => {
    const newValue = Number(e.target.value);
    // NOTE: Not used now because slider is disabled/readOnly.
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

      {/* Progress Control (read-only) */}
      <div className="progress-control">
        <label>Progress: {progress}%</label>

        {/* Make slider disabled/readOnly so user cannot drag it manually.
            It still updates from server via setProgress(...) above. */}
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          readOnly
          disabled
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        />
      </div>

      <div className="lessons">
        <h3>Lessons</h3>
        {lessons.length === 0 ? (
          <p>No lessons available yet.</p>
        ) : (
          <ul>
            {lessons.map((lesson, idx) => (
              <li key={lesson._id}>
                <div className="lesson-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>🎬 {idx + 1}. {lesson.title}</span>

                  {/* Open dedicated player page */}
                  <Link className="open-btn" to={`/course/${id}/lesson/${lesson._id}`}>
                    Open Lesson ▶
                  </Link>
                </div>

                {/* Optional mini preview (youtube embed or video file) */}
                <div className="lesson-preview" style={{ marginTop: 8 }}>
                  {lesson.sourceType === "youtube" || (lesson.youtubeUrl && lesson.youtubeUrl.includes("youtube")) ? (
                    <iframe
                      width="100%"
                      height="250"
                      src={toEmbed(lesson.youtubeUrl || lesson.fileUrl)}
                      title={lesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video width="100%" height="250" controls>
                      <source
                        src={
                          lesson.fileUrl && lesson.fileUrl.startsWith("/uploads/")
                            ? `${API_BASE}${lesson.fileUrl}`
                            : lesson.fileUrl || lesson.youtubeUrl || ""
                        }
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
