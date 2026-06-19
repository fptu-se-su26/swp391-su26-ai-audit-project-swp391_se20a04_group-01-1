import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Mail, UserCircle, Navigation, MapPin, CheckCircle } from 'lucide-react';
import { authAPI } from '../../services/api';

// ── Right panel slides ─────────────────────────────────────────────────
const slides = [
  {
    img: 'https://images.pexels.com/photos/34373624/pexels-photo-34373624.jpeg',
    badge: 'Cầu Rồng · Đà Nẵng',
    title: 'Địa danh\nBiểu tượng',
    sub: 'Chiêm ngưỡng toàn cảnh Cầu Rồng vươn mình tráng lệ từ trên cao và không bỏ lỡ các sự kiện đôi bờ sông Hàn.',
  },
  {
    img: 'https://images.pexels.com/photos/36761634/pexels-photo-36761634.jpeg',
    badge: 'Thành phố Đà Nẵng',
    title: 'Thành phố\nÁnh sáng',
    sub: 'Thu trọn vẻ đẹp lung linh của thành phố vào tầm mắt và khám phá những tuyến phố đi bộ nhộn nhịp về đêm.',
  }
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

const strengthLabels = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
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
    e.preventDefault(); 
    setErrorMsg('');

    if (pwMismatch) {
      setErrorMsg('Mật khẩu nhập lại không khớp!');
      return;
    }

    setLoading(true);

    try {
      // Sử dụng authAPI từ file api.ts
      await authAPI.register(form.username, form.email, form.password);
      
      alert('Tạo tài khoản thành công! Hãy đăng nhập nhé.');
      window.location.href = `${import.meta.env.BASE_URL}login`;
} catch (err: any) {
      console.error(err);
      // Lấy câu thông báo lỗi từ backend trả về
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng thử lại!');
      }
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
          <h1 className="auth-heading animate-fade-up delay-1">Tạo tài khoản ✨</h1>
          <p className="auth-subheading animate-fade-up delay-2">
            Tham gia cùng hàng ngàn người khám phá sự kiện và định vị thông minh.
          </p>

          {/* Khung báo lỗi màu đỏ nếu đăng ký thất bại */}
          {errorMsg && (
            <div className="animate-fade-up delay-2" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', border: '1px solid #fecaca' }}>
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister}>
            {/* Username */}
            <div className="form-group animate-fade-up delay-2">
              <label className="form-label" htmlFor="reg-username">Tên đăng nhập</label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={17} strokeWidth={2} /></span>
                <input
                  id="reg-username"
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: johndoe123"
                  value={form.username}
                  onChange={set('username')}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group animate-fade-up delay-2">
              <label className="form-label" htmlFor="reg-email">Địa chỉ Email</label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={17} strokeWidth={2} /></span>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  required
                />
              </div>
</div>

            {/* Full name */}
            <div className="form-group animate-fade-up delay-3">
              <label className="form-label" htmlFor="reg-fullname">Họ và tên</label>
              <div className="input-wrapper">
                <span className="input-icon"><UserCircle size={17} strokeWidth={2} /></span>
                <input
                  id="reg-fullname"
                  type="text"
                  className="form-input"
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={set('fullName')}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group animate-fade-up delay-3">
              <label className="form-label" htmlFor="reg-password">Mật khẩu</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Ẩn' : 'Hiện'}
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
              <label className="form-label" htmlFor="reg-confirm">Xác nhận mật khẩu</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Nhập lại mật khẩu"
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
                  aria-label={showConfirm ? 'Ẩn' : 'Hiện'}
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
                  Mật khẩu nhập lại không khớp
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
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>

          {/* Bottom link */}
          <p className="auth-bottom-text animate-fade-up delay-6">
            Đã có tài khoản?{' '}
            <Link to="/login">Đăng nhập</Link>
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
            <div className="stat-label">Người Dùng Hoạt Động</div>
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
              'Cảnh báo ngập lụt & giao thông thời gian thực',
              'Định tuyến thông minh đa lộ trình',
              'Khám phá & nhận thông báo sự kiện thành phố',
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
