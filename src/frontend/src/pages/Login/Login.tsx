import React, { useState } from 'react';
import { Eye, EyeOff, User, Lock, MapPin, Navigation, Star } from 'lucide-react';

// ── Right panel slides ─────────────────────────────────────────────────
const slides = [
  {
    img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=2000&auto=format&fit=crop',
    badge: 'Đà Nẵng · Vietnam',
    title: 'Explore the\nDragon City',
    sub: 'Discover vibrant events, smart navigation and real‑time alerts across Da Nang.',
  },
  {
    img: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2000&auto=format&fit=crop',
    badge: 'My Khe Beach',
    title: 'Navigate\nEvery Corner',
    sub: 'Get the best route, avoid floods and congestion with real‑time traffic data.',
  },
  {
    img: 'https://images.unsplash.com/photo-1597149952762-06b4e2cd3f9b?q=80&w=2000&auto=format&fit=crop',
    badge: 'City Events',
    title: 'Never Miss\nan Event',
    sub: 'Stay informed about concerts, festivals and city activities happening near you.',
  },
];

export default function Login() {
  const [showPw, setShowPw] = useState(false);
  const [slide, setSlide] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Auto-rotate slides every 5s
  React.useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  const current = slides[slide];

  return (
    <div className="auth-wrapper">
      {/* ── LEFT PANEL ──────────────────────────────────────── */}
      <div className="auth-left">
        <div className="auth-left-inner">
          {/* Logo */}
          <a href="/" className="auth-logo animate-fade-up">
            <div className="auth-logo-icon">
              <Navigation size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="auth-logo-text">
              DaNang <span>EventMap</span>
            </span>
          </a>

          {/* Heading */}
          <h1 className="auth-heading animate-fade-up delay-1">Welcome back 👋</h1>
          <p className="auth-subheading animate-fade-up delay-2">
            Sign in to your account to continue exploring.
          </p>

          {/* Form */}
          <form onSubmit={e => e.preventDefault()}>
            {/* Username */}
            <div className="form-group animate-fade-up delay-2">
              <label className="form-label" htmlFor="login-username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <User size={17} strokeWidth={2} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group animate-fade-up delay-3">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={17} strokeWidth={2} />
                </span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="form-row animate-fade-up delay-4">
              <label className="remember-label">
                <input type="checkbox" id="remember-me" />
                Remember me
              </label>
              <a href="/forgot-password" className="link-forgot">
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-btn"
              className="btn-primary animate-fade-up delay-4"
            >
              Sign In
            </button>
          </form>

          {/* Bottom link */}
          <p className="auth-bottom-text animate-fade-up delay-5">
            Don't have an account?{' '}
            <a href="/register">Sign up</a>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div className="auth-right">
        <img
          key={slide}
          src={current.img}
          alt={current.badge}
          className="auth-right-img"
          style={{ animation: 'fadeInUp 0.8s ease both' }}
        />
        <div className="auth-right-overlay" />

        {/* Stats cards */}
        <div className="auth-right-stats">
          <div className="stat-card">
            <div className="stat-value">120+</div>
            <div className="stat-label">Annual Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">4.9 ★</div>
            <div className="stat-label">User Rating</div>
          </div>
        </div>

        <div className="auth-right-content">
          <div
            className="auth-right-badge"
            style={{ animation: 'fadeInUp 0.6s ease both' }}
          >
            <MapPin size={13} strokeWidth={2.5} />
            {current.badge}
          </div>

          <h2
            className="auth-right-title"
            style={{
              animation: 'fadeInUp 0.6s ease 0.1s both',
              whiteSpace: 'pre-line',
            }}
          >
            {current.title}
          </h2>

          <p
            className="auth-right-subtitle"
            style={{ animation: 'fadeInUp 0.6s ease 0.2s both' }}
          >
            {current.sub}
          </p>

          <div className="auth-right-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`dot${i === slide ? ' active' : ''}`}
                style={{ border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}