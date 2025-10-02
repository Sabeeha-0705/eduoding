// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import API from "../api";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/users/me");
        setUser(res.data);
        setUsername(res.data.username || "");
        setName(res.data.name || "");
      } catch (err) {}
    })();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put("/users/profile", { username, name });
      setUser(res.data.user);
      setMsg("Saved!");
      setTimeout(()=>setMsg(""),2000);
    } catch (err) {
      setMsg(err.response?.data?.message || "Save failed");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <section className="mb-6">
        <h3 className="font-semibold">Theme</h3>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={()=>setTheme("light")} style={{padding:8,background: theme==="light"?"#ddd":"transparent"}}>Light</button>
          <button onClick={()=>setTheme("dark")} style={{padding:8,background: theme==="dark"?"#333":"transparent",color: theme==="dark"?"#fff":"inherit"}}>Dark</button>
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Profile</h3>
        <form onSubmit={saveProfile}>
          <div className="mb-2">
            <label>Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} />
          </div>
          <div className="mb-2">
            <label>Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <button type="submit">Save</button>
        </form>
        <p>{msg}</p>
      </section>
    </div>
  );
}
