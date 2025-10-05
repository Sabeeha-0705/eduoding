// client/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("courses");
  const [notes, setNotes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const getToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // Normalize progress list into a lookup map.
  // Also create fallback keys: trailing digits, last path segment, and original key.
  const normalizeProgressList = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const map = {};
    arr.forEach((p) => {
      const rawKey = String(p.courseId ?? p.course_id ?? "");
      const percent = Number(p.completedPercent ?? p.completed_percent ?? 0) || 0;

      // store under original key
      map[rawKey] = { ...p, completedPercent: percent };

      // if ends with digits (like courseId_1 or /1), store numeric fallback
      const digitsMatch = rawKey.match(/(\d+)$/);
      if (digitsMatch) {
        const digits = digitsMatch[1];
        map[digits] = { ...p, completedPercent: percent };
      }

      // if contains slash or colon, store last segment fallback
      if (rawKey.includes("/") || rawKey.includes(":") || rawKey.includes("-")) {
        const parts = rawKey.split(/[\/:-]+/).filter(Boolean);
        if (parts.length) {
          const last = parts[parts.length - 1];
          if (last) map[last] = { ...p, completedPercent: percent };
        }
      }

      // also store lowercase/trimmed versions to be safe
      const lc = rawKey.toLowerCase().trim();
      if (lc !== rawKey) map[lc] = { ...p, completedPercent: percent };
    });
    return map;
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          navigate("/auth", { replace: true });
          return;
        }

        // PROFILE
        const profileRes = await API.get("/users/me").catch(() =>
          API.get("/auth/profile")
        );
        const profileData = profileRes.data?.user || profileRes.data;
        setUser(profileData);

        // NOTES (try server, fallback to localStorage)
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

        // PROGRESS (fetch list for user)
        try {
          const progRes = await API.get("/progress");
          const list = progRes.data || [];
          setProgressData(list);
          setProgressMap(normalizeProgressList(list));
        } catch (err) {
          console.warn("Progress fetch failed:", err);
          setProgressData([]);
          setProgressMap({});
        }
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

  // Improved getProgressForCourse: tries multiple matching strategies.
  const getProgressForCourse = (courseId) => {
    if (!progressMap || Object.keys(progressMap).length === 0) return 0;

    const cid = String(courseId);
    // 1) exact match
    if (progressMap[cid]) return Math.round(Number(progressMap[cid].completedPercent) || 0);

    // 2) direct numeric match (if courseId is "1","2", etc.)
    const numeric = cid.match(/^\d+$/) ? cid : null;
    if (numeric && progressMap[numeric]) return Math.round(Number(progressMap[numeric].completedPercent) || 0);

    // 3) find key that endsWith the cid (handles long objectId ending with number or similar)
    const keys = Object.keys(progressMap);
    const ends = keys.find((k) => k.endsWith(cid));
    if (ends) return Math.round(Number(progressMap[ends].completedPercent) || 0);

    // 4) find key that includes cid anywhere
    const includes = keys.find((k) => k.includes(cid));
    if (includes) return Math.round(Number(progressMap[includes].completedPercent) || 0);

    // 5) fallback: try numeric digits inside keys (first match)
    const digitMatchKey = keys.find((k) => {
      const m = k.match(/(\d+)$/);
      return m && m[1] === cid;
    });
    if (digitMatchKey) return Math.round(Number(progressMap[digitMatchKey].completedPercent) || 0);

    return 0;
  };

  const courses = [
    {
      id: "1",
      title: "Full Stack Web Development (MERN)",
      desc: "Learn MongoDB, Express, React, Node.js with real projects.",
    },
    {
      id: "2",
      title: "Data Science & AI",
      desc: "Master Python, Machine Learning, and AI applications.",
    },
    {
      id: "3",
      title: "Cloud & DevOps",
      desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines.",
    },
    {
      id: "4",
      title: "Cybersecurity & Ethical Hacking",
      desc: "Protect systems, learn penetration testing & network security.",
    },
    {
      id: "5",
      title: "UI/UX Design",
      desc: "Design modern apps using Figma, wireframes & prototypes.",
    },
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
            {["courses", "notes", "progress", "settings"].map((tab) => (
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
                {tab === "settings" && "⚙ "}
                <span className="item-text">{tab}</span>
              </li>
            ))}
          </ul>
        </nav>

        {user?.role === "uploader" && (
          <div className="sidebar-quick">
            <button onClick={() => navigate("/uploader/upload")}>➕ Upload Video</button>
            <button onClick={() => navigate("/uploader/dashboard")}>📁 My Uploads</button>
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
                        <div className="progress-bar" aria-label={`Progress for ${course.title}`}>
                          <div className="progress" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="progress-text">{progress}% Completed</p>
                        <button className="join-btn" onClick={() => navigate(`/course/${course.id}`)}>
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
                          {note.createdAt ? new Date(note.createdAt).toLocaleString() : note._id}
                        </small>
                        <button className="small-btn" onClick={() => handleDeleteNote(note._id)}>
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-card">
                    <p>No notes yet — take notes while watching lessons.</p>
                    <button onClick={() => setActiveTab("courses")}>Go to Courses</button>
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
                      <li key={p._id}>
                        Course: {String(p.courseId)} — {Math.round(Number(p.completedPercent) || 0)}% completed
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h3>⚙ Settings</h3>
                <div className="settings-card">
                  <p>Update profile info, change password, and notification preferences here.</p>

                  <div style={{ marginTop: 12 }}>
                    <button className="small-btn" onClick={() => navigate("/settings")}>
                      Open Settings Page
                    </button>
                  </div>

                  <hr style={{ margin: "16px 0" }} />

                  <div>
                    <h4>Account</h4>
                    <p>Email: <strong>{user?.email}</strong></p>
                    <p>Role: <strong>{user?.role || "user"}</strong></p>
                  </div>
                </div>
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
