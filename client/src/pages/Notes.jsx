import React, { useState, useEffect } from "react";
import API from "../api";

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
      const res = await API.get("/notes");
      setNotes(res.data);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  // ✅ Add new note
  const addNote = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await API.post("/notes", { content });
      setNotes([res.data, ...notes]);
      setContent("");
    } catch (err) {
      console.error(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete note
  const deleteNote = async (id) => {
    try {
      await API.delete(`/notes/${id}`);
      setNotes(notes.filter((n) => n._id !== id));
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Notes</h1>

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
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
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
              <span>{note.content}</span>
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
