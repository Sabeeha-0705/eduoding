// client/src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Dashboard.css";

/*
  Dashboard.jsx - improved
  - Tries to fetch real courses from /courses; falls back to built-in list
  - Fetches progress list and normalizes into lookup map
  - Shows user points & badges in sidebar
  - Adds "Refresh Progress" to re-sync manually
  - Robust matching strategies for courseId <-> progress entries
  - Thanglish friendly comments for quick dev understanding
*/

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("courses");
  const [notes, setNotes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [courses, setCourses] = useState(null); // try server first
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshingProgress, setRefreshingProgress] = useState(false);

  const navigate = useNavigate();

  const getToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // Normalize server progress list into a lookup map for fast access
  const normalizeProgressList = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const map = {};
    arr.forEach((p) => {
      // some servers return courseId or course_id or an ObjectId string
      const rawKey = String(p.courseId ?? p.course_id ?? p.course ?? "");
      const percent = Number(p.completedPercent ?? p.completed_percent ?? p.percent ?? 0) || 0;

      // canonical entry
      map[rawKey] = { ...p, completedPercent: percent };

      // if rawKey ends with digits (like "course_1" or ".../1") create fallback
      const digitsMatch = rawKey.match(/(\d+)$/);
      if (digitsMatch) {
        map[digitsMatch[1]] = { ...p, completedPercent: percent };
      }

      // if rawKey contains separators, store last segment as fallback
      if (rawKey.includes("/") || rawKey.includes(":") || rawKey.includes("-") || rawKey.includes("_")) {
        const parts = rawKey.split(/[\/:_-]+/).filter(Boolean);
        if (parts.length) {
          map[parts[parts.length - 1]] = { ...p, completedPercent: percent };
        }
      }

      // lowercase fallback
      const lc = rawKey.toLowerCase().trim();
      if (lc && lc !== rawKey) map[lc] = { ...p, completedPercent: percent };
    });
    return map;
  };

  // Fetch user, notes, courses, progress
  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          navigate("/auth", { replace: true });
          return;
        }

        // PROFILE: try /users/me then /auth/profile
        const profileRes = await API.get("/users/me").catch(() => API.get("/auth/profile"));
        const profileData = profileRes.data?.user || profileRes.data;
        if (!mounted) return;
        setUser(profileData);

        // NOTES: try server, fallback to localStorage
        try {
          const notesRes = await API.get("/notes");
          if (!mounted) return;
          setNotes(notesRes.data || []);
        } catch {
          if (!mounted) return;
          const localNotes = [];
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("note-")) {
              localNotes.push({ _id: k, content: localStorage.getItem(k), createdAt: null });
            }
          });
          setNotes(localNotes);
        }

        // COURSES: try to fetch from backend; fallback to default list below
        try {
          const coursesRes = await API.get("/courses");
          if (!mounted) return;
          // server may return array or { courses: [...] }
          const serverCourses = Array.isArray(coursesRes.data) ? coursesRes.data : coursesRes.data?.courses || [];
          if (serverCourses.length) {
            setCourses(serverCourses.map((c) => ({ id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title), title: c.title || c.name || `Course ${c._id}`, desc: c.description || c.desc || "" })));
          } else {
            setCourses(null); // fallback later
          }
        } catch (err) {
          // console.warn("Courses fetch failed:", err);
          setCourses(null);
        }

        // PROGRESS: fetch list for user
        try {
          const progRes = await API.get("/progress");
          if (!mounted) return;
          const list = progRes.data || [];
          setProgressData(list);
          setProgressMap(normalizeProgressList(list));
        } catch (err) {
          if (!mounted) return;
          console.warn("Progress fetch failed:", err);
          setProgressData([]);
          setProgressMap({});
        }
      } catch (err) {
        console.error("Dashboard fetchAll error:", err);
        // force logout on serious auth error
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
        navigate("/auth", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    // responsive sidebar initial state
    const onResize = () => setSidebarOpen(window.innerWidth >= 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
    };
  }, [navigate]);

  // Logout helper
  const logout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    navigate("/auth", { replace: true });
  };

  // Delete note (server or local)
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
      console.error("Delete note failed:", err?.message || err);
      alert("Failed to delete note");
    }
  };

  // Robust progress lookup
  const getProgressForCourse = (courseId) => {
    if (!progressMap || Object.keys(progressMap).length === 0) return 0;
    const cid = String(courseId);

    // 1) exact key
    if (progressMap[cid]) return Math.round(Number(progressMap[cid].completedPercent) || 0);

    // 2) numeric key if courseId is number-like
    if (/^\d+$/.test(cid) && progressMap[cid]) return Math.round(Number(progressMap[cid].completedPercent) || 0);

    // 3) find key that endsWith cid
    const keys = Object.keys(progressMap);
    const ends = keys.find((k) => k.endsWith(cid));
    if (ends) return Math.round(Number(progressMap[ends].completedPercent) || 0);

    // 4) find key includes
    const inc = keys.find((k) => k.includes(cid));
    if (inc) return Math.round(Number(progressMap[inc].completedPercent) || 0);

    // 5) digit-match fallback
    const digitKey = keys.find((k) => {
      const m = k.match(/(\d+)$/);
      return m && m[1] === cid;
    });
    if (digitKey) return Math.round(Number(progressMap[digitKey].completedPercent) || 0);

    return 0;
  };

  // Manual refresh (useful when LessonPage updates progress and dashboard hasn't synced)
  const refreshProgress = async () => {
    try {
      setRefreshingProgress(true);
      const progRes = await API.get("/progress");
      const list = progRes.data || [];
      setProgressData(list);
      setProgressMap(normalizeProgressList(list));
    } catch (err) {
      console.warn("Refresh progress failed:", err);
    } finally {
      setRefreshingProgress(false);
    }
  };

  // If backend didn't return courses, use this fallback static list
  const fallbackCourses = [
    { id: "1", title: "Full Stack Web Development (MERN)", desc: "Learn MongoDB, Express, React, Node.js with real projects." },
    { id: "2", title: "Data Science & AI", desc: "Master Python, Machine Learning, and AI applications." },
    { id: "3", title: "Cloud & DevOps", desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines." },
    { id: "4", title: "Cybersecurity & Ethical Hacking", desc: "Protect systems, learn penetration testing & network security." },
    { id: "5", title: "UI/UX Design", desc: "Design modern apps using Figma, wireframes & prototypes." },
  ];

  const effectiveCourses = Array.isArray(courses) && courses.length ? courses : fallbackCourses;

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* mobile header */}
      <header className="mobile-header">
        <button aria-label="Toggle navigation" className="hamburger" onClick={() => setSidebarOpen((s) => !s)}>☰</button>
        <div className="mobile-title">Eduoding</div>
        <div className="mobile-actions">
          <button className="tiny-btn" onClick={() => navigate("/settings")}>⚙</button>
        </div>
      </header>

      {/* sidebar */}
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
                role="button"
                tabIndex={0}
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
          <button onClick={() => navigate("/admin/requests")} className="btn-admin">Admin Panel</button>
        )}

        <div style={{ marginTop: "auto", padding: 12 }}>
          <div className="role-badge">Role: <strong>{user?.role || "user"}</strong></div>

          {/* points & badges */}
          <div style={{ marginTop: 10 }}>
            <div><strong>Points:</strong> {user?.points ?? 0}</div>
            <div style={{ marginTop: 6 }}><strong>Badges:</strong> {(user?.badges && user.badges.length) ? user.badges.join(", ") : "—"}</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </aside>

      {/* main content */}
      <main className="main-content">
        {user ? (
          <div className="page-inner">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Welcome, {user?.username || user?.email}</h2>
              <div>
                <button onClick={refreshProgress} className="small-btn" disabled={refreshingProgress}>
                  {refreshingProgress ? "Refreshing…" : "Refresh Progress"}
                </button>
                <button style={{ marginLeft: 8 }} className="small-btn" onClick={() => navigate("/leaderboard")}>
                  Leaderboard
                </button>
              </div>
            </div>

            {activeTab === "courses" && (
              <>
                <p>Select a course and start learning 🚀</p>
                <div className="courses-grid">
                  {effectiveCourses.map((course) => {
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
                        <small>{note.createdAt ? new Date(note.createdAt).toLocaleString() : note._id}</small>
                        <button className="small-btn" onClick={() => handleDeleteNote(note._id)}>Delete</button>
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
                      <li key={p._id || `${p.courseId}`}>
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
                    <button className="small-btn" onClick={() => navigate("/settings")}>Open Settings Page</button>
                  </div>
                  <hr style={{ margin: "16px 0" }} />
                  <div>
                    <h4>Account</h4>
                    <p>Email: <strong>{user?.email}</strong></p>
                    <p>Role: <strong>{user?.role || "user"}</strong></p>
                    <p>Points: <strong>{user?.points ?? 0}</strong></p>
                    <p>Badges: <strong>{(user?.badges && user.badges.length) ? user.badges.join(", ") : "—"}</strong></p>
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
