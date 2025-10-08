// client/src/pages/CoursesPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./CoursesPage.css"; // optional - reuse your dashboard/course css if available

// fallback courses shown when server fails
const FALLBACK_COURSES = [
  { id: "1", title: "Full Stack Web Development (MERN)", desc: "Learn MongoDB, Express, React, Node.js with real projects." },
  { id: "2", title: "Data Science & AI", desc: "Master Python, Machine Learning, and AI applications." },
  { id: "3", title: "Cloud & DevOps", desc: "Hands-on AWS, Docker, Kubernetes, CI/CD pipelines." },
  { id: "4", title: "Cybersecurity & Ethical Hacking", desc: "Protect systems, learn penetration testing & network security." },
  { id: "5", title: "UI/UX Design", desc: "Design modern apps using Figma, wireframes & prototypes." },
];

export default function CoursesPage() {
  const [courses, setCourses] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const navigate = useNavigate();

  // helper: normalize list -> map for flexible ID matching
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

      // if rawKey contains separators — take last part
      if (rawKey.includes("/") || rawKey.includes(":") || rawKey.includes("-") || rawKey.includes("_")) {
        const parts = rawKey.split(/[\/:_-]+/).filter(Boolean);
        if (parts.length) map[parts[parts.length - 1]] = { ...p, completedPercent: percent };
      }

      // lowercase alias
      const lc = rawKey.toLowerCase().trim();
      if (lc && lc !== rawKey) map[lc] = { ...p, completedPercent: percent };
    });
    return map;
  };

  const getToken = () => localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  const fetchCourses = useCallback(async () => {
    try {
      const res = await API.get("/courses");
      const serverCourses = Array.isArray(res.data) ? res.data : res.data?.courses || [];
      if (!mountedRef.current) return;
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
    } catch (err) {
      // fallback
      if (mountedRef.current) setCourses(null);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await API.get("/progress");
      const list = res.data || [];
      if (!mountedRef.current) return;
      setProgressData(list);
      setProgressMap(normalizeProgressList(list));
    } catch (err) {
      if (mountedRef.current) {
        setProgressData([]);
        setProgressMap({});
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);

    (async () => {
      try {
        // optionally check token - if you want to force auth redirect uncomment below:
        // if (!getToken()) { navigate('/auth'); return; }

        await Promise.allSettled([fetchCourses(), fetchProgress()]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchCourses, fetchProgress, navigate]);

  const effectiveCourses = useMemo(() => (Array.isArray(courses) && courses.length ? courses : FALLBACK_COURSES), [courses]);

  const getProgressForCourse = (courseId) => {
    if (!progressMap || Object.keys(progressMap).length === 0) return 0;
    const cid = String(courseId);
    if (progressMap[cid]) return Math.round(Number(progressMap[cid].completedPercent) || 0);

    // try endsWith
    const keys = Object.keys(progressMap);
    const ends = keys.find((k) => k.endsWith(cid));
    if (ends) return Math.round(Number(progressMap[ends].completedPercent) || 0);

    // try includes
    const inc = keys.find((k) => k.includes(cid));
    if (inc) return Math.round(Number(progressMap[inc].completedPercent) || 0);

    // numeric match
    const digitKey = keys.find((k) => {
      const m = k.match(/(\d+)$/);
      return m && m[1] === cid;
    });
    if (digitKey) return Math.round(Number(progressMap[digitKey].completedPercent) || 0);

    return 0;
  };

  // Tries quiz first: if /quiz/:id exists -> go there; else fallback to /course/:id
  const goToCourseOrQuiz = async (courseId) => {
    try {
      const res = await API.get(`/quiz/${courseId}`);
      if (res && res.status >= 200 && res.status < 300 && res.data) {
        navigate(`/course/${courseId}/quiz`);
        return;
      }
    } catch (e) {
      // no quiz or error -> fallback to course page
    }
    navigate(`/course/${courseId}`);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: "40px auto", padding: 20 }}>
        <h2>Courses</h2>
        <p>Loading courses…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Available Courses</h2>
          <p>Select a course to continue learning.</p>
        </div>
        <div>
          <button
            onClick={async () => {
              // manual refresh
              setLoading(true);
              try {
                await Promise.allSettled([fetchCourses(), fetchProgress()]);
              } finally {
                if (mountedRef.current) setLoading(false);
              }
            }}
            style={{ padding: "8px 12px" }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18, marginTop: 18 }}>
        {effectiveCourses.map((course) => {
          const progress = getProgressForCourse(course.id);
          return (
            <div key={course.id} style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 6px 16px rgba(10,20,40,0.06)" }}>
              <h3 style={{ margin: "4px 0 8px" }}>{course.title}</h3>
              <p style={{ color: "#666", minHeight: 36 }}>{course.desc}</p>

              <div style={{ height: 10, background: "#eef2f6", borderRadius: 8, overflow: "hidden", marginTop: 12 }}>
                <div aria-hidden style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#7c6cff,#66c2ff)", borderRadius: 8 }} />
              </div>
              <p style={{ marginTop: 8, fontSize: 14 }}>{progress}% Completed</p>

              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => goToCourseOrQuiz(course.id)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: progress === 100 ? "linear-gradient(90deg,#5b6bff,#4fd1f8)" : "linear-gradient(90deg,#4fb3a5,#2b9a77)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {progress === 100 ? "Review Course" : "Continue"}
                </button>
                <button
                  onClick={() => navigate(`/course/${course.id}`)}
                  style={{
                    marginLeft: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Course Page
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
