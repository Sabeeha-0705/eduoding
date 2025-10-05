import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("courses");
  const [notes, setNotes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

        // 🔹 PROFILE
        const profileRes = await API.get("/users/me").catch(() =>
          API.get("/auth/profile")
        );
        const profileData = profileRes.data?.user || profileRes.data;
        setUser(profileData);

        // 🔹 NOTES
        try {
          const notesRes = await API.get("/notes");
          setNotes(notesRes.data || []);
        } catch {
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

        // 🔹 PROGRESS
        const progRes = await API.get("/progress");
        setProgressData(progRes.data || []);
      } catch (err) {
        console.error("Profile fetch failed", err);
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
        navigate("/auth", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    // responsive sidebar
    const onResize = () => {
      setSidebarOpen(window.innerWidth >= 900);
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

  if (loading)
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <p>Loading...</p>
        </main>
      </div>
    );

  return (
    <div className="dashboard-container">
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
          <button className="tiny-btn" onClick={() => navigate("/settings")}>
            ⚙
          </button>
        </div>
      </header>

      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="logo">Eduoding</div>

        <nav>
          <ul>
            {["courses", "notes", "progress"].map((tab) => (
              <li
                key={tab}
                className={`sidebar-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab);
                  if (window.innerWidth < 900) setSidebarOpen(false);
                }}
              >
                {tab === "courses" && "📘 "}
                {tab === "notes" && "📝 "}
                {tab === "progress" && "📊 "}
                <span className="item-text">{tab}</span>
              </li>
            ))}
          </ul>
        </nav>

        {user?.role === "uploader" && (
          <div className="sidebar-quick">
            <button onClick={() => navigate("/uploader/upload")}>
              ➕ Upload Video
            </button>
            <button onClick={() => navigate("/uploader/dashboard")}>
              📁 My Uploads
            </button>
          </div>
        )}

        {user?.role === "admin" && (
          <button onClick={() => navigate("/admin/requests")} className="btn-admin">
            Admin Panel
          </button>
        )}

        <div style={{ marginTop: "auto" }}>
          <div className="role-badge">
            Role: <strong>{user?.role || "user"}</strong>
          </div>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {user ? (
          <div className="page-inner">
            <h2>Welcome, {user?.username || user?.email}</h2>

            {activeTab === "courses" && (
              <>
                <p>Select a course and start learning 🚀</p>
                <div className="courses-grid">
                  {courses.map((course) => {
                    const progress = getProgressForCourse(course.id);
                    return (
                      <div key={course.id} className="course-card">
                        <h3>{course.title}</h3>
                        <p>{course.desc}</p>
                        <div className="progress-bar">
                          <div className="progress" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="progress-text">{progress}% Completed</p>
                        <button
                          className="join-btn"
                          onClick={() => navigate(`/course/${course.id}`)}
                        >
                          {progress === 100 ? "Review Course" : "Continue"}
                        </button>
                      </div>
                    );
                  })}
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
                        <small>
                          {note.createdAt
                            ? new Date(note.createdAt).toLocaleString()
                            : note._id}
                        </small>
                        <button
                          className="small-btn"
                          onClick={() => handleDeleteNote(note._id)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-card">
                    <p>No notes yet — take notes while watching lessons.</p>
                    <button onClick={() => setActiveTab("courses")}>
                      Go to Courses
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === "progress" && (
              <div>
                <h3>📊 Progress</h3>
                {progressData.length === 0 ? (
                  <div className="empty-card">
                    <p>No progress tracked yet.</p>
                    <button onClick={() => setActiveTab("courses")}>
                      Browse Courses
                    </button>
                  </div>
                ) : (
                  <ul>
                    {progressData.map((p) => (
                      <li key={p._id}>
                        Course: {String(p.courseId)} —{" "}
                        {Math.round(p.completedPercent)}% completed
                      </li>
                    ))}
                  </ul>
                )}
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
