// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api"; // use default API instance (consistent with other files)
import "./Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("courses");
  const [notes, setNotes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true); // responsive sidebar toggle
  const navigate = useNavigate();

  const getToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          navigate("/auth", { replace: true });
          return;
        }

        // PROFILE: try /users/me (server route used earlier)
        let profileRes;
        try {
          profileRes = await API.get("/users/me");
        } catch (err) {
          // fallback: maybe server exposes /auth/profile
          try {
            profileRes = await API.get("/auth/profile");
          } catch (err2) {
            throw err2 || err;
          }
        }

        // server might return { user } or user object directly
        const profileData = profileRes.data?.user || profileRes.data;
        setUser(profileData);

        // NOTES: try API, fallback to localStorage notes
        try {
          const notesRes = await API.get("/notes");
          setNotes(notesRes.data || []);
        } catch (err) {
          // fallback to localStorage notes if offline or endpoint missing
          const localNotes = [];
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("note-")) {
              localNotes.push({
                _id: k,
                content: localStorage.getItem(k),
                createdAt: null,
              });
            }
          });
          setNotes(localNotes);
        }

        // PROGRESS: fetch progress entries for this user
        try {
          const progRes = await API.get("/progress");
          setProgressData(progRes.data || []);
        } catch (err) {
          setProgressData([]);
        }
      } catch (err) {
        console.error("Profile fetch failed", err);
        // if unauthorized or server error, send to login
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
        navigate("/auth", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    // close sidebar on small screen resize
    const onResize = () => {
      if (window.innerWidth < 900) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    navigate("/auth", { replace: true });
  };

  const handleDeleteNote = async (noteId) => {
    try {
      if (noteId.startsWith("note-") && localStorage.getItem(noteId)) {
        localStorage.removeItem(noteId);
        setNotes((n) => n.filter((x) => x._id !== noteId));
        return;
      }
      await API.delete(`/notes/${noteId}`);
      setNotes((n) => n.filter((x) => x._id !== noteId));
    } catch (err) {
      console.error("Delete note failed:", err.message || err);
      alert("Failed to delete note");
    }
  };

  const getProgressForCourse = (courseId) => {
    const p = progressData.find((x) => String(x.courseId) === String(courseId));
    return p ? Math.round(p.completedPercent) : 0;
  };

  const courses = [
    {
      id: "1",
      title: "Full Stack Web Development (MERN)",
      desc: "Learn MongoDB, Express, React, Node.js with real projects.",
    },
    { id: "2", title: "Data Science & AI", desc: "Master Python, Machine Learning, and AI applications." },
    { id: "3", title: "Cloud & DevOps", desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines." },
    { id: "4", title: "Cybersecurity & Ethical Hacking", desc: "Protect systems, learn penetration testing & network security." },
    { id: "5", title: "UI/UX Design", desc: "Design modern apps using Figma, wireframes & prototypes." },
  ];

  if (loading) return <div className="dashboard-container"><main className="main-content"><p>Loading...</p></main></div>;

  return (
    <div className="dashboard-container">
      {/* mobile header */}
      <header className="mobile-header">
        <button
          aria-label="Toggle navigation"
          className="hamburger"
          onClick={() => setSidebarOpen((s) => !s)}
        >
          ☰
        </button>
        <div className="mobile-title">Eduoding</div>
        <div className="mobile-actions">
          <button className="tiny-btn" onClick={() => navigate("/settings")}>⚙</button>
        </div>
      </header>

      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`} aria-hidden={!sidebarOpen}>
        <div className="logo">Eduoding</div>

        <nav>
          <ul>
            <li
              className={`sidebar-item ${activeTab === "courses" ? "active" : ""}`}
              onClick={() => { setActiveTab("courses"); if (window.innerWidth < 900) setSidebarOpen(false); }}
              role="button"
              tabIndex={0}
            >
              <span className="item-icon">📘</span>
              <span className="item-text">Courses</span>
            </li>

            <li
              className={`sidebar-item ${activeTab === "notes" ? "active" : ""}`}
              onClick={() => { setActiveTab("notes"); if (window.innerWidth < 900) setSidebarOpen(false); }}
              role="button"
              tabIndex={0}
            >
              <span className="item-icon">📝</span>
              <span className="item-text">Notes</span>
            </li>

            <li
              className={`sidebar-item ${activeTab === "progress" ? "active" : ""}`}
              onClick={() => { setActiveTab("progress"); if (window.innerWidth < 900) setSidebarOpen(false); }}
              role="button"
              tabIndex={0}
            >
              <span className="item-icon">📊</span>
              <span className="item-text">Progress</span>
            </li>

            <li
              className={`sidebar-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => { setActiveTab("settings"); setSidebarOpen(false); navigate("/settings"); }}
              role="button"
              tabIndex={0}
            >
              <span className="item-icon">⚙</span>
              <span className="item-text">Settings</span>
            </li>
          </ul>
        </nav>

        {/* Uploader quick links (visible only to uploader role) */}
        {user?.role === "uploader" && (
          <div className="sidebar-quick">
            <button className="uploader-btn" onClick={() => navigate("/uploader/upload")}>➕ Upload Video</button>
            <button className="uploader-btn outline" onClick={() => navigate("/uploader/dashboard")}>📁 My Uploads</button>
          </div>
        )}

        {/* Admin quick link (visible only to admin) */}
        {user?.role === "admin" && (
          <button onClick={() => navigate("/admin/requests")} className="btn-admin">Admin Panel</button>
        )}

        <div style={{ marginTop: "auto" }}>
          <div className="role-badge">Role: <strong>{user?.role || "user"}</strong></div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main-content" onClick={() => { if (window.innerWidth < 900 && sidebarOpen) setSidebarOpen(false); }}>
        {user ? (
          <div className="page-inner">
            <div className="header-row">
              <h2>Welcome, {user?.username || user?.email}</h2>
              <div className="small-meta"><span className="meta-role">{user?.role}</span></div>
            </div>

            {activeTab === "courses" && (
              <>
                <p>Select a course and start learning 🚀</p>
                <div className="courses-grid">
                  {courses.map((course) => (
                    <div key={course.id} className="course-card" aria-live="polite">
                      <h3>{course.title}</h3>
                      <p>{course.desc}</p>
                      <div className="progress-bar" aria-label={`Progress for ${course.title}`}>
                        <div
                          className="progress"
                          style={{ width: `${getProgressForCourse(course.id)}%` }}
                        />
                      </div>
                      <p className="progress-text">{getProgressForCourse(course.id)}% Completed</p>
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
                {notes.length > 0 ? (
                  <ul className="notes-list">
                    {notes.map((note) => (
                      <li key={note._id}>
                        <p>{note.content || note.text}</p>
                        <small style={{ color: "#666" }}>{note.createdAt ? new Date(note.createdAt).toLocaleString() : note._id}</small>
                        <div>
                          <button className="small-btn" onClick={() => handleDeleteNote(note._id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-card">
                    <p>No notes yet — take notes while watching lessons and they'll be saved here.</p>
                    <button className="join-btn" onClick={() => setActiveTab("courses")}>Go to Courses</button>
                  </div>
                )}
              </>
            )}

            {activeTab === "progress" && (
              <div>
                <h3>📊 Progress</h3>
                {progressData.length === 0 ? (
                  <div className="empty-card">
                    <p>No progress tracked yet. Join a course and complete lessons to see progress.</p>
                    <button className="join-btn" onClick={() => setActiveTab("courses")}>Browse Courses</button>
                  </div>
                ) : (
                  <ul>
                    {progressData.map((p) => (
                      <li key={p._id}>Course: {String(p.courseId)} — {Math.round(p.completedPercent)}% completed</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h3>⚙ Settings</h3>
                <p>Change password, update profile, notification prefs — coming soon.</p>
              </div>
            )}
          </div>
        ) : (<p>Loading user...</p>)}
      </main>
    </div>
  );
}
