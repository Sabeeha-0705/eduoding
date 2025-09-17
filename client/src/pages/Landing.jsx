// src/pages/Landing.jsx
import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="brand">Eduoding</div>
        <nav>
          <Link to="/auth" className="btn small">Login</Link>
        </nav>
      </header>

      <main className="landing-main">
        <div className="hero">
          <h1>Learn. Build. Certify.</h1>
          <p>Practical courses, real projects and official certificates — start today.</p>
          <div className="cta">
            <Link to="/auth" className="btn primary">Login</Link>
            <Link to="/auth" className="btn outline">Sign up</Link>
          </div>
        </div>

        <footer className="landing-footer">
          <p>&copy; {new Date().getFullYear()} Eduoding. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
