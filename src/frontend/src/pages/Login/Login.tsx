import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, MapPin, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
// CHỈ THÊM IMPORT NÀY:
import { GoogleLogin } from "@react-oauth/google";
import { showPremiumToast } from "../../utils/toastUtils";
import { usePreferenceStore } from "../../store/preferenceStore";

const slides = [
  {
    img: "https://images.pexels.com/photos/14435439/pexels-photo-14435439.jpeg",
    badge: "Bà Nà Hills · Đà Nẵng",
    title: "Chạm tới\nChân trời",
    sub: "Khám phá các sự kiện độc quyền và cảnh sắc ngoạn mục tại Cầu Vàng nổi tiếng.",
  },
  {
    img: "https://images.pexels.com/photos/2162459/pexels-photo-2162459.jpeg",
    badge: "Sông Hàn · Đà Nẵng",
    title: "Thành phố của\nNhững cây cầu",
    sub: "Tham gia các lễ hội ven sông và thưởng thức những màn phun lửa rực rỡ vào cuối tuần.",
  },
  {
    img: "https://images.pexels.com/photos/26550067/pexels-photo-26550067.jpeg",
    badge: "Biển Mỹ Khê",
    title: "Nắng vàng, Cát trắng\n& Sự kiện",
    sub: "Cập nhật nhanh nhất các buổi hòa nhạc trên biển, giải lướt sóng và marathon.",
  },
  {
    img: "https://i2.ex-cdn.com/crystalbay.com/files/content/2024/10/09/deo-hai-van-da-nang-kham-pha-cung-duong-deo-dep-nhat-viet-nam-2-1123.jpg",
    badge: "Đèo Hải Vân",
    title: "Cung đường\nThơ mộng",
    sub: "Tìm kiếm tuyến đường đẹp nhất và an toàn nhất cho những chuyến phượt ngoại ô.",
  },
  {
    img: "https://images.pexels.com/photos/33501215/pexels-photo-33501215.jpeg",
    badge: "Phố Cổ Hội An",
    title: "Văn hóa\nSôi động",
    sub: "Không bỏ lỡ đêm hội hoa đăng, phố lồng đèn và các hoạt động văn hóa đặc sắc.",
  },
];

export default function Login() {
  const [showPw, setShowPw] = useState(false);
  const [slide, setSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Tự động chuyển đổi hình ảnh slide mỗi 5 giây
  useEffect(() => {
    const id = setInterval(
      () => setSlide((s) => (s + 1) % slides.length),
      5000,
    );
    return () => clearInterval(id);
  }, []);

  // Reset preferences khi vào màn hình đăng nhập
  useEffect(() => {
    usePreferenceStore.getState().resetPreferences();
  }, []);

  const current = slides[slide];

  // ✅ Hoàn chỉnh handleLogin với try-catch-finally
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {

        // ================= XỬ LÝ TRƯỜNG HỢP YÊU CẦU 2FA (ADMIN) =================
        if (data.requires2FA) {
          // Lưu token tạm thời và email vào localStorage để dùng ở màn hình Verify2FA
          localStorage.setItem("temp_token", data.tempToken);
          localStorage.setItem("pending_user_email", data.email);

          // Chuyển hướng ngay sang trang xác minh mã 2FA
          window.location.href = `${import.meta.env.BASE_URL}verify-2fa`;
          return; // Dừng hàm lại ở đây
        }
        // =======================================================================
        // ĐĂNG NHẬP THƯỜNG (Đối với User hoặc Admin chưa bật 2FA)
        // ✅ Lưu token
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", data.role);

        // ✅ Lưu user info
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        // ✅ Redirect dựa trên role, giữ lại query parameters (như ?share=TOKEN)
        if (data.role === "admin") {
          window.location.href = `${import.meta.env.BASE_URL}admin/dashboard${window.location.search}`; // ← Admin dashboard
        } else {
          window.location.href = `${import.meta.env.BASE_URL}dashboard${window.location.search}`; // ← User dashboard
        }
      } else {
        // 🔴 THAY ĐỔI: Kiểm tra requiresEmailVerification
        if (data.requiresEmailVerification) {
          showPremiumToast(
            "Vui lòng xác minh email trước khi đăng nhập.",
            "warning"
          );

          window.location.href =
            `${import.meta.env.BASE_URL}verify-otp?email=${encodeURIComponent(email)}`;

          return;
        }
        setErrorMsg(data.message || "Email hoặc mật khẩu không chính xác!");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* ── CỘT TRÁI: FORM ĐĂNG NHẬP ── */}
      <div className="auth-left">
        <div className="auth-left-inner">
          {/* Logo */}
          <Link to="/" className="auth-logo">
            <div className="auth-logo-icon">
              <Navigation size={20} color="#fff" />
            </div>
            <span className="auth-logo-text">
              DaNang <span>EventMap</span>
            </span>
          </Link>

          <h1 className="auth-heading">Chào mừng quay trở lại 👋</h1>
          <p className="auth-subheading">
            Đăng nhập tài khoản của bạn để tiếp tục khám phá.
          </p>

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                color: "#ef4444",
                backgroundColor: "#fef2f2",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "15px",
                fontSize: "14px",
                border: "1px solid #fecaca",
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email Input */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Mail size={17} />
                </span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={17} />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="form-row">
              <label className="remember-label">
                <input type="checkbox" id="remember-me" />
                Ghi nhớ đăng nhập
              </label>
              <Link to="/forgot-password" className="link-forgot">
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          {/* ================= PHẦN CHỈ THÊM MỚI TẠI ĐÂY ================= */}
          <div className="divider">Hoặc đăng nhập với Google</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  setLoading(true);
                  const res = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/google`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        token: credentialResponse.credential,
                      }),
                    },
                  );
                  const data = await res.json();

                  if (res.ok) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("userRole", data.role);
                    if (data.user) {
                      localStorage.setItem("user", JSON.stringify(data.user));
                    }
                    window.location.href =
                      data.role === "admin"
                        ? `${import.meta.env.BASE_URL}admin/dashboard${window.location.search}`
                        : `${import.meta.env.BASE_URL}dashboard${window.location.search}`;
                  } else {
                    setErrorMsg(data.message || "Đăng nhập Google thất bại");
                  }
                } catch (err) {
                  setErrorMsg("Không thể kết nối đến máy chủ.");
                } finally {
                  setLoading(false);
                }
              }}
              onError={() =>
                setErrorMsg("Đăng nhập Google bị lỗi, vui lòng thử lại!")
              }
            />
          </div>
          {/* ================= KẾT THÚC PHẦN THÊM MỚI ================= */}

          {/* Sign Up Link */}
          <p className="auth-bottom-text">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        </div>
      </div>

      {/* ── CỘT PHẢI: BANNER ── */}
      <div className="auth-right">
        <img
          key={slide}
          src={current.img}
          alt={current.badge}
          className="auth-right-img"
          style={{ animation: "fadeInUp 0.8s ease both" }}
        />
        <div className="auth-right-overlay" />

        {/* Stats */}
        <div className="auth-right-stats">
          <div className="stat-card">
            <div className="stat-value">500+</div>
            <div className="stat-label">Sự Kiện Hàng Năm</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">4.9 ★</div>
            <div className="stat-label">Đánh Giá</div>
          </div>
        </div>

        {/* Content */}
        <div className="auth-right-content">
          <div className="auth-right-badge">
            <MapPin size={13} />
            {current.badge}
          </div>

          <h2 className="auth-right-title" style={{ whiteSpace: "pre-line" }}>
            {current.title}
          </h2>

          <p className="auth-right-subtitle">{current.sub}</p>

          {/* Slide Dots */}
          <div className="auth-right-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`dot${i === slide ? " active" : ""}`}
                style={{ border: "none", cursor: "pointer", padding: 0 }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
