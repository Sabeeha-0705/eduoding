// client/src/pages/Settings.jsx
import React, { useEffect, useState, useRef } from "react";
import API from "../api";
import "./Settings.css";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const toastRef = useRef(null);
  const objectUrlRef = useRef(null);

  // 🔹 Load profile
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await API.get("/auth/profile");
        if (!mounted) return;
        const u = res.data.user || res.data;
        setUser(u);
        setUsername(u.username || "");
        setName(u.name || "");
        setAvatarPreview(u.avatarUrl || u.avatar || "");
      } catch (err) {
        console.error("Load profile error:", err);
        setError(err?.response?.data?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // 🔹 Apply theme locally
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    try {
      window.dispatchEvent(
        new CustomEvent("eduoding:theme-changed", { detail: { theme } })
      );
    } catch {}
  }, [theme]);

  // 🔹 Cleanup object URL when unmounted
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // 🔹 Toast helper
  const showToast = (text, type = "info", ms = 2500) => {
    setMsg(text);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setMsg(""), ms);
  };

  // 🔹 Save profile (name & username)
  // IMPORTANT: after PATCH we immediately re-fetch the profile to ensure the UI always shows what is actually saved on the server.
  const saveProfile = async (e) => {
    e.preventDefault();
    setError("");
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();

    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setSaving(true);
    try {
      // 1) Send update
      const res = await API.patch("/auth/profile", {
        username: trimmedUsername,
        name: trimmedName,
        theme,
      });

      // 2) Re-fetch the fresh profile from server to avoid partial/empty response issues
      const refetch = await API.get("/auth/profile");
      const freshUser = refetch.data.user || refetch.data || {};

      // 3) Update UI state with guaranteed server values
      setUser(freshUser);
      setUsername(freshUser.username || trimmedUsername);
      setName(typeof freshUser.name !== "undefined" ? freshUser.name : trimmedName);

      // 4) Notify other parts of the app
      window.dispatchEvent(new CustomEvent("eduoding:user-updated", { detail: freshUser }));

      // 5) Show message from server (if any) or fallback
      const serverMsg = res.data?.message || "Profile saved!";
      showToast(serverMsg, "success");
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Avatar change
  const handleAvatarChange = (e) => {
    setError("");
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (png/jpg/jpeg).");
      return;
    }
    const MAX = 5 * 1024 * 1024;
    if (f.size > MAX) {
      setError("File too large. Max 5 MB.");
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setAvatarFile(f);
    setAvatarPreview(url);
  };

  // 🔹 Upload avatar
  const uploadAvatar = async () => {
    if (!avatarFile) {
      setError("Select an image first.");
      return;
    }
    setUploadingAvatar(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const res = await API.post("/auth/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data || {};
      // prefer server user or data
      const updatedUser = data.user || data;
      setUser(updatedUser);

      const newAvatar =
        data.avatarUrl ||
        (data.user && data.user.avatarUrl) ||
        updatedUser.avatarUrl ||
        avatarPreview;
      setAvatarPreview(newAvatar);
      setAvatarFile(null);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      window.dispatchEvent(new CustomEvent("eduoding:user-updated", { detail: updatedUser }));
      showToast("Avatar uploaded!");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelAvatar = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarPreview(user?.avatarUrl || user?.avatar || "");
    setError("");
  };

  const changed =
    user &&
    (username.trim() !== (user.username || "").trim() || name.trim() !== (user.name || "").trim());

  return (
    <div className="settings-root">
      <div className="settings-card">
        <h1 className="settings-title">Settings</h1>

        {loading ? (
          <p>Loading profile…</p>
        ) : (
          <>
            {/* 🔹 Avatar */}
            <section className="settings-section">
              <h3>Avatar</h3>
              <div className="avatar-row">
                <div className="avatar-preview">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="avatar preview"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div className="avatar-empty">No avatar</div>
                  )}
                </div>

                <div className="avatar-controls">
                  <input type="file" accept="image/*" onChange={handleAvatarChange} />
                  <div className="avatar-buttons">
                    <button
                      className="btn primary"
                      disabled={uploadingAvatar || !avatarFile}
                      onClick={uploadAvatar}
                    >
                      {uploadingAvatar ? "Uploading…" : "Upload Avatar"}
                    </button>
                    <button className="btn" onClick={handleCancelAvatar} disabled={uploadingAvatar}>
                      Cancel
                    </button>
                  </div>
                  <small className="hint">Use PNG/JPG. Max 5MB.</small>
                </div>
              </div>
            </section>

            {/* 🔹 Theme */}
            <section className="settings-section">
              <h3>Theme</h3>
              <div className="theme-row">
                <button
                  className={`theme-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  Light
                </button>
                <button
                  className={`theme-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  Dark
                </button>
              </div>
            </section>

            {/* 🔹 Profile */}
            <section className="settings-section">
              <h3>Profile</h3>
              <form onSubmit={saveProfile} className="profile-form">
                <label>Username</label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                />

                <label>Name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="input" />

                <div className="form-actions">
                  <button type="submit" className="btn primary" disabled={!changed || saving}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setUsername(user.username || "");
                      setName(user.name || "");
                      setError("");
                    }}
                    disabled={saving}
                  >
                    Reset
                  </button>

                  {msg && <div className="msg success">{msg}</div>}
                  {error && <div className="msg error">{error}</div>}
                </div>
              </form>

              <div className="profile-meta">
                <p>
                  Email: <strong>{user?.email || "—"}</strong>
                </p>
                <p>
                  Role: <strong>{user?.role || "user"}</strong>
                </p>
              </div>
            </section>
          </>
        )}
      </div>

      {/* 🔹 Floating toast */}
      {msg && <div className="floating-toast">{msg}</div>}
    </div>
  );
}
