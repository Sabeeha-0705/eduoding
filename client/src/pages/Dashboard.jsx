// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("courses");
  const [notes, setNotes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          navigate("/", { replace: true });
          return;
        }

        const profileRes = await api.get("/auth/profile");
        setUser(profileRes.data.user);

        try {
          const notesRes = await api.get("/notes");
          setNotes(notesRes.data || []);
        } catch (err) {
          console.warn("Notes fetch failed, falling back to localStorage:", err.message);
          const localNotes = [];
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("note-")) {
              localNotes.push({ _id: k, content: localStorage.getItem(k) });
            }
          });
          setNotes(localNotes);
        }

        try {
          const progRes = await api.get("/progress");
          setProgressData(progRes.data || []);
        } catch (err) {
          console.warn("Progress fetch failed:", err.message);
          setProgressData([]);
        }
      } catch (err) {
        console.error("Profile fetch failed", err);
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    navigate("/", { replace: true });
  };

  const handleDeleteNote = async (noteId) => {
    try {
      if (noteId.startsWith("note-") && localStorage.getItem(noteId)) {
        localStorage.removeItem(noteId);
        setNotes((n) => n.filter((x) => x._id !== noteId));
        return;
      }

      await api.delete(`/notes/${noteId}`);
      setNotes((n) => n.filter((x) => x._id !== noteId));
    } catch (err) {
      console.error("Delete note failed:", err.message || err);
      alert("Failed to delete note");
    }
  };

  const getProgressForCourse = (courseId) => {
    const p = progressData.find((x) => x.courseId === String(courseId));
    return p ? p.completedPercent : 0;
  };

  const courses = [
    { id: "1", title: "Full Stack Web Development (MERN)", desc: "Learn MongoDB, Express, React, Node.js with real projects." },
    { id: "2", title: "Data Science & AI", desc: "Master Python, Machine Learning, and AI applications." },
    { id: "3", title: "Cloud & DevOps", desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines." },
    { id: "4", title: "Cybersecurity & Ethical Hacking", desc: "Protect systems, learn penetration testing & network security." },
    { id: "5", title: "UI/UX Design", desc: "Design modern apps using Figma, wireframes & prototypes." },
  ];

  if (loading) return <div className="dashboard-container"><main className="main-content"><p>Loading...</p></main></div>;

  // role check helper
  const isUploader = user && (user.role === "uploader" || user.role === "admin");

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo">Eduoding</div>
        <nav>
          <ul>
            <li className={activeTab === "courses" ? "active" : ""} onClick={() => setActiveTab("courses")}>📘 Courses</li>
            <li className={activeTab === "notes" ? "active" : ""} onClick={() => setActiveTab("notes")}>📝 Notes</li>
            <li className={activeTab === "progress" ? "active" : ""} onClick={() => setActiveTab("progress")}>📊 Progress</li>
            <li className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}>⚙ Settings</li>

            {/* NEW: uploader links visible only if user is uploader/admin */}
            {isUploader ? (
              <>
                <li onClick={() => navigate("/uploader/upload")}>⬆️ Upload Video</li>
                <li onClick={() => navigate("/uploader/dashboard")}>📁 Uploader Dashboard</li>
              </>
            ) : (
              // show request link (optional) if user wants uploader role
              <li onClick={() => navigate("/request-uploader")}>✉ Request uploader role</li>
            )}
          </ul>
        </nav>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </aside>

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
                          style={{ width: `${getProgressForCourse(course.id)}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">{getProgressForCourse(course.id)}% Completed</p>

                      <button className="join-btn" onClick={() => navigate(`/course/${course.id}`)}>Join Course</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "notes" && (
              <>
                <h3>📝 Your Notes</h3>
                {notes.length > 0 ? (
                  <ul className="notes-list">
                    {notes.map((note) => (
                      <li key={note._id}>
                        <p>{note.content || note.text}</p>
                        <small style={{ color: "#666" }}>{note._id}</small>
                        <div>
                          <button className="small-btn" onClick={() => handleDeleteNote(note._id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No notes saved yet.</p>
                )}
              </>
            )}

            {activeTab === "progress" && (
              <div>
                <h3>📊 Progress</h3>
                <p>Progress tracking coming soon — but here's live data:</p>
                <ul>
                  {progressData.length === 0 ? <li>No progress data</li> :
                    progressData.map((p) => (
                      <li key={p._id}>
                        Course: {p.courseId} — {p.completedPercent}% completed
                      </li>
                    ))
                  }
                </ul>
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h3>⚙ Settings</h3>
                <p>Change password, update profile, notification prefs — coming soon.</p>
              </div>
            )}
          </div>
        ) : (
          <p>Loading user...</p>
        )}
      </main>
    </div>
  );
}
