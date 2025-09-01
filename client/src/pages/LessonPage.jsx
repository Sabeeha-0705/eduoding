// src/pages/LessonPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./LessonPage.css";

const lessonsData = {
  1: [
    { id: 1, title: "Intro to MERN", video: "https://www.youtube.com/embed/F9gB5b4jgOI" },
    { id: 2, title: "MongoDB Basics", video: "https://www.youtube.com/embed/ofme2o29ngU" },
    { id: 3, title: "Express API", video: "https://www.youtube.com/embed/L72fhGm1tfE" },
    { id: 4, title: "React UI", video: "https://www.youtube.com/embed/bMknfKXIFA8" },
    { id: 5, title: "Full Project", video: "https://www.youtube.com/embed/-0exw-9YJBo" },
  ],
  2: [
    { id: 1, title: "Python Basics", video: "https://www.youtube.com/embed/yGN28LY5VuA" },
    { id: 2, title: "Data Cleaning with Pandas", video: "https://www.youtube.com/embed/yGN28LY5VuA" },
    { id: 3, title: "Machine Learning Models", video: "https://www.youtube.com/embed/yGN28LY5VuA" },
    { id: 4, title: "Deep Learning Intro", video: "https://www.youtube.com/embed/yGN28LY5VuA" },
    { id: 5, title: "AI Projects Overview", video: "https://www.youtube.com/embed/yGN28LY5VuA" },
  ],
  3: [
    { id: 1, title: "Intro to Cloud & DevOps", video: "https://www.youtube.com/embed/OSbUA5Q9Cec" },
    { id: 2, title: "AWS Basics", video: "https://www.youtube.com/embed/OSbUA5Q9Cec" },
    { id: 3, title: "Docker Essentials", video: "https://www.youtube.com/embed/OSbUA5Q9Cec" },
    { id: 4, title: "Kubernetes Intro", video: "https://www.youtube.com/embed/OSbUA5Q9Cec" },
    { id: 5, title: "CI/CD Workflow", video: "https://www.youtube.com/embed/OSbUA5Q9Cec" },
  ],
  4: [
    { id: 1, title: "Cybersecurity Basics", video: "https://www.youtube.com/embed/CvCiNeLnZ00" },
    { id: 2, title: "Networking Fundamentals", video: "https://www.youtube.com/embed/CvCiNeLnZ00" },
    { id: 3, title: "Hacking Tools Overview", video: "https://www.youtube.com/embed/CvCiNeLnZ00" },
    { id: 4, title: "Pentesting Techniques", video: "https://www.youtube.com/embed/CvCiNeLnZ00" },
    { id: 5, title: "Capstone Project", video: "https://www.youtube.com/embed/CvCiNeLnZ00" },
  ],
  5: [
    { id: 1, title: "Design Principles", video: "https://www.youtube.com/embed/7CqJlxBYj-M" },
    { id: 2, title: "Wireframes & Mockups", video: "https://www.youtube.com/embed/7CqJlxBYj-M" },
    { id: 3, title: "Prototyping in Figma", video: "https://www.youtube.com/embed/7CqJlxBYj-M" },
    { id: 4, title: "UI Design Tips", video: "https://www.youtube.com/embed/7CqJlxBYj-M" },
    { id: 5, title: "Final Portfolio Project", video: "https://www.youtube.com/embed/7CqJlxBYj-M" },
  ],
};

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const lessons = lessonsData[courseId] || [];
  const lesson = lessons.find((l) => l.id.toString() === lessonId);

  // ✅ Notes state
  const [note, setNote] = useState("");

  // Load saved note from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`note-${courseId}-${lessonId}`);
    if (saved) setNote(saved);
  }, [courseId, lessonId]);

  // Save note
  const saveNote = () => {
    localStorage.setItem(`note-${courseId}-${lessonId}`, note);
    alert("✅ Note saved!");
  };

  if (!lesson) return <h2>Lesson not found!</h2>;

  return (
    <div className="lesson-page">
      <button className="back-btn" onClick={() => navigate(`/course/${courseId}`)}>
        ⬅ Back to Course
      </button>

      <h1>{lesson.title}</h1>

      {/* Video */}
      <div className="video-container">
        <iframe
          src={lesson.video}
          title={lesson.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      {/* Notes Section */}
      <div className="notes-section">
        <h3>Your Notes</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write your notes here..."
        ></textarea>
        <button onClick={saveNote} className="save-note-btn">Save Note</button>
      </div>
    </div>
  );
}
