import React, { useState } from 'react';
import { Eye, EyeOff, User, Lock, Mail, UserCircle, Navigation, MapPin, CheckCircle } from 'lucide-react';

// ── Right panel slides ─────────────────────────────────────────────────
const slides = [
  {
    img: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=2000&auto=format&fit=crop',
    badge: 'Han River · Đà Nẵng',
    title: 'Join Our\nCommunity',
    sub: 'Create an account to save routes, get alerts, and never miss a city event.',
  },
  {
    img: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop',
    badge: 'Smart Routing',
    title: 'Travel\nSmarter',
    sub: 'Our AI-powered routing avoids floods and congestion to get you there faster.',
  },
];

// ── Password strength helper ───────────────────────────────────────────
function getStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['', '#EF4444', '#F59E0B', '#10B981', '#059669'];
const segmentClass = ['', 'weak', 'fair', 'good', 'strong'];

export default function Register() {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [slide, setSlide] = useState(0);

  // State quản lý API
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % slides.length), 5500);
    return () => clearInterval(id);
  }, []);

  const current = slides[slide];
  const strength = getStrength(form.password);
  const pwMatch = form.confirmPassword && form.password === form.confirmPassword;
  const pwMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // ── LOGIC GỌI API ĐĂNG KÝ ──────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Chặn reload trang
    setErrorMsg('');

    // Kiểm tra mật khẩu khớp chưa
    if (pwMismatch) {
      setErrorMsg('Mật khẩu nhập lại không khớp!');
      return;
    }

    setLoading(true);

    try {
      // Gọi xuống backend (Cổng 5001)
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password
          // Có thể truyền thêm fullName nếu backend của bạn có hỗ trợ lưu fullName
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Tạo tài khoản thành công! Hãy đăng nhập nhé.');
        window.location.href = '/login'; // Chuyển hướng sang trang đăng nhập
      } else {
        setErrorMsg(data.message || 'Đăng ký thất bại!');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* ── LEFT PANEL ──────────────────────────────────────── */}
      <div className="auth-left">
        <div className="auth-left-inner">
          {/* Logo */}
          <div className="auth-logo select-none">
            <div className="auth-logo-icon">
              <Navigation size={20} color="#fff" />
            </div>
            <span className="auth-logo-text">
              DaNang <span>EventMap</span>
            </span>
          </div>
          {/* Heading */}
          <h1 className="auth-heading animate-fade-up delay-1">Create account ✨</h1>
          <p className="auth-subheading animate-fade-up delay-2">
            Join thousands exploring events and smart navigation.
          </p>

          {/* Khung báo lỗi màu đỏ nếu đăng ký thất bại */}
          {errorMsg && (
            <div className="animate-fade-up delay-2" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', border: '1px solid #fecaca' }}>
              {errorMsg}
            </div>
          )}

          {/* Form - Thay thế onSubmit bằng hàm handleRegister */}
          <form onSubmit={handleRegister}>
            {/* Username */}
            <div className="form-group animate-fade-up delay-2">
              <label className="form-label" htmlFor="reg-username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={17} strokeWidth={2} /></span>
                <input
                  id="reg-username"
                  type="text"
                  className="form-input"
                  placeholder="e.g. johndoe123"
                  value={form.username}
                  onChange={set('username')}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group animate-fade-up delay-2">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={17} strokeWidth={2} /></span>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Full name */}
            <div className="form-group animate-fade-up delay-3">
              <label className="form-label" htmlFor="reg-fullname">Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon"><UserCircle size={17} strokeWidth={2} /></span>
                <input
                  id="reg-fullname"
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={set('fullName')}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group animate-fade-up delay-3">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide' : 'Show'}
                >
                  {showPw ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div style={{ marginTop: '0.375rem' }}>
                  <div className="strength-bar">
                    {[1, 2, 3, 4].map(n => (
                      <div
                        key={n}
                        className={`strength-segment${strength >= n ? ` ${segmentClass[strength]}` : ''}`}
                      />
                    ))}
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: strengthColors[strength],
                    marginTop: '0.25rem',
                  }}>
                    {strengthLabels[strength]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-group animate-fade-up delay-4">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  autoComplete="new-password"
                  required
                  style={{
                    borderColor: pwMismatch ? '#EF4444' : pwMatch ? '#10B981' : undefined,
                  }}
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Hide' : 'Show'}
                >
                  {showConfirm ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                </button>
                {/* Match icon */}
                {pwMatch && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '2.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#10B981',
                      display: 'flex',
                    }}
                  >
                    <CheckCircle size={16} strokeWidth={2.5} />
                  </span>
                )}
              </div>
              {pwMismatch && (
                <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.25rem' }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="register-btn"
              className="btn-primary animate-fade-up delay-5"
              disabled={loading}
              style={{ marginTop: '0.5rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Bottom link */}
          <p className="auth-bottom-text animate-fade-up delay-6">
            Already have an account?{' '}
            <a href="/login">Sign in</a>
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

        {/* Feature list card */}
        <div
          className="auth-right-stats"
          style={{ flexDirection: 'column' }}
        >
          <div className="stat-card" style={{ minWidth: 'auto' }}>
            <div className="stat-value">50K+</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>

        <div className="auth-right-content">
          <div className="auth-right-badge">
            <MapPin size={13} strokeWidth={2.5} />
            {current.badge}
          </div>

          <h2
            className="auth-right-title"
            style={{ whiteSpace: 'pre-line', animation: 'fadeInUp 0.6s ease 0.1s both' }}
          >
            {current.title}
          </h2>

          <p
            className="auth-right-subtitle"
            style={{ animation: 'fadeInUp 0.6s ease 0.2s both' }}
          >
            {current.sub}
          </p>

          {/* Feature bullets */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginTop: '1.25rem',
              animation: 'fadeInUp 0.6s ease 0.3s both',
            }}
          >
            {[
              'Real-time flood & traffic alerts',
              'Smart multi-route navigation',
              'City event discovery & notifications',
            ].map(f => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '0.875rem',
                }}
              >
                <CheckCircle size={15} strokeWidth={2.5} color="#34D399" />
                {f}
              </div>
            ))}
          </div>

          <div className="auth-right-dots" style={{ marginTop: '1.25rem' }}>
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