import React, { useState, useEffect } from "react";
import { api } from "../api"; // ✅ named import (consistent with api.js)

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Fetch notes on load
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get("/notes");
      setNotes(res.data || []);
    } catch (err) {
      console.error("Fetch failed:", err.response?.data || err.message);
    }
  };

  // ✅ Add new note
  const addNote = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/notes", { content });
      setNotes([res.data, ...notes]); // prepend new note
      setContent("");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete note
  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${id}`);
      setNotes(notes.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      alert("Failed to delete note");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📝 My Notes</h1>

      {/* Input */}
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

      {/* Notes List */}
      {notes.length === 0 ? (
        <p className="text-gray-500">No notes saved yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note._id}
              className="border rounded p-3 flex justify-between items-center"
            >
              <div>
                <p>{note.content}</p>
                {note.createdAt && (
                  <small className="text-gray-500">
                    {new Date(note.createdAt).toLocaleString()}
                  </small>
                )}
              </div>
              <button
                onClick={() => deleteNote(note._id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
