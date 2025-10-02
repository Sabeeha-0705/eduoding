// client/src/pages/Settings.jsx
import React, { useEffect, useState, useRef } from "react";
import API from "../api";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // avatar states
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // store previous objectURL so we can revoke it
  const objectUrlRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await API.get("/users/me");
        if (!mounted) return;
        const u = res.data;
        setUser(u);
        setUsername(u.username || "");
        setName(u.name || "");
        setAvatarPreview(u.avatarUrl || "");
      } catch (err) {
        console.error("Load profile error:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const showMsg = (text, ms = 2500) => {
    setMsg(text);
    setTimeout(() => setMsg(""), ms);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setError("");
    const trimmedUsername = (username || "").trim();
    const trimmedName = (name || "").trim();
    if (trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await API.put("/users/profile", { username: trimmedUsername, name: trimmedName });
      // backend may return updated user directly or inside res.data.user
      const updatedUser = res.data.user || res.data;
      setUser(updatedUser);
      showMsg("Saved!");
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // revoke old objectURL when unmount / new preview
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleAvatarChange = (e) => {
    setError("");
    const f = e.target.files?.[0];
    if (!f) return;

    // validate type
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (png/jpg/jpeg).");
      return;
    }

    // validate size (5 MB)
    const MAX = 5 * 1024 * 1024;
    if (f.size > MAX) {
      setError("File too large. Max 5 MB.");
      return;
    }

    // revoke previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setAvatarFile(f);
    setAvatarPreview(url);
  };

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
      const res = await API.post("/users/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // server might respond { user } or { avatarUrl } or the user directly
      const data = res.data || {};
      const updatedUser = data.user || data;
      setUser(updatedUser);
      // pick avatar URL from common places
      const newAvatar =
        data.avatarUrl ||
        (data.user && data.user.avatarUrl) ||
        updatedUser.avatarUrl ||
        avatarPreview;
      setAvatarPreview(newAvatar);
      setAvatarFile(null);

      // revoke objectURL (we replaced preview with real URL)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      showMsg("Avatar uploaded!");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelAvatar = () => {
    // revoke preview object url if any
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarPreview(user?.avatarUrl || "");
    setError("");
  };

  const changed =
    user &&
    (username.trim() !== (user.username || "").trim() || name.trim() !== (user.name || "").trim());

  return (
    <div className="p-6 max-w-3xl mx-auto" style={{ minHeight: 420 }}>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      {loading ? (
        <p>Loading profile…</p>
      ) : (
        <>
          <section className="mb-6">
            <h3 className="font-semibold">Avatar</h3>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fafafa",
                }}
              >
                {avatarPreview ? (
                  // avatarPreview could be objectURL or remote URL
                  // use alt-friendly image
                  // add onError fallback to hide broken image
                  <img
                    src={avatarPreview}
                    alt="avatar preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div style={{ textAlign: "center", color: "#888" }}>No avatar</div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    disabled={uploadingAvatar || !avatarFile}
                    onClick={uploadAvatar}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: uploadingAvatar ? "#ddd" : "#4b61e6",
                      color: "#fff",
                      cursor: uploadingAvatar ? "not-allowed" : "pointer",
                    }}
                  >
                    {uploadingAvatar ? "Uploading…" : "Upload Avatar"}
                  </button>

                  <button
                    onClick={handleCancelAvatar}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                    disabled={uploadingAvatar}
                  >
                    Cancel
                  </button>
                </div>
                <small style={{ color: "#666" }}>Use PNG/JPG. Max 5MB.</small>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="font-semibold">Theme</h3>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  border: theme === "light" ? "1px solid #999" : "1px solid #ddd",
                  background: theme === "light" ? "#f0f0f0" : "transparent",
                }}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  border: theme === "dark" ? "1px solid #999" : "1px solid #ddd",
                  background: theme === "dark" ? "#222" : "transparent",
                  color: theme === "dark" ? "#fff" : "inherit",
                }}
              >
                Dark
              </button>
            </div>
          </section>

          <section>
            <h3 className="font-semibold">Profile</h3>

            <form onSubmit={saveProfile} style={{ maxWidth: 640 }}>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="username" style={{ display: "block", marginBottom: 6 }}>
                  Username
                </label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="name" style={{ display: "block", marginBottom: 6 }}>
                  Name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={!changed || saving}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: !changed || saving ? "#ddd" : "#4b61e6",
                    color: "#fff",
                    cursor: !changed || saving ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsername(user.username || "");
                    setName(user.name || "");
                    setError("");
                  }}
                  disabled={saving}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Reset
                </button>

                {msg && <div style={{ color: "green", fontWeight: 600 }}>{msg}</div>}
                {error && <div style={{ color: "crimson", fontWeight: 600 }}>{error}</div>}
              </div>
            </form>

            <div style={{ marginTop: 18, color: "#666", fontSize: 13 }}>
              <p>
                Email: <strong>{user?.email || "—"}</strong>
              </p>
              <p style={{ marginTop: 6 }}>
                Role: <strong>{user?.role || "user"}</strong>
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
