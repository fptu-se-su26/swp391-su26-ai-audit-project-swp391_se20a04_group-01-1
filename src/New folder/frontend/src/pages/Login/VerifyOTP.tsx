import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { authAPI } from "../../services/api";
import { showPremiumToast } from "../../utils/toastUtils";

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(60);

  // Countdown
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Tự động xác minh khi đủ 6 số
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify(null);
    }
  }, [otp]);

  const handleVerify = async (e: React.FormEvent | null) => {
    if (e) e.preventDefault();

    if (otp.length !== 6) return;

    setErrorMsg("");
    setLoading(true);

    try {
      await authAPI.verifyRegisterOTP(email, otp);

      showPremiumToast(
        "Xác minh email thành công! Đang chuyển hướng...",
        "success"
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Mã OTP không hợp lệ hoặc đã hết hạn."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setSending(true);

    try {
      await authAPI.resendRegisterOTP(email);

      showPremiumToast("Mã OTP mới đã được gửi lại.", "success");

      setCountdown(60);
    } catch (err: any) {
      showPremiumToast(
        err.response?.data?.message || "Lỗi gửi lại OTP.",
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-left-inner">

          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-50 rounded-full">
              <ShieldCheck
                size={48}
                className="text-emerald-500"
              />
            </div>
          </div>

          <h1 className="auth-heading">
            Xác minh Email
          </h1>

          <p className="auth-subheading">
            Nhập mã xác thực gửi tới:
          </p>

          <p className="font-bold text-blue-600 mb-6 text-center break-all">
            {email}
          </p>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-6 text-sm text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="form-group">

              <label className="form-label">
                Mã OTP
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  <Mail size={18} />
                </span>

                <input
                  className="form-input text-center text-2xl tracking-[0.5em] font-bold"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={otp}
                  required
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                    setOtp(value);

                    if (errorMsg) {
                      setErrorMsg("");
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();

                    const value = e.clipboardData
                      .getData("text")
                      .replace(/\D/g, "")
                      .slice(0, 6);

                    setOtp(value);

                    if (errorMsg) {
                      setErrorMsg("");
                    }
                  }}
                />

              </div>
            </div>

            <button
              className="btn-primary w-full mt-5"
              type="submit"
              disabled={loading || otp.length !== 6}
            >
              {loading
                ? "Đang xác minh..."
                : "Xác minh tài khoản"}
            </button>

          </form>

          <div className="mt-6 text-center">

            {countdown > 0 ? (
              <p className="text-gray-500 text-sm">
                Gửi lại mã sau <strong>{countdown}s</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={sending}
                className="flex items-center justify-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors w-full"
              >
                <RefreshCw size={16} />

                {sending
                  ? "Đang gửi..."
                  : "Gửi lại mã OTP"}

              </button>
            )}

          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">

            <Link
              to="/login"
              className="text-gray-500 hover:text-blue-600 flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>

          </div>

        </div>
      </div>

      {/* Right Side */}
      <div className="auth-right">
        <img
          src="https://images.pexels.com/photos/2162459/pexels-photo-2162459.jpeg"
          alt="Xác minh OTP"
          className="auth-right-img"
        />
        <div className="auth-right-overlay" />
        
        <div className="auth-right-content flex flex-col justify-end items-start text-left">
          <div className="auth-right-badge">
            <ShieldCheck size={13} fill="currentColor" className="text-white fill-none" />
            Xác thực OTP
          </div>

          <h2 className="auth-right-title">
            Bảo mật tài khoản
          </h2>

          <p className="auth-right-subtitle">
            Mã OTP có hiệu lực trong 5 phút. Nếu không thấy thư trong hộp thư đến, hãy kiểm tra mục Spam hoặc Junk.
          </p>
        </div>
      </div>
    </div>
  );
}