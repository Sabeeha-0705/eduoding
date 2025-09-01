// src/pages/CoursePage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./CoursePage.css";

export default function CoursePage() {
  const { id } = useParams(); // courseId from URL
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [course, setCourse] = useState(null);

  // 🔹 Fetch lessons + set course info
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const res = await api.get("/lessons");
        setLessons(res.data);

        // 👇 Static course info (you can later move this to DB)
        const fakeCourses = [
          {
            id: 1,
            title: "Full Stack Web Development (MERN)",
            desc: "Learn MongoDB, Express, React, Node.js with real projects.",
          },
          {
            id: 2,
            title: "Data Science & AI",
            desc: "Master Python, Machine Learning, and AI applications.",
          },
          {
            id: 3,
            title: "Cloud & DevOps",
            desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines.",
          },
          {
            id: 4,
            title: "Cybersecurity & Ethical Hacking",
            desc: "Protect systems, learn penetration testing & network security.",
          },
          {
            id: 5,
            title: "UI/UX Design",
            desc: "Design modern apps using Figma, wireframes & prototypes.",
          },
        ];

        const selected = fakeCourses.find((c) => c.id.toString() === id);
        setCourse(selected || null);
      } catch (err) {
        console.error("Error fetching lessons:", err);
      }
    };
    fetchLessons();
  }, [id]);

  if (!course) return <h2>Course not found!</h2>;

  return (
    <div className="course-page">
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      <h1>{course.title}</h1>
      <p>{course.desc}</p>

      <div className="lessons">
        <h3>Lessons</h3>

        {lessons.length === 0 ? (
          <p>No lessons available yet.</p>
        ) : (
          <ul>
            {lessons.map((lesson) => (
              <li key={lesson._id}>
                <span>🎬 {lesson.title}</span>

                {lesson.type === "youtube" ? (
                  <iframe
                    width="100%"
                    height="250"
                    src={lesson.videoUrl.replace("watch?v=", "embed/")}
                    title={lesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video width="100%" height="250" controls>
                    <source
                      src={`http://localhost:5000${lesson.videoUrl}`}
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
