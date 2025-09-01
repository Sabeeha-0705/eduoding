import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("courses"); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          window.location.href = "/";
          return;
        }

        const res = await api.get("/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
      } catch (err) {
        console.error("Profile fetch failed", err);
        window.location.href = "/";
      }
    };

    fetchProfile();
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");
    window.location.href = "/";
  };

  const courses = [
    { id: 1, title: "Full Stack Web Development (MERN)", desc: "Learn MongoDB, Express, React, Node.js with real projects.", progress: 60 },
    { id: 2, title: "Data Science & AI", desc: "Master Python, Machine Learning, and AI applications.", progress: 40 },
    { id: 3, title: "Cloud & DevOps", desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines.", progress: 20 },
    { id: 4, title: "Cybersecurity & Ethical Hacking", desc: "Protect systems, learn penetration testing & network security.", progress: 10 },
    { id: 5, title: "UI/UX Design", desc: "Design modern apps using Figma, wireframes & prototypes.", progress: 75 },
  ];

  // ✅ Fetch all notes from localStorage
  const getAllNotes = () => {
    const notes = [];
    for (let key in localStorage) {
      if (key.startsWith("note-")) {
        notes.push({ key, text: localStorage[key] });
      }
    }
    return notes;
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">Eduoding</div>
        <nav>
          <ul>
            <li onClick={() => setActiveTab("courses")}>📘 Courses</li>
            <li onClick={() => setActiveTab("notes")}>📝 Notes</li>
            <li onClick={() => setActiveTab("progress")}>📊 Progress</li>
            <li onClick={() => setActiveTab("settings")}>⚙ Settings</li>
          </ul>
        </nav>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {user ? (
          <div>
            <h2>Welcome, {user.username || user.email}</h2>

            {activeTab === "courses" && (
              <>
                <p>Select a course and start learning 🚀</p>
                <div className="courses-grid">
                  {courses.map((course) => (
                    <div key={course.id} className="course-card">
                      <h3>{course.title}</h3>
                      <p>{course.desc}</p>
                      <div className="progress-bar">
                        <div
                          className="progress"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">{course.progress}% Completed</p>

                      {/* 👇 Pass course.id when navigating */}
                      <button
                        className="join-btn"
                        onClick={() => navigate(`/course/${course.id}`)}
                      >
                        Join Course
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "notes" && (
              <>
                <h3>📝 Your Notes</h3>
                {getAllNotes().length > 0 ? (
                  <ul className="notes-list">
                    {getAllNotes().map((note, idx) => (
                      <li key={idx}>
                        <strong>{note.key}</strong>
                        <p>{note.text}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No notes saved yet.</p>
                )}
              </>
            )}

            {activeTab === "progress" && <p>📊 Progress tracking coming soon!</p>}
            {activeTab === "settings" && <p>⚙ Settings page coming soon!</p>}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </main>
    </div>
  );
}
