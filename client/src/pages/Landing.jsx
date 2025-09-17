// src/pages/Landing.jsx
import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="brand">Eduoding</div>
        <nav>
          <Link to="/dashboard" className="nav-btn">Dashboard</Link>
          <Link to="/" className="nav-outline">Login</Link>
        </nav>
      </header>

      <main className="hero">
        <div className="hero-inner">
          <h1>Learn practical skills. Build real projects. Get certified.</h1>
          <p className="subtitle">
            Hands-on courses, project-based learning and official certificates — start today.
          </p>

          <div className="cta-row">
            <Link to="/" className="btn-primary">Login</Link>
            <Link to="/" className="btn-outline">Sign up</Link>
          </div>
        </div>
        <div className="hero-image" aria-hidden="true">
          {/* optional: place svg/illustration here or use background image */}
        </div>
      </main>

      <footer className="landing-footer">
        <div>© {new Date().getFullYear()} Eduoding. All rights reserved.</div>
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
