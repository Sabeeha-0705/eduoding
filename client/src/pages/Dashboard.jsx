// client/src/pages/Dashboard.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Dashboard.css";

/*
  Dashboard.jsx - improved
  - Fetches user + courses + progress
  - Listens to 'eduoding:progress-updated' (custom event), BroadcastChannel and postMessage
  - On progress update we refresh progress AND refetch user so points/badges reflected
  - Provides manual "Refresh Progress" button
*/

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("courses");
  const [notes, setNotes] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshingProgress, setRefreshingProgress] = useState(false);

  const navigate = useNavigate();
  const bcRef = useRef(null);
  const mountedRef = useRef(true);

  const getToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  const normalizeProgressList = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const map = {};
    arr.forEach((p) => {
      const rawKey = String(p.courseId ?? p.course_id ?? p.course ?? "");
      const percent = Number(p.completedPercent ?? p.completed_percent ?? p.percent ?? 0) || 0;
      map[rawKey] = { ...p, completedPercent: percent };

      const digitsMatch = rawKey.match(/(\d+)$/);
      if (digitsMatch) map[digitsMatch[1]] = { ...p, completedPercent: percent };

      if (rawKey.includes("/") || rawKey.includes(":") || rawKey.includes("-") || rawKey.includes("_")) {
        const parts = rawKey.split(/[\/:_-]+/).filter(Boolean);
        if (parts.length) map[parts[parts.length - 1]] = { ...p, completedPercent: percent };
      }

      const lc = rawKey.toLowerCase().trim();
      if (lc && lc !== rawKey) map[lc] = { ...p, completedPercent: percent };
    });
    return map;
  };

  const fetchUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/auth", { replace: true });
        return null;
      }
      const profileRes = await API.get("/users/me").catch(() => API.get("/auth/profile"));
      const profileData = profileRes.data?.user || profileRes.data;
      if (mountedRef.current) setUser(profileData);
      return profileData;
    } catch (err) {
      console.error("fetchUser error:", err);
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      navigate("/auth", { replace: true });
      return null;
    }
  }, [navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate("/auth", { replace: true });
        return;
      }

      // PROFILE
      await fetchUser();

      // NOTES
      try {
        const notesRes = await API.get("/notes");
        if (mountedRef.current) setNotes(notesRes.data || []);
      } catch {
        if (mountedRef.current) {
          const localNotes = [];
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("note-")) {
              localNotes.push({ _id: k, content: localStorage.getItem(k), createdAt: null });
            }
          });
          setNotes(localNotes);
        }
      }

      // COURSES (try server)
      try {
        const coursesRes = await API.get("/courses");
        if (!mountedRef.current) return;
        const serverCourses = Array.isArray(coursesRes.data)
          ? coursesRes.data
          : coursesRes.data?.courses || [];
        if (serverCourses.length) {
          setCourses(
            serverCourses.map((c) => ({
              id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title),
              title: c.title || c.name || `Course ${c._id}`,
              desc: c.description || c.desc || "",
            }))
          );
        } else {
          setCourses(null);
        }
      } catch {
        setCourses(null);
      }

      // PROGRESS
      try {
        const progRes = await API.get("/progress");
        if (!mountedRef.current) return;
        const list = progRes.data || [];
        setProgressData(list);
        setProgressMap(normalizeProgressList(list));
      } catch (err) {
        console.warn("Progress fetch failed:", err);
        if (mountedRef.current) {
          setProgressData([]);
          setProgressMap({});
        }
      }
    } catch (err) {
      console.error("Dashboard fetchAll error:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchUser, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();

    const onResize = () => setSidebarOpen(window.innerWidth >= 900);
    onResize();
    window.addEventListener("resize", onResize);

    // BroadcastChannel (cross-tab)
    if ("BroadcastChannel" in window) {
      try {
        bcRef.current = new BroadcastChannel("eduoding");
        bcRef.current.onmessage = (m) => {
          try {
            if (m?.data?.type === "eduoding:progress-updated") {
              // refresh progress AND refetch user to reflect new points/badges
              refreshProgress();
              fetchUser();
            }
          } catch (e) {
            /* ignore */
          }
        };
      } catch (e) {
        bcRef.current = null;
      }
    }

    // custom event in same tab
    const onProgressUpdated = (ev) => {
      refreshProgress();
      fetchUser();
    };
    window.addEventListener("eduoding:progress-updated", onProgressUpdated);

    // postMessage fallback
    const onPostMsg = (msg) => {
      try {
        if (msg?.data?.type === "eduoding:progress-updated") {
          refreshProgress();
          fetchUser();
        }
      } catch {}
    };
    window.addEventListener("message", onPostMsg);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("eduoding:progress-updated", onProgressUpdated);
      window.removeEventListener("message", onPostMsg);
      if (bcRef.current) {
        try {
          bcRef.current.close();
        } catch {}
      }
    };
  }, [fetchAll, fetchUser]);

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
      console.error("Delete note failed:", err?.message || err);
      alert("Failed to delete note");
    }
  };

  const getProgressForCourse = (courseId) => {
    if (!progressMap || Object.keys(progressMap).length === 0) return 0;
    const cid = String(courseId);
    if (progressMap[cid]) return Math.round(Number(progressMap[cid].completedPercent) || 0);

    const keys = Object.keys(progressMap);
    const ends = keys.find((k) => k.endsWith(cid));
    if (ends) return Math.round(Number(progressMap[ends].completedPercent) || 0);

    const inc = keys.find((k) => k.includes(cid));
    if (inc) return Math.round(Number(progressMap[inc].completedPercent) || 0);

    const digitKey = keys.find((k) => {
      const m = k.match(/(\d+)$/);
      return m && m[1] === cid;
    });
    if (digitKey) return Math.round(Number(progressMap[digitKey].completedPercent) || 0);

    return 0;
  };

  const refreshProgress = async () => {
    try {
      setRefreshingProgress(true);
      const progRes = await API.get("/progress");
      const list = progRes.data || [];
      if (mountedRef.current) {
        setProgressData(list);
        setProgressMap(normalizeProgressList(list));
      }
    } catch (err) {
      console.warn("Refresh progress failed:", err);
    } finally {
      if (mountedRef.current) setRefreshingProgress(false);
    }
  };

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
      <header className="mobile-header">
        <button aria-label="Toggle navigation" className="hamburger" onClick={() => setSidebarOpen((s) => !s)}>☰</button>
        <div className="mobile-title">Eduoding</div>
        <div className="mobile-actions">
          <button className="tiny-btn" onClick={() => navigate("/settings")}>⚙</button>
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
            <button onClick={() => navigate("/uploader/upload")} className="uploader-btn">➕ Upload Video</button>
            <button onClick={() => navigate("/uploader/dashboard")} className="uploader-btn outline">📁 My Uploads</button>
          </div>
        )}

        {user?.role === "admin" && (
          <button onClick={() => navigate("/admin/requests")} className="admin-btn">Admin Panel</button>
        )}

        <div style={{ marginTop: "auto", padding: 12 }}>
          <div className="role-badge">Role: <strong>{user?.role || "user"}</strong></div>

          <div style={{ marginTop: 10 }}>
            <div><strong>Points:</strong> {user?.points ?? 0}</div>
            <div style={{ marginTop: 6 }}>
              <strong>Badges:</strong> {(user?.badges && user.badges.length) ? user.badges.join(", ") : "—"}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </aside>

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
                <button style={{ marginLeft: 8 }} className="small-btn" onClick={() => navigate("/code-test")}>
  Code Test
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
                        <div>
                          <p>{note.content || note.text}</p>
                          <small>{note.createdAt ? new Date(note.createdAt).toLocaleString() : note._id}</small>
                        </div>
                        <div>
                          <button className="small-btn" onClick={() => handleDeleteNote(note._id)}>Delete</button>
                        </div>
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
