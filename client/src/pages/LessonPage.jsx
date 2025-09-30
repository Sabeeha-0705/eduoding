import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import API from "../api";
import "./LessonPage.css";

export default function LessonPage() {
  const { courseId, lessonId } = useParams(); // routes like /course/:courseId/lesson/:lessonId
  const navigate = useNavigate();

  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // notes
  const [note, setNote] = useState("");

  // fetch lessons for this course
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await API.get(`/lessons?courseId=${courseId}`);
        setLessons(res.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId]);

  // pick current lesson (by ID from URL; else first)
  const currentLesson = useMemo(() => {
    if (!lessons?.length) return null;
    if (lessonId) {
      return lessons.find((l) => String(l._id) === String(lessonId)) || lessons[0];
    }
    return lessons[0];
  }, [lessons, lessonId]);

  // load & save notes per course+lesson
  useEffect(() => {
    if (!currentLesson) return;
    const key = `note-${courseId}-${currentLesson._id}`;
    const saved = localStorage.getItem(key);
    setNote(saved || "");
  }, [courseId, currentLesson?._id]);

  const saveNote = () => {
    if (!currentLesson) return;
    const key = `note-${courseId}-${currentLesson._id}`;
    localStorage.setItem(key, note);
    alert("✅ Note saved!");
  };

  // helpers
  const toEmbed = (url) => {
    // handles watch?v=, youtu.be, or already embed links
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
  };

  const goPrev = () => {
    if (!currentLesson) return;
    const idx = lessons.findIndex((l) => String(l._id) === String(currentLesson._id));
    if (idx > 0) navigate(`/course/${courseId}/lesson/${lessons[idx - 1]._id}`);
  };

  const goNext = () => {
    if (!currentLesson) return;
    const idx = lessons.findIndex((l) => String(l._id) === String(currentLesson._id));
    if (idx < lessons.length - 1) navigate(`/course/${courseId}/lesson/${lessons[idx + 1]._id}`);
  };

  if (loading) return <div className="lesson-page"><p>Loading lessons…</p></div>;
  if (err) return <div className="lesson-page"><p style={{ color: "crimson" }}>{err}</p></div>;
  if (!lessons.length) {
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
            {lessons.map((l, i) => {
              const active = String(l._id) === String(currentLesson._id);
              return (
                <li key={l._id} className={active ? "active" : ""}>
                  <Link to={`/course/${courseId}/lesson/${l._id}`}>
                    <span>#{i + 1}</span> {l.title}
                  </Link>
                  <small className="type-badge">{l.type}</small>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main viewer */}
        <main className="lesson-main">
          <h1>{currentLesson.title}</h1>

          <div className="video-container">
            {currentLesson.type === "youtube" ? (
              <iframe
                src={toEmbed(currentLesson.videoUrl)}
                title={currentLesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video controls>
                <source
                  src={
                    currentLesson.videoUrl.startsWith("/uploads/")
                      ? `${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${currentLesson.videoUrl}`
                      : currentLesson.videoUrl
                  }
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Prev/Next */}
          <div className="pager">
            <button onClick={goPrev} disabled={lessons[0]._id === currentLesson._id}>
              ◀ Prev
            </button>
            <button
              onClick={goNext}
              disabled={lessons[lessons.length - 1]._id === currentLesson._id}
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
            <button onClick={saveNote} className="save-note-btn">
              Save Note
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
