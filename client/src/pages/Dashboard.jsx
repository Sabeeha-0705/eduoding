// client/src/pages/Dashboard.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./Dashboard.css";

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

  // NEW: index of badge that should animate (or null)
  const [newBadgeIndex, setNewBadgeIndex] = useState(null);

  const navigate = useNavigate();
  const bcRef = useRef(null);
  const mountedRef = useRef(true);

  const getToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // Normalize progress for multiple matching keys
  const normalizeProgressList = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const map = {};
    arr.forEach((p) => {
      const key = String(p.courseId ?? p.course ?? "");
      map[key] = { ...p, completedPercent: Number(p.completedPercent || 0) };
    });
    return map;
  };

  // Fetch user
  const fetchUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate("/auth", { replace: true });
        return null;
      }
      const profileRes = await API.get("/users/me").catch(() =>
        API.get("/auth/profile")
      );
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

  // Fetch all dashboard data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate("/auth", { replace: true });
        return;
      }

      await fetchUser();

      // Notes
      try {
        const notesRes = await API.get("/notes");
        if (mountedRef.current) setNotes(notesRes.data || []);
      } catch {
        setNotes([]);
      }

      // Courses
      try {
        const coursesRes = await API.get("/courses");
        const serverCourses = Array.isArray(coursesRes.data)
          ? coursesRes.data
          : coursesRes.data?.courses || [];
        setCourses(
          serverCourses.map((c) => ({
            id: String(c._id ?? c.id ?? c.courseId ?? c.slug ?? c.title),
            title: c.title || c.name || `Course ${c._id}`,
            desc: c.description || c.desc || "",
          }))
        );
      } catch {
        setCourses(null);
      }

      // Progress
      try {
        const progRes = await API.get("/progress");
        const list = progRes.data || [];
        if (mountedRef.current) {
          setProgressData(list);
          setProgressMap(normalizeProgressList(list));
        }
      } catch {
        setProgressData([]);
        setProgressMap({});
      }
    } catch (err) {
      console.error("fetchAll error:", err);
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

    return () => {
      mountedRef.current = false;
      window.removeEventListener("resize", onResize);
      if (bcRef.current) bcRef.current.close?.();
    };
  }, [fetchAll]);

  // Watch user.badges to decide new-badge animation once
  useEffect(() => {
    try {
      if (!user) {
        setNewBadgeIndex(null);
        return;
      }

      const badges = Array.isArray(user.badges) ? user.badges : [];
      if (badges.length === 0) {
        setNewBadgeIndex(null);
        return;
      }

      // Key in localStorage to remember last-seen badge
      const LS_KEY = "eduoding:lastSeenBadge";

      const lastSeen = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      const latestBadge = badges[badges.length - 1];

      // If latestBadge exists and differs from stored one, animate it once
      if (latestBadge && lastSeen !== latestBadge) {
        // set index to last badge
        setNewBadgeIndex(badges.length - 1);

        // after animation (1.4s from CSS), clear the animation state
        const t = setTimeout(() => {
          setNewBadgeIndex(null);
          try {
            if (typeof window !== "undefined") localStorage.setItem(LS_KEY, latestBadge);
          } catch (e) {
            /* ignore storage errors */
          }
        }, 1500); // slightly longer than CSS animation

        return () => clearTimeout(t);
      } else {
        // no new badge or already seen
        setNewBadgeIndex(null);
      }
    } catch (e) {
      console.warn("badge localStorage check failed:", e);
      setNewBadgeIndex(null);
    }
  }, [user]);

  const logout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    navigate("/auth", { replace: true });
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await API.delete(`/notes/${noteId}`);
      setNotes((n) => n.filter((x) => x._id !== noteId));
    } catch (err) {
      console.error("Delete note failed:", err);
      alert("Failed to delete note");
    }
  };

  const getProgressForCourse = (courseId) => {
    if (!progressMap) return 0;
    const cid = String(courseId);
    return Math.round(progressMap[cid]?.completedPercent || 0);
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
      setRefreshingProgress(false);
    }
  };

  const fallbackCourses = [
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

  const effectiveCourses =
    Array.isArray(courses) && courses.length ? courses : fallbackCourses;

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
          className="hamburger"
          onClick={() => setSidebarOpen((s) => !s)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <div className="mobile-title">Eduoding</div>
        <button
          className="tiny-btn pine-btn"
          onClick={() => navigate("/settings")}
          aria-label="Open settings"
        >
          ⚙
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="logo">Eduoding</div>

        <nav>
          <ul>
            {["courses", "notes", "progress", "code-test", "settings"].map(
              (tab) => (
                <li
                  key={tab}
                  role="button"
                  tabIndex={0}
                  className={`sidebar-item ${
                    activeTab === tab ? "active" : ""
                  }`}
                  onClick={() => {
                    if (tab === "code-test") {
                      navigate("/code-test");
                      setActiveTab("code-test");
                      return;
                    }
                    setActiveTab(tab);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (tab === "code-test") {
                        navigate("/code-test");
                        setActiveTab("code-test");
                        return;
                      }
                      setActiveTab(tab);
                    }
                  }}
                >
                  {tab === "courses" && "📘 "}
                  {tab === "notes" && "📝 "}
                  {tab === "progress" && "📊 "}
                  {tab === "code-test" && "💻 "}
                  {tab === "settings" && "⚙ "}
                  <span>{tab === "code-test" ? "Code Test" : tab}</span>
                </li>
              )
            )}
          </ul>
        </nav>

        {user?.role === "uploader" && (
          <div className="sidebar-quick">
            <button
              onClick={() => navigate("/uploader/upload")}
              className="uploader-btn"
              aria-label="Upload a video"
            >
              ➕ Upload Video
            </button>
            <button
              onClick={() => navigate("/uploader/dashboard")}
              className="uploader-btn outline"
              aria-label="My uploads"
            >
              📁 My Uploads
            </button>
          </div>
        )}

        <div style={{ marginTop: "auto", padding: 12 }}>
          <div className="role-badge">
            Role: <strong>{user?.role || "user"}</strong>
          </div>

          {/* 🏆 Gamification Summary */}
          <div className="gamify-summary" aria-live="polite">
            <p>
              🔥 <strong>Streak:</strong> {user?.streakCount ?? 0} days
            </p>
            <p>
              🌟 <strong>Longest Streak:</strong> {user?.longestStreak ?? 0}{" "}
              days
            </p>
            <p>
              💎 <strong>Points:</strong> {user?.points ?? 0}
            </p>
            <div>
              <strong>🏅 Badges:</strong>{" "}
              {user?.badges?.length ? (
                <>
                  {user.badges.map((b, i) => (
                    <span
                      key={i}
                      className={`badge ${newBadgeIndex === i ? "new-badge" : ""}`}
                      style={{ marginRight: 6 }}
                      tabIndex={0}
                      aria-label={`Badge: ${b}${newBadgeIndex === i ? " (new)" : ""}`}
                    >
                      {b}
                    </span>
                  ))}
                </>
              ) : (
                "—"
              )}
            </div>
          </div>

          <button className="logout-btn" onClick={logout} aria-label="Logout">
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {user ? (
          <div className="page-inner">
            <div className="dash-header">
              <h2>Welcome, {user?.username || user?.email}</h2>
              <div>
                <button
                  onClick={refreshProgress}
                  className="small-btn pine-btn"
                  disabled={refreshingProgress}
                  aria-label="Refresh progress"
                >
                  {refreshingProgress ? "Refreshing…" : "Refresh Progress"}
                </button>
                <button
                  className="small-btn pine-btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => navigate("/leaderboard")}
                  aria-label="Open leaderboard"
                >
                  Leaderboard
                </button>
              </div>
            </div>

            {/* Courses Tab */}
            {activeTab === "courses" && (
              <>
                <h3>📘 Your Courses</h3>
                <p>Select a course and start learning 🚀</p>
                <div className="courses-grid">
                  {effectiveCourses.map((course) => {
                    const progress = getProgressForCourse(course.id);
                    return (
                      <div key={course.id} className="course-card">
                        <h3>{course.title}</h3>
                        <p>{course.desc}</p>
                        <div className="progress-bar" aria-hidden>
                          <div
                            className="progress"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="progress-text">{progress}% Completed</p>
                        <button
                          className="join-btn"
                          onClick={() => navigate(`/course/${course.id}`)}
                          aria-label={`Open course ${course.title}`}
                        >
                          {progress === 100 ? "Review Course" : "Continue"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Notes */}
            {activeTab === "notes" && (
              <>
                <h3>📝 Your Notes</h3>
                {notes.length ? (
                  <ul className="notes-list">
                    {notes.map((note) => (
                      <li key={note._id}>
                        <p>{note.content || note.text}</p>
                        <button
                          className="small-btn"
                          onClick={() => handleDeleteNote(note._id)}
                          aria-label="Delete note"
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

            {/* Progress */}
            {activeTab === "progress" && (
              <>
                <h3>📊 Progress</h3>
                {progressData.length === 0 ? (
                  <div className="empty-card">
                    <p>No progress yet. Join a course to track progress.</p>
                  </div>
                ) : (
                  <ul>
                    {progressData.map((p) => (
                      <li key={p._id || `${p.courseId}`}>
                        Course {String(p.courseId)}: {Math.round(p.completedPercent)}%
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* Settings */}
            {activeTab === "settings" && (
              <div>
                <h3>⚙ Settings</h3>
                <div className="settings-card">
                  <p>
                    Email: <strong>{user?.email}</strong>
                  </p>
                  <p>
                    Points: <strong>{user?.points ?? 0}</strong>
                  </p>
                  <p>
                    Streak: <strong>{user?.streakCount ?? 0} days</strong>
                  </p>
                  <p>
                    Badges:{" "}
                    <strong>
                      {user?.badges?.length ? user.badges.join(", ") : "—"}
                    </strong>
                  </p>
                  <button
                    className="small-btn pine-btn"
                    onClick={() => navigate("/settings")}
                  >
                    Open Settings
                  </button>
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
