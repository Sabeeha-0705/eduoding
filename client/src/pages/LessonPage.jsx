// src/pages/LessonPage.jsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import API from "../api";
import "./LessonPage.css";

export default function LessonPage() {
  const { courseId, lessonId } = useParams(); // lessonId will be video _id
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]); // renamed from lessons => videos
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // notes
  const [note, setNote] = useState("");

  // NEW: quiz availability
  const [hasQuiz, setHasQuiz] = useState(null); // null = checking, false = no, true = yes

  // fetch videos for this course (uses same route as CoursePage)
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        // GET /api/courses/:id/videos  (server/routes/courseRoutes.js)
        const res = await API.get(`/courses/${courseId}/videos`);
        setVideos(res.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Failed to load videos");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId]);

  // NEW: check if quiz exists for this course
  useEffect(() => {
    let mounted = true;
    const checkQuiz = async () => {
      setHasQuiz(null);
      try {
        await API.get(`/quiz/${courseId}`); // protected route — API wrapper should send token
        if (!mounted) return;
        setHasQuiz(true);
      } catch (e) {
        if (!mounted) return;
        // if 404 or error -> no quiz
        setHasQuiz(false);
      }
    };
    checkQuiz();
    return () => (mounted = false);
  }, [courseId]);

  // pick current "lesson" (video) by ID from URL; else first
  const currentVideo = useMemo(() => {
    if (!videos?.length) return null;
    if (lessonId) {
      return videos.find((v) => String(v._id) === String(lessonId)) || videos[0];
    }
    return videos[0];
  }, [videos, lessonId]);

  // load & save notes per course+video
  useEffect(() => {
    if (!currentVideo) {
      setNote("");
      return;
    }
    const key = `note-${courseId}-${currentVideo._id}`;
    const saved = localStorage.getItem(key);
    setNote(saved || "");
  }, [courseId, currentVideo?._id]);

  const saveNote = () => {
    if (!currentVideo) return;
    const key = `note-${courseId}-${currentVideo._id}`;
    localStorage.setItem(key, note);
    alert("✅ Note saved!");
  };

  // helpers — convert YouTube url to embed URL
  const toEmbed = (url) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
  };

  const goPrev = () => {
    if (!currentVideo) return;
    const idx = videos.findIndex((l) => String(l._id) === String(currentVideo._id));
    if (idx > 0) navigate(`/course/${courseId}/lesson/${videos[idx - 1]._id}`);
  };

  const goNext = () => {
    if (!currentVideo) return;
    const idx = videos.findIndex((l) => String(l._id) === String(currentVideo._id));
    if (idx < videos.length - 1) {
      // <-- FIXED: ensure template expression closes with } before backtick
      navigate(`/course/${courseId}/lesson/${videos[idx + 1]._id}`);
    }
  };

  if (loading) return <div className="lesson-page"><p>Loading lessons…</p></div>;
  if (err) return <div className="lesson-page"><p style={{ color: "crimson" }}>{err}</p></div>;
  if (!videos.length) {
    return (
      <div className="lesson-page">
        <button className="back-btn" onClick={() => navigate(`/course/${courseId}`)}>
          ⬅ Back to Course
        </button>
        <h1>No lessons available yet.</h1>
      </div>
    );
  }

  return (
    <div className="lesson-page">
      <button className="back-btn" onClick={() => navigate(`/course/${courseId}`)}>
        ⬅ Back to Course
      </button>

      <div className="lesson-layout">
        {/* Sidebar lesson list */}
        <aside className="lesson-list">
          <h3>Lessons</h3>
          <ul>
            {videos.map((v, i) => {
              const active = String(v._id) === String(currentVideo._id);
              return (
                <li key={v._id} className={active ? "active" : ""}>
                  <Link to={`/course/${courseId}/lesson/${v._id}`}>
                    <span>#{i + 1}</span> {v.title}
                  </Link>
                  <small className="type-badge">{v.sourceType || (v.youtubeUrl ? "youtube" : "upload")}</small>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main viewer */}
        <main className="lesson-main">
          <h1>{currentVideo.title}</h1>

          <div className="video-container">
            {(currentVideo.sourceType === "youtube" || currentVideo.youtubeUrl) ? (
              <iframe
                src={toEmbed(currentVideo.youtubeUrl || currentVideo.fileUrl || "")}
                title={currentVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video controls>
                <source
                  src={
                    (currentVideo.fileUrl || "").startsWith("http")
                      ? currentVideo.fileUrl
                      : `${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${currentVideo.fileUrl}`
                  }
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Prev/Next */}
          <div className="pager">
            <button onClick={goPrev} disabled={videos[0]._id === currentVideo._id}>
              ◀ Prev
            </button>
            <button
              onClick={goNext}
              disabled={videos[videos.length - 1]._id === currentVideo._id}
            >
              Next ▶
            </button>
          </div>

          {/* Notes */}
          <div className="notes-section">
            <h3>Your Notes</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your notes here…"
            />
            <div className="notes-actions">
              <button onClick={saveNote} className="save-note-btn">Save Note</button>

              {/* NEW: Quiz & Certificates buttons */}
              <div className="quiz-actions">
                {hasQuiz === null ? (
                  <span className="quiz-checking">Checking quiz…</span>
                ) : hasQuiz === true ? (
                  <button
                    className="take-quiz-btn"
                    onClick={() => navigate(`/quiz/${courseId}`)}
                  >
                    Take Quiz
                  </button>
                ) : (
                  <button
                    disabled
                    className="take-quiz-btn disabled"
                    title="No quiz for this course"
                  >
                    Quiz unavailable
                  </button>
                )}

                <button
                  className="view-cert-btn"
                  onClick={() => navigate("/certificates")}
                >
                  My Certificates
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
