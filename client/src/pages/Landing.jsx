// src/pages/Landing.jsx
import { Link } from "react-router-dom";
// public/logo.png (keep in /public)
import logo from "/logo.png";

// hero + collage images (should exist under src/assets)
import hero from "../assets/undraw_coding_joxb.svg";
import review from "../assets/undraw_code-review_ept3.svg";
import webapp from "../assets/undraw_web-app_141a.svg";

import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-root">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-left">
          {/* Use only the main logo (bigger, clear) */}
          <img src={logo} alt="Eduoding" className="landing-logo" />
        </div>

        <nav className="landing-nav">
          {/* point to /auth so your Auth page opens */}
          <Link to="/auth" className="nav-btn outline">Login</Link>
          <Link to="/auth" className="nav-btn ghost">Sign up</Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="landing-hero">
        <div className="hero-text">
          <h1>
            Practical learning. <br />
            Real projects. <br />
            Certificates.
          </h1>

          <p className="lead">
            Instructor-led courses, project work, and verified certificates — start building today.
          </p>

          <div className="cta-buttons">
            <Link to="/auth" className="btn primary">Get Started</Link>
            <Link to="/auth" className="btn secondary">Sign up</Link>
          </div>

          <p className="trusted">Trusted by learners worldwide · Certificate on course completion</p>
        </div>

        <div className="hero-images" aria-hidden="true">
          <img src={hero} alt="Student coding" className="hero-main" />
          <img src={review} alt="" className="hero-card card1" />
          <img src={webapp} alt="" className="hero-card card2" />
        </div>
      </main>

      {/* About / Split section */}
      <section className="about-section">
        <div className="about-inner">
          <div className="about-text">
            <h2>Why Eduoding?</h2>
            <p>
              We teach by building. Short modules with hands-on projects, mentor feedback and an industry-aligned
              curriculum so you finish with a portfolio and a certificate employers respect.
            </p>

            <ul className="about-list">
              <li>📚 Project-first curriculum</li>
              <li>👩‍🏫 Instructor & mentor support</li>
              <li>🛠 Real-world tools & CI workflows</li>
            </ul>

            <div style={{ marginTop: 14 }}>
              <Link to="/courses" className="btn outline">Browse Courses</Link>
              <Link to="/auth" className="btn primary" style={{ marginLeft: 10 }}>Start Learning</Link>
            </div>
          </div>

          <div className="about-media">
            <div className="about-media-card">
              <img src={webapp} alt="Platform preview" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <p>© 2025 Eduoding. All rights reserved.</p>
          <p className="muted">Build projects • Earn certificates • Join a community</p>
        </div>
      </footer>
    </div>
  );
}
