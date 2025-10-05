import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import API from "../api";
import "./LessonPage.css";

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [hasQuiz, setHasQuiz] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await API.get(`/courses/${courseId}/videos`);
        setVideos(res.data || []);

        // fetch progress for this course
        const p = await API.get(`/progress/${courseId}`);
        setCompletedIds(p.data.completedLessonIds || []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Failed to load videos");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [courseId]);

  useEffect(() => {
    let mounted = true;
    const checkQuiz = async () => {
      setHasQuiz(null);
      try {
        await API.get(`/quiz/${courseId}`);
        if (!mounted) return;
        setHasQuiz(true);
      } catch {
        if (!mounted) return;
        setHasQuiz(false);
      }
    };
    checkQuiz();
    return () => (mounted = false);
  }, [courseId]);

  const currentVideo = useMemo(() => {
    if (!videos?.length) return null;
    if (lessonId) {
      return videos.find((v) => String(v._id) === String(lessonId)) || videos[0];
    }
    return videos[0];
  }, [videos, lessonId]);

  useEffect(() => {
    if (!currentVideo) return setNote("");
    const key = `note-${courseId}-${currentVideo._id}`;
    setNote(localStorage.getItem(key) || "");
  }, [courseId, currentVideo?._id]);

  const saveNote = () => {
    if (!currentVideo) return;
    const key = `note-${courseId}-${currentVideo._id}`;
    localStorage.setItem(key, note);
    alert("✅ Note saved!");
  };

  const toEmbed = (url) => {
    if (!url) return "";
    if (url.includes("/embed/")) return url;
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/"))
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
  };

  // ✅ main progress logic
  const toggleCompleted = async (lessonId, completed) => {
    try {
      const res = await API.post(`/progress/${courseId}/lesson`, {
        lessonId,
        completed,
      });
      setCompletedIds(res.data.completedLessonIds || []);
    } catch (e) {
      console.error("toggle complete failed", e);
    }
  };

  const markComplete = async (lessonId) => {
    await toggleCompleted(lessonId, true);
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
              const active = String(v._id) === String(currentVideo._id);
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
          <h1>{currentVideo.title}</h1>

          <div className="video-container">
            {currentVideo.sourceType === "youtube" || currentVideo.youtubeUrl ? (
              <iframe
                src={`${toEmbed(currentVideo.youtubeUrl)}?enablejsapi=1`}
                title={currentVideo.title}
                frameBorder="0"
                allowFullScreen
              />
            ) : (
              <video controls onEnded={() => markComplete(currentVideo._id)}>
                <source src={currentVideo.fileUrl} type="video/mp4" />
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
              <button onClick={saveNote}>Save Note</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
