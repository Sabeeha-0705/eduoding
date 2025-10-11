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

      // numeric ID fallback
      const digitsMatch = rawKey.match(/(\d+)$/);
      if (digitsMatch) map[digitsMatch[1]] = { ...p, completedPercent: percent };

      // last-part fallback
      if (rawKey.includes("/") || rawKey.includes(":") || rawKey.includes("-") || rawKey.includes("_")) {
        const parts = rawKey.split(/[\/:_-]+/).filter(Boolean);
        if (parts.length) map[parts[parts.length - 1]] = { ...p, completedPercent: percent };
      }

      const lc = rawKey.toLowerCase().trim();
      if (lc && lc !== rawKey) map[lc] = { ...p, completedPercent: percent };
    });
    return map;
  };

  // Fetch current user
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

  // Initial fetch
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

      // Courses
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

      // Progress
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

    if ("BroadcastChannel" in window) {
      try {
        bcRef.current = new BroadcastChannel("eduoding");
        bcRef.current.onmessage = (m) => {
          if (m?.data?.type === "eduoding:progress-updated") {
            refreshProgress({ broadcast: false });
            fetchUser();
          }
        };
      } catch {
        bcRef.current = null;
      }
    }

    const onPostMsg = (msg) => {
      if (msg?.data?.type === "eduoding:progress-updated") {
        refreshProgress({ broadcast: false });
        fetchUser();
      }
    };
    window.addEventListener("message", onPostMsg);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("message", onPostMsg);
      if (bcRef.current) bcRef.current.close();
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
    return 0;
  };

  // ✅ Fixed refreshProgress (no blank, no flicker)
  const refreshProgress = async (opts = { broadcast: true }) => {
    if (refreshingProgress) return;
    try {
      setRefreshingProgress(true);
      const progRes = await API.get("/progress");
      const list = progRes.data || [];
      if (mountedRef.current) {
        setProgressData((prev) => (list.length ? list : prev));
        setProgressMap((prev) => (list.length ? normalizeProgressList(list) : prev));
      }

      if (opts.broadcast) {
        try {
          window.postMessage({ type: "eduoding:progress-updated" }, "*");
          bcRef.current?.postMessage({ type: "eduoding:progress-updated" });
        } catch {}
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
        <button className="hamburger" onClick={() => setSidebarOpen((s) => !s)}>☰</button>
        <div className="mobile-title">Eduoding</div>
      </header>

      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="logo">Eduoding</div>
        <nav>
          <ul>
            {["courses", "notes", "progress", "code-test", "settings"].map((tab) => (
              <li
                key={tab}
                className={`sidebar-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => {
                  if (tab === "code-test") {
                    navigate("/code-test");
                    setActiveTab("code-test");
                    if (window.innerWidth < 900) setSidebarOpen(false);
                    return;
                  }
                  setActiveTab(tab);
                  if (window.innerWidth < 900) setSidebarOpen(false);
                }}
              >
                {tab === "courses" && "📘 "}
                {tab === "notes" && "📝 "}
                {tab === "progress" && "📊 "}
                {tab === "code-test" && "💻 "}
                {tab === "settings" && "⚙ "}
                <span>{tab === "code-test" ? "Code Test" : tab}</span>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop: "auto", padding: 12 }}>
          <div><strong>Role:</strong> {user?.role || "user"}</div>
          <div style={{ marginTop: 8 }}>
            <strong>Points:</strong> {user?.points ?? 0}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Badges:</strong> {(user?.badges && user.badges.length) ? user.badges.join(", ") : "—"}
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main-content">
        {user ? (
          <div className="page-inner">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Welcome, {user?.username || user?.email}</h2>
              <div>
                <button
                  onClick={() => refreshProgress({ broadcast: true })}
                  className="small-btn pine-btn"
                  disabled={refreshingProgress}
                >
                  {refreshingProgress ? "Refreshing…" : "Refresh Progress"}
                </button>
                <button
                  style={{ marginLeft: 8 }}
                  className="small-btn pine-btn"
                  onClick={() => navigate("/leaderboard")}
                >
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
                        <div className="progress-bar">
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
          </div>
        ) : (
          <p>Loading user...</p>
        )}
      </main>
    </div>
  );
}
