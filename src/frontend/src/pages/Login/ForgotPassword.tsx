import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Navigation, RefreshCw, ShieldCheck } from 'lucide-react';
import { forgotPasswordAPI } from '../../services/api'; // Đảm bảo đường dẫn này đúng với dự án của bạn

// ── Step indicator ─────────────────────────────────────────────────────
const STEPS = [
  { label: 'Email' },
  { label: 'Xác thực' },
  { label: 'Đặt lại' },
];

const strengthLabels = ['', 'Yêu', 'Trung bình', 'Khá', 'Mạnh'];
const strengthColors = ['', '#EF4444', '#F59E0B', '#10B981', '#059669'];
const segmentClass = ['', 'weak', 'fair', 'good', 'strong'];

// ── OTP digit input ────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const handleKey = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[i] = ch;
    onChange(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      onChange(text.split(''));
      refs.current[5]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="otp-inputs">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          className={`otp-input${digit ? ' filled' : ''}`}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          onPaste={i === 0 ? handlePaste : undefined}
          id={`otp-digit-${i}`}
          aria-label={`Mã OTP số ${i + 1}`}
        />
      ))}
    </div>
  );
}

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

// ── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [done, setDone] = useState(false);
  
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── RESEND COUNTDOWN LOGIC ──
  useEffect(() => {
    if (step !== 2) return;
    setCountdown(60);
    setCanResend(false);
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(tick);
          setCanResend(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [step]);

  const otpComplete = otp.every(d => d !== '');
  const strength = getStrength(newPw);
  const pwMatch = confirmPw && newPw === confirmPw;
  const pwMismatch = confirmPw && newPw !== confirmPw;

  // ✅ BƯỚC 1: Gửi OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await forgotPasswordAPI.sendOtp(email);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Lỗi gửi OTP, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ BƯỚC 2: Xác thực OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpComplete) return;
    setErrorMsg('');
    setLoading(true);
    try {
      await forgotPasswordAPI.verifyOtp(email, otp.join(''));
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ BƯỚC 3: Đặt lại Mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwMatch) return;
    setErrorMsg('');
    setLoading(true);
    try {
      await forgotPasswordAPI.resetPassword(email, newPw);
      setDone(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Lỗi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Gửi lại OTP
  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setCountdown(60);
    setCanResend(false);
    setErrorMsg('');
    try {
      await forgotPasswordAPI.resendOtp(email);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Lỗi gửi lại OTP.');
    }
  };

  return (
    <div className="forgot-wrapper">
      <div className="forgot-card animate-scale">
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            marginBottom: '1.75rem',
          }}
        >
          <div className="auth-logo-icon" style={{ width: 36, height: 36 }}>
            <Navigation size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="auth-logo-text" style={{ fontSize: '1.125rem' }}>
            DaNang <span>EventMap</span>
          </span>
        </div>

        {/* Step indicator */}
        <div className="steps-indicator">
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone = step > num;
            return (
              <div key={i} className="step-item">
                <div className={`step-circle${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                  {isDone ? <CheckCircle size={16} strokeWidth={2.5} /> : num}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`step-line${isDone ? ' done' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Hiển thị lỗi chung cho tất cả các bước */}
        {errorMsg && (
          <div className="animate-fade-up" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', border: '1px solid #fecaca', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* ── STEP 1 — Email ── */}
        {step === 1 && !done && (
          <div className="animate-fade-up">
            <div className="step-icon-wrapper email">
              <Mail size={28} color="#2563EB" strokeWidth={1.75} />
            </div>

            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)',
              textAlign: 'center', letterSpacing: '-0.02em', marginBottom: '0.375rem',
            }}>
              Quên mật khẩu?
            </h2>
            <p style={{
              fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center',
              marginBottom: '1.75rem', lineHeight: 1.55,
            }}>
              Đừng lo lắng! Nhập địa chỉ email của bạn và chúng tôi sẽ gửi mã xác thực gồm 6 chữ số.
            </p>

            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">Địa chỉ Email</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={17} strokeWidth={2} /></span>
                  <input
                    id="fp-email"
                    type="email"
                    className="form-input"
                    placeholder="Nhập email đã đăng ký"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <button type="submit" id="fp-send-btn" className="btn-primary" disabled={loading} style={{ marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
              </button>
            </form>

            <div className="forgot-footer">
              <Link to="/login">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ArrowLeft size={13} strokeWidth={2.5} /> Quay lại Đăng nhập
                </span>
              </Link>
              <div className="forgot-footer-sep" />
              <Link to="/register">Chưa có tài khoản? <strong>Đăng ký</strong></Link>
            </div>
          </div>
        )}

        {/* ── STEP 2 — OTP ── */}
        {step === 2 && !done && (
          <div className="animate-fade-up">
            <div className="step-icon-wrapper otp">
              <ShieldCheck size={28} color="#10B981" strokeWidth={1.75} />
            </div>

            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)',
              textAlign: 'center', letterSpacing: '-0.02em', marginBottom: '0.375rem',
            }}>
              Kiểm tra Email
            </h2>
            <p style={{
              fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center',
              marginBottom: '0.375rem', lineHeight: 1.55,
            }}>
              Chúng tôi đã gửi mã xác thực gồm 6 chữ số tới
            </p>
            <p style={{
              fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)',
              textAlign: 'center', marginBottom: '0.25rem',
            }}>
              {email}
            </p>

            <form onSubmit={handleVerifyOtp}>
              <OtpInput value={otp} onChange={setOtp} />

              <button
                type="submit"
                id="fp-verify-btn"
                className="btn-primary"
                disabled={!otpComplete || loading}
                style={{ opacity: (otpComplete && !loading) ? 1 : 0.5, cursor: (otpComplete && !loading) ? 'pointer' : 'not-allowed' }}
              >
                {loading ? 'Đang xác thực...' : 'Xác thực mã'}
              </button>
            </form>

            <div className="resend-row" style={{ marginTop: '1rem' }}>
              {canResend ? (
                <>
                  Không nhận được mã?{' '}
                  <button className="resend-btn" onClick={handleResend}>
                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 3 }} /> Gửi lại mã
                  </button>
                </>
              ) : (
                <>
                  Gửi lại mã sau <strong style={{ color: 'var(--primary)' }}>0:{countdown.toString().padStart(2, '0')}</strong>
                </>
              )}
            </div>

            <div className="forgot-footer">
              <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8375rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                <ArrowLeft size={13} strokeWidth={2.5} /> Quay lại
              </button>
              <div className="forgot-footer-sep" />
              <Link to="/login">Đăng nhập</Link>
            </div>
          </div>
        )}

        {/* ── STEP 3 — New Password ── */}
        {step === 3 && !done && (
          <div className="animate-fade-up">
            <div className="step-icon-wrapper password">
              <Lock size={28} color="#D97706" strokeWidth={1.75} />
            </div>

            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)',
              textAlign: 'center', letterSpacing: '-0.02em', marginBottom: '0.375rem',
            }}>
              Đặt mật khẩu mới
            </h2>
            <p style={{
              fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center',
              marginBottom: '1.75rem', lineHeight: 1.55,
            }}>
              Mật khẩu mới của bạn phải khác với các mật khẩu đã sử dụng trước đó.
            </p>

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-newpw">Mật khẩu mới</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                  <input
                    id="fp-newpw"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Tối thiểu 8 ký tự"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="input-suffix-btn" onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                  </button>
                </div>
                {newPw && (
                  <div style={{ marginTop: '0.375rem' }}>
                    <div className="strength-bar">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className={`strength-segment${strength >= n ? ` ${segmentClass[strength]}` : ''}`} />
                      ))}
                    </div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: strengthColors[strength], marginTop: '0.25rem' }}>
                      {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fp-confirm">Xác nhận mật khẩu</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                  <input
                    id="fp-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ borderColor: pwMismatch ? '#EF4444' : pwMatch ? '#10B981' : undefined }}
                  />
                  <button type="button" className="input-suffix-btn" onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                  </button>
                  {pwMatch && (
                    <span style={{ position: 'absolute', right: '2.5rem', top: '50%', transform: 'translateY(-50%)', color: '#10B981', display: 'flex' }}>
                      <CheckCircle size={16} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                {pwMismatch && (
                  <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.25rem' }}>Mật khẩu không khớp</p>
                )}
              </div>

              <button
                type="submit"
                id="fp-reset-btn"
                className="btn-primary"
                disabled={!pwMatch || loading}
                style={{ marginTop: '0.25rem', opacity: (pwMatch && !loading) ? 1 : 0.5, cursor: (pwMatch && !loading) ? 'pointer' : 'not-allowed' }}
              >
                {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {done && (
          <div className="animate-scale" style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={36} color="#10B981" strokeWidth={2} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Đặt lại mật khẩu thành công! 🎉
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.75rem' }}>
              Mật khẩu của bạn đã được thay đổi thành công. Bây giờ bạn đã có thể đăng nhập bằng mật khẩu mới.
            </p>
            <Link
              to="/login"
              id="fp-go-login-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', height: 48, borderRadius: 10, background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)', color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', transition: 'all 0.2s ease' }}
            >
              Quay lại Đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}