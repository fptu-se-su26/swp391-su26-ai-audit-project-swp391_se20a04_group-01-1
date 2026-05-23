import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Navigation, RefreshCw, ShieldCheck } from 'lucide-react';

// ── Step indicator ─────────────────────────────────────────────────────
const STEPS = [
  { label: 'Email' },
  { label: 'Verify' },
  { label: 'Reset' },
];

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
          aria-label={`OTP digit ${i + 1}`}
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

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['', '#EF4444', '#F59E0B', '#10B981', '#059669'];
const segmentClass = ['', 'weak', 'fair', 'good', 'strong'];

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

  // Resend countdown
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

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    setCountdown(60);
    setCanResend(false);
    // TODO: call API to resend OTP
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

        {/* ── STEP 1 — Email ── */}
        {step === 1 && !done && (
          <div className="animate-fade-up">
            <div className="step-icon-wrapper email">
              <Mail size={28} color="#2563EB" strokeWidth={1.75} />
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              marginBottom: '0.375rem',
            }}>
              Forgot Password?
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: '1.75rem',
              lineHeight: 1.55,
            }}>
              No worries! Enter your email address and we'll send you a 6-digit verification code.
            </p>

            <form onSubmit={e => { e.preventDefault(); setStep(2); }}>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={17} strokeWidth={2} /></span>
                  <input
                    id="fp-email"
                    type="email"
                    className="form-input"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <button type="submit" id="fp-send-btn" className="btn-primary" style={{ marginTop: '0.25rem' }}>
                Send Verification Code
              </button>
            </form>

            <div className="forgot-footer">
              <a href="/login">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ArrowLeft size={13} strokeWidth={2.5} />
                  Back to Sign In
                </span>
              </a>
              <div className="forgot-footer-sep" />
              <a href="/register">Don't have an account?{' '}<strong>Sign up</strong></a>
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
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              marginBottom: '0.375rem',
            }}>
              Check Your Email
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: '0.375rem',
              lineHeight: 1.55,
            }}>
              We sent a 6-digit code to
            </p>
            <p style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--primary)',
              textAlign: 'center',
              marginBottom: '0.25rem',
            }}>
              {email}
            </p>

            <form onSubmit={e => { e.preventDefault(); if (otpComplete) setStep(3); }}>
              <OtpInput value={otp} onChange={setOtp} />

              <button
                type="submit"
                id="fp-verify-btn"
                className="btn-primary"
                disabled={!otpComplete}
                style={{ opacity: otpComplete ? 1 : 0.5, cursor: otpComplete ? 'pointer' : 'not-allowed' }}
              >
                Verify Code
              </button>
            </form>

            <div className="resend-row" style={{ marginTop: '1rem' }}>
              {canResend ? (
                <>
                  Didn't receive it?{' '}
                  <button className="resend-btn" onClick={handleResend}>
                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 3 }} />
                    Resend code
                  </button>
                </>
              ) : (
                <>
                  Resend code in{' '}
                  <strong style={{ color: 'var(--primary)' }}>0:{countdown.toString().padStart(2, '0')}</strong>
                </>
              )}
            </div>

            <div className="forgot-footer">
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.8375rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <ArrowLeft size={13} strokeWidth={2.5} /> Back
              </button>
              <div className="forgot-footer-sep" />
              <a href="/login">Sign In</a>
              <div className="forgot-footer-sep" />
              <a href="/register">Sign up</a>
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
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              marginBottom: '0.375rem',
            }}>
              Set New Password
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: '1.75rem',
              lineHeight: 1.55,
            }}>
              Your new password must be different from previously used passwords.
            </p>

            <form onSubmit={e => { e.preventDefault(); if (pwMatch) setDone(true); }}>
              {/* New password */}
              <div className="form-group">
                <label className="form-label" htmlFor="fp-newpw">New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                  <input
                    id="fp-newpw"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min 8 characters"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-suffix-btn"
                    onClick={() => setShowPw(v => !v)}
                  >
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

              {/* Confirm password */}
              <div className="form-group">
                <label className="form-label" htmlFor="fp-confirm">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={17} strokeWidth={2} /></span>
                  <input
                    id="fp-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter new password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ borderColor: pwMismatch ? '#EF4444' : pwMatch ? '#10B981' : undefined }}
                  />
                  <button
                    type="button"
                    className="input-suffix-btn"
                    onClick={() => setShowConfirm(v => !v)}
                  >
                    {showConfirm ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                  </button>
                  {pwMatch && (
                    <span style={{ position: 'absolute', right: '2.5rem', top: '50%', transform: 'translateY(-50%)', color: '#10B981', display: 'flex' }}>
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

              <button
                type="submit"
                id="fp-reset-btn"
                className="btn-primary"
                disabled={!pwMatch}
                style={{ marginTop: '0.25rem', opacity: pwMatch ? 1 : 0.5, cursor: pwMatch ? 'pointer' : 'not-allowed' }}
              >
                Reset Password
              </button>
            </form>

            <div className="forgot-footer">
              <a href="/login">Sign In</a>
              <div className="forgot-footer-sep" />
              <a href="/register">Sign up</a>
            </div>
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {done && (
          <div className="animate-scale" style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#F0FDF4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <CheckCircle size={36} color="#10B981" strokeWidth={2} />
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
            }}>
              Password Reset! 🎉
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              marginBottom: '1.75rem',
            }}>
              Your password has been changed successfully. You can now sign in with your new password.
            </p>

            <a
              href="/login"
              id="fp-go-login-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                height: 48,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9375rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              Back to Sign In
            </a>

            <div className="forgot-footer">
              <a href="/register">Don't have an account? <strong>Sign up</strong></a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}