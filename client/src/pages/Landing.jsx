// src/pages/Landing.jsx
import { Link } from "react-router-dom";
import logo from "/logo.png"; // public/logo.png
import svg1 from "../assets/undraw_coding_joxb.svg";
import svg2 from "../assets/undraw_code-review_ept3.svg";
import svg3 from "../assets/undraw_web-app_141a.svg";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-left">
          <img src={logo} alt="Eduoding" className="landing-logo" />
          <span className="brand">Eduoding</span>
        </div>
        <nav className="landing-nav">
          <Link to="/auth" className="nav-btn outline">Login</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-left">
          <h1 className="hero-title">Practical learning. Real projects. Certificates.</h1>
          <p className="hero-sub">
            Instructor-led courses, project work, and verified certificates — start building today.
          </p>

          <div className="hero-ctas">
            <Link to="/auth" className="btn-primary">Get Started</Link>
            <Link to="/auth" className="btn-ghost">Sign up</Link>
          </div>

          <p className="hero-note">Trusted by learners worldwide · Certificate on course completion</p>
        </div>

        <div className="hero-right" aria-hidden="true">
          <div className="collage">
            <img src={svg1} alt="" className="collage-item item1" />
            <img src={svg2} alt="" className="collage-item item2" />
            <img src={svg3} alt="" className="collage-item item3" />
            {/* optional overlay for visual polish */}
            {/* <img src={heroOverlay} className="collage-overlay" alt="" /> */}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-inner">
          <p>© {new Date().getFullYear()} Eduoding. All rights reserved.</p>
          <p className="footer-small">Build projects • Earn certificates • Join a community</p>
        </div>
      </footer>
    </div>
  );
}
