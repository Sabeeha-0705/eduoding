// client/src/pages/Notes.jsx
import React, { useState, useEffect } from "react";
import { api } from "../api"; // authenticated axios (must send token)

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await api.get("/notes");
      setNotes(res.data || []);
    } catch (err) {
      console.error("Fetch failed:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchNotes();

    const onNotesUpdated = (e) => {
      // e.detail may contain updated note
      fetchNotes();
    };
    window.addEventListener("eduoding:notes-updated", onNotesUpdated);

    // BroadcastChannel
    let bc;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("eduoding");
        bc.onmessage = (m) => {
          if (m?.data?.type === "notes-updated") fetchNotes();
        };
      }
    } catch {}

    return () => {
      window.removeEventListener("eduoding:notes-updated", onNotesUpdated);
      if (bc) bc.close();
    };
  }, []);

  const addNote = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/notes", { content });
      setNotes([res.data, ...notes]);
      setContent("");
      // notify other components
      try {
        const ev = new CustomEvent("eduoding:notes-updated", { detail: res.data });
        window.dispatchEvent(ev);
      } catch {}
      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("eduoding");
          bc.postMessage({ type: "notes-updated", payload: res.data });
          bc.close();
        }
      } catch {}
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${id}`);
      setNotes(notes.filter((n) => n._id !== id));
      // notify
      try {
        const ev = new CustomEvent("eduoding:notes-updated", { detail: { id } });
        window.dispatchEvent(ev);
      } catch {}
    } catch {
      alert("Failed to delete note");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📝 My Notes</h1>

      <div className="flex gap-2 mb-4">
        <textarea
          className="border rounded p-2 flex-1"
          rows="2"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a new note..."
        />
        <button
          onClick={addNote}
          disabled={loading || !content.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-500">No notes saved yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note._id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <p>{note.content}</p>
                {note.createdAt && (
                  <small className="text-gray-500">
                    {new Date(note.createdAt).toLocaleString()}
                  </small>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    // open lesson if lessonId exists
                    if (note.lessonId) {
                      window.location.href = `/course/${note.courseId || ""}/lesson/${note.lessonId}`;
                    } else {
                      // otherwise just delete or do nothing
                      alert("No linked lesson for this note.");
                    }
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Open Lesson
                </button>
                <button
                  onClick={() => deleteNote(note._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
