import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api";
import "./CoursePage.css";

export default function CoursePage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [course, setCourse] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);

  const allCourses = [
    { id: "1", title: "Full Stack Web Development (MERN)", desc: "Learn MongoDB, Express, React, Node.js with real projects." },
    { id: "2", title: "Data Science & AI", desc: "Master Python, Machine Learning, and AI applications." },
    { id: "3", title: "Cloud & DevOps", desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines." },
    { id: "4", title: "Cybersecurity & Ethical Hacking", desc: "Protect systems, learn penetration testing & network security." },
    { id: "5", title: "UI/UX Design", desc: "Design modern apps using Figma, wireframes & prototypes." },
  ];

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
        const res = await API.get(`/courses/${courseId}/videos`);
        setVideos(res.data || []);

        const selected = allCourses.find((c) => c.id === courseId);
        setCourse(selected || null);

        const p = await API.get(`/progress/${courseId}`);
        setCompletedIds(p.data.completedLessonIds || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [courseId]);

  if (!course) return <h2>Course not found!</h2>;

  const percent = videos.length ? Math.round((completedIds.length / videos.length) * 100) : 0;

  return (
    <div className="course-page">
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      <h1>{course.title}</h1>
      <p>{course.desc}</p>

      <div className="progress-control">
        <label>Progress: {percent}%</label>
        <div className="progress-bar">
          <div style={{ width: `${percent}%` }} />
        </div>
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
                  <Link className="open-btn" to={`/course/${courseId}/lesson/${v._id}`}>
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
                        src={
                          v.fileUrl && v.fileUrl.startsWith("http")
                            ? v.fileUrl
                            : `${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${v.fileUrl}`
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
