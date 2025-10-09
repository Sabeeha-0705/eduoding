import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import API from "../api"; // public axios
import { api } from "../api"; // authenticated axios (must send token)
import "./LessonPage.css";

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState(null);
  const [hasQuiz, setHasQuiz] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const [updating, setUpdating] = useState(false);

  const bcRef = useRef(null);
  const debounceRef = useRef(null);

  const getToken = () =>
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // BroadcastChannel setup
  useEffect(() => {
    if ("BroadcastChannel" in window) {
      try {
        bcRef.current = new BroadcastChannel("eduoding");
        bcRef.current.onmessage = (m) => {
          if (m?.data?.type === "notes-updated") loadLocalOrBackendNote();
          if (m?.data?.type === "eduoding:progress-updated") {
            refreshProgress();
          }
        };
      } catch {
        bcRef.current = null;
      }
    }
    return () => {
      if (bcRef.current) {
        try {
          bcRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Initial load: videos + progress
  const refreshProgress = async () => {
    try {
      const res = await API.get(`/progress/${courseId}?ts=${Date.now()}`, {
        headers: { "Cache-Control": "no-store" },
      });
      setCompletedIds(res.data?.completedLessonIds || []);
    } catch (e) {
      console.warn("Progress refresh failed:", e);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await API.get(`/courses/${courseId}/videos`);
        setVideos(res.data || []);
        await refreshProgress();
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Failed to load lessons");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  // Check quiz availability
  useEffect(() => {
    let mounted = true;
    const checkQuiz = async () => {
      setHasQuiz(null);
      try {
        const res = await API.get(`/quiz/${courseId}`);
        if (!mounted) return;
        setHasQuiz(res?.status >= 200 && res?.status < 300);
      } catch {
        if (mounted) setHasQuiz(false);
      }
    };
    checkQuiz();
    return () => (mounted = false);
  }, [courseId]);

  const currentVideo = useMemo(() => {
    if (!videos?.length) return null;
    if (lessonId)
      return videos.find((v) => String(v._id) === String(lessonId)) || videos[0];
    return videos[0];
  }, [videos, lessonId]);

  // Notes handling
  const loadLocalOrBackendNote = async () => {
    if (!currentVideo) return setNote("");
    const key = `note-${courseId}-${currentVideo._id}`;

    try {
      const token = getToken();
      if (token && api) {
        const res = await api.get("/notes");
        const notes = Array.isArray(res.data) ? res.data : [];
        const found = notes.find(
          (n) =>
            String(n.lessonId || "") === String(currentVideo._id) &&
            (String(n.courseId || "") === String(courseId) || !n.courseId)
        );
        if (found) {
          setNote(found.content || "");
          setNoteId(found._id || null);
          localStorage.setItem(key, found.content || "");
          return;
        }
      }
    } catch {
      // ignore errors, fallback below
    }

    setNote(localStorage.getItem(key) || "");
    setNoteId(null);
  };

  useEffect(() => {
    loadLocalOrBackendNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?._id, courseId]);

  const saveNote = async () => {
    if (!currentVideo) return alert("Select a lesson first.");
    const key = `note-${courseId}-${currentVideo._id}`;
    const payload = { content: note, courseId, lessonId: currentVideo._id };
    setUpdating(true);
    try {
      let res;
      if (noteId && api) {
        try {
          res = await api.put(`/notes/${noteId}`, payload);
        } catch {
          res = await api.post("/notes", payload);
        }
      } else {
        if (!api) throw new Error("No authenticated axios instance");
        res = await api.post("/notes", payload);
      }
      const saved = res.data;
      setNoteId(saved._id || saved.id || null);
      localStorage.setItem(key, saved.content || note || "");
      alert("✅ Note saved!");
      // broadcast note update
      try {
        const ev = new CustomEvent("eduoding:notes-updated", { detail: saved });
        window.dispatchEvent(ev);
      } catch {}
      if (bcRef.current) {
        try {
          bcRef.current.postMessage({ type: "notes-updated", payload: saved });
        } catch {}
      }
    } catch (err) {
      console.error("Save note failed:", err);
      localStorage.setItem(key, note);
      alert("Saved locally (offline).");
    } finally {
      setUpdating(false);
    }
  };

  const toEmbed = (url) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
  };

  const notifyProgressUpdated = (payload = {}) => {
    try {
      const ev = new CustomEvent("eduoding:progress-updated", { detail: payload });
      window.dispatchEvent(ev);
    } catch {}
    try {
      window.postMessage({ type: "eduoding:progress-updated", payload }, "*");
    } catch {}
    if (bcRef.current) {
      try {
        bcRef.current.postMessage({ type: "eduoding:progress-updated", payload });
      } catch {}
    }
  };

  const toggleCompleted = async (lessonIdParam, completed) => {
    if (updating) return;
    setUpdating(true);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const totalLessons = videos?.length || 0;
        const res = await API.post(`/progress/${courseId}/lesson`, {
          lessonId: lessonIdParam,
          completed,
          totalLessons,
        });

        const newCompleted = res.data?.completedLessonIds || [];
        setCompletedIds(newCompleted.map(String));
        notifyProgressUpdated({
          courseId: String(courseId),
          lessonId: String(lessonIdParam),
          completed,
          completedLessonIds: newCompleted,
          completedPercent: res.data?.completedPercent ?? undefined,
        });

        // small delay -> reload from backend for accuracy
        setTimeout(() => refreshProgress(), 400);
      } catch (e) {
        console.error("toggle complete failed", e);
        alert("Failed to update progress.");
      } finally {
        setUpdating(false);
      }
    }, 300);
  };

  const markComplete = async (lessonIdParam) => {
    await toggleCompleted(lessonIdParam, true);
  };

  const goPrev = () => {
    if (!currentVideo) return;
    const idx = videos.findIndex((l) => String(l._id) === String(currentVideo._id));
    if (idx > 0) navigate(`/course/${courseId}/lesson/${videos[idx - 1]._id}`);
  };

  const goNext = () => {
    if (!currentVideo) return;
    const idx = videos.findIndex((l) => String(l._id) === String(currentVideo._id));
    if (idx < videos.length - 1)
      navigate(`/course/${courseId}/lesson/${videos[idx + 1]._id}`);
  };

  if (loading)
    return (
      <div className="lesson-page">
        <p>Loading lessons…</p>
      </div>
    );

  if (err)
    return (
      <div className="lesson-page">
        <p style={{ color: "crimson" }}>{err}</p>
      </div>
    );

  return (
    <div className="lesson-page">
      <button className="back-btn" onClick={() => navigate(`/course/${courseId}`)}>
        ⬅ Back to Course
      </button>

      <div className="lesson-layout">
        <aside className="lesson-list">
          <h3>Lessons</h3>
          <ul>
            {videos.map((v, i) => {
              const active = String(v._id) === String(currentVideo?._id);
              const checked = completedIds.includes(String(v._id));
              return (
                <li key={v._id} className={active ? "active" : ""}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleCompleted(v._id, e.target.checked)}
                    />
                    <Link to={`/course/${courseId}/lesson/${v._id}`}>
                      <span>#{i + 1}</span> {v.title}
                    </Link>
                  </label>
                  <small className="type-badge">
                    {v.sourceType || (v.youtubeUrl ? "youtube" : "upload")}
                  </small>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="lesson-main">
          <h1>{currentVideo?.title}</h1>

          <div className="video-container">
            {currentVideo?.sourceType === "youtube" || currentVideo?.youtubeUrl ? (
              <iframe
                src={`${toEmbed(currentVideo?.youtubeUrl)}?enablejsapi=1`}
                title={currentVideo?.title}
                frameBorder="0"
                allowFullScreen
              />
            ) : (
              <video
                controls
                onEnded={() => {
                  markComplete(currentVideo._id);
                  notifyProgressUpdated({ courseId, lessonId: currentVideo._id });
                }}
              >
                <source src={currentVideo?.fileUrl} type="video/mp4" />
              </video>
            )}
          </div>

          <div className="pager">
            <button onClick={goPrev}>◀ Prev</button>
            <button onClick={goNext}>Next ▶</button>
          </div>

          <div className="notes-section">
            <h3>Your Notes</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your notes here…"
            />
            <div className="notes-actions">
              <button onClick={saveNote} className="save-note-btn" disabled={updating}>
                {updating ? "Saving…" : "Save Note"}
              </button>

              <div className="quiz-actions">
                {hasQuiz === null ? (
                  <span className="quiz-checking">Checking quiz…</span>
                ) : (
                  <>
                    <button
                      className={`take-quiz-btn ${hasQuiz ? "" : "disabled"}`}
                      onClick={() => {
                        const token = getToken();
                        if (!token) {
                          alert("Please login to take the quiz.");
                          navigate("/auth");
                          return;
                        }
                        if (!hasQuiz) {
                          alert("No quiz available for this course.");
                          return;
                        }
                        navigate(`/course/${courseId}/quiz`);
                      }}
                      disabled={!hasQuiz}
                    >
                      Take Quiz
                    </button>

                    <button
                      className="view-cert-btn"
                      onClick={() => {
                        const token = getToken();
                        if (!token) {
                          alert("Please login to view certificates.");
                          navigate("/auth");
                          return;
                        }
                        navigate("/certificates");
                      }}
                    >
                      My Certificates
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
