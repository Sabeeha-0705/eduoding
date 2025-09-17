import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="brand">Eduoding</div>
        <nav>
          <Link to="/auth" className="nav-btn">Login</Link>
          <Link to="/auth" className="nav-btn outline">Sign up</Link>
        </nav>
      </header>

      <main className="hero">
        <div className="hero-inner">
          <h1>Build real skills. Get certified.</h1>
          <p className="lead">
            Practical courses with projects, progress tracking and certificates on completion.
          </p>

          <div className="hero-cta">
            <Link to="/auth" className="btn-primary large">Get Started — Sign Up</Link>
            <Link to="/dashboard" className="btn-ghost">Explore Courses</Link>
          </div>

          <div className="features">
            <div className="feature">
              <strong>Live Projects</strong>
              <span>Work on real-world projects</span>
            </div>
            <div className="feature">
              <strong>Progress Tracking</strong>
              <span>See your course progress & certificates</span>
            </div>
            <div className="feature">
              <strong>Mentor Support</strong>
              <span>Get help from mentors and community</span>
            </div>
          </div>
        </div>

        <div className="hero-image" aria-hidden="true">
          {/* optional image background or illustration */}
        </div>
      </main>

      <footer className="landing-footer">
        <div>© {new Date().getFullYear()} Eduoding — All rights reserved.</div>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
