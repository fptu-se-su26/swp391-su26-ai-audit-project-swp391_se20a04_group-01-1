import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, Variants } from 'framer-motion';
import {
    MapPin, Calendar, CloudRain, Navigation, Compass,
    AlertTriangle, Bookmark, Map, ArrowRight, Menu, X,
    Mail, Phone, MapPinned,
    Star, Users, Zap, Shield, ChevronDown,
    Send, CheckCircle
} from 'lucide-react';

// Brand icons removed from lucide-react v0.294+
const Facebook = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
);

const Github = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className}>
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
);

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' } }
};
const fadeLeft: Variants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: 'easeOut' } }
};
const fadeRight: Variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: 'easeOut' } }
};
const staggerChildren: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } }
};

// ─── Animated Section Wrapper ─────────────────────────────────────────────────
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });
    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={staggerChildren}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ─── Nav Links ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
    { label: 'Giới thiệu tổng quan', href: '#overview' },
    { label: 'Các chức năng', href: '#features' },
    { label: 'Liên hệ hỗ trợ', href: '#contact' },
];

// ─── Features Data ────────────────────────────────────────────────────────────
const FEATURES = [
    {
        icon: Calendar,
        color: 'from-blue-500 to-blue-600',
        glow: 'shadow-blue-500/30',
        border: 'border-blue-500/30',
        title: 'Bản đồ Sự kiện Real-time',
        desc: 'Xem ngay các lễ hội, triển lãm, concert và sự kiện thể thao đang diễn ra gần bạn trên bản đồ tương tác.',
        img: '/images/feature_events_map.png',
        badge: 'Phổ biến nhất',
    },
    {
        icon: CloudRain,
        color: 'from-cyan-500 to-teal-500',
        glow: 'shadow-cyan-500/30',
        border: 'border-cyan-500/30',
        title: 'Cảnh báo Ngập lụt',
        desc: 'Hiển thị vùng ngập theo thời gian thực với màu sắc phân cấp độ sâu, giúp bạn tránh các khu vực nguy hiểm.',
        img: '/images/feature_routing.png',
        badge: 'An toàn',
    },
    {
        icon: Navigation,
        color: 'from-violet-500 to-purple-600',
        glow: 'shadow-violet-500/30',
        border: 'border-violet-500/30',
        title: 'Tìm đường Thông minh',
        desc: 'Tính toán lộ trình tối ưu, tự động né ngập lụt và kẹt xe, hỗ trợ đa phương tiện: ô tô, xe máy, đi bộ.',
        img: '/images/feature_routing.png',
        badge: 'AI Powered',
    },
    {
        icon: Compass,
        color: 'from-orange-500 to-amber-500',
        glow: 'shadow-orange-500/30',
        border: 'border-orange-500/30',
        title: 'Điểm tham quan (POI)',
        desc: 'Khám phá nhà hàng, khách sạn, bảo tàng, điểm giải trí và ATM gần nhất với thông tin chi tiết đầy đủ.',
        img: '/images/feature_events_map.png',
        badge: '500+ POIs',
    },
    {
        icon: AlertTriangle,
        color: 'from-red-500 to-rose-500',
        glow: 'shadow-red-500/30',
        border: 'border-red-500/30',
        title: 'Cảnh báo Giao thông',
        desc: 'Báo cáo ùn tắc, tai nạn và sự cố giao thông từ cộng đồng, được xác thực và hiển thị ngay lập tức.',
        img: '/images/feature_routing.png',
        badge: 'Cộng đồng',
    },
    {
        icon: Bookmark,
        color: 'from-emerald-500 to-green-500',
        glow: 'shadow-emerald-500/30',
        border: 'border-emerald-500/30',
        title: 'Lưu & Chia sẻ lộ trình',
        desc: 'Lưu các tuyến đường yêu thích, chia sẻ với bạn bè qua link và xem lại lộ trình bất kỳ lúc nào.',
        img: '/images/feature_routing.png',
        badge: 'Tiện lợi',
    },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
    { value: '500+', label: 'Sự kiện mỗi tháng', icon: Calendar },
    { value: '50+', label: 'Điểm POI nổi bật', icon: Compass },
    { value: 'Real-time', label: 'Cập nhật liên tục', icon: Zap },
    { value: '100%', label: 'Miễn phí sử dụng', icon: Star },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapIntroducePage() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
    const [formSubmitted, setFormSubmitted] = useState(false);

    const isLoggedIn = !!localStorage.getItem('token');

    // Scroll tracking for navbar
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 30);

            const sections = ['overview', 'features', 'contact'];
            for (const id of sections) {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 100 && rect.bottom >= 100) {
                        setActiveSection(id);
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (href: string) => {
        setMenuOpen(false);
        const id = href.replace('#', '');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitted(true);
        setTimeout(() => setFormSubmitted(false), 4000);
        setContactForm({ name: '', email: '', message: '' });
    };

    return (
        <div className="relative min-h-screen w-full bg-[#080d1a] text-white font-sans overflow-x-hidden selection:bg-blue-500 selection:text-white">

            {/* ──────────────────────────────────────────────────────────────────
                STICKY NAVBAR
            ────────────────────────────────────────────────────────────────── */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? 'bg-[#080d1a]/90 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
                        : 'bg-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">

                    {/* Logo */}
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-2.5 shrink-0"
                    >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)]">
                            <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-extrabold tracking-tight">
                            DaNang<span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">EventMap</span>
                        </span>
                    </button>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map((link) => {
                            const sectionId = link.href.replace('#', '');
                            const isActive = activeSection === sectionId;
                            return (
                                <button
                                    key={link.href}
                                    onClick={() => scrollTo(link.href)}
                                    className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'text-white bg-white/10'
                                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {link.label}
                                    {isActive && (
                                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-2.5">
                        {isLoggedIn ? (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 text-sm font-semibold text-white px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_15px_rgba(37,99,235,0.4)] transition-all duration-200 hover:scale-[1.03]"
                            >
                                <Map className="w-4 h-4" />
                                Vào bản đồ
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-sm font-semibold text-gray-200 px-4 py-2 rounded-full border border-white/15 hover:border-white/40 hover:bg-white/5 transition-all duration-200"
                                >
                                    Đăng nhập
                                </button>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="text-sm font-semibold text-white px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_15px_rgba(37,99,235,0.4)] transition-all duration-200 hover:scale-[1.03]"
                                >
                                    Đăng ký
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="md:hidden bg-[#0d1528]/95 backdrop-blur-xl border-b border-white/10 px-4 pb-5 pt-2 space-y-1"
                    >
                        {NAV_LINKS.map((link) => (
                            <button
                                key={link.href}
                                onClick={() => scrollTo(link.href)}
                                className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {link.label}
                            </button>
                        ))}
                        <div className="pt-3 flex flex-col gap-2">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full text-sm font-semibold py-2.5 rounded-xl border border-white/15 text-gray-200 hover:bg-white/5"
                            >
                                Đăng nhập
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full text-sm font-semibold py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                            >
                                Đăng ký miễn phí
                            </button>
                        </div>
                    </motion.div>
                )}
            </header>

            {/* ──────────────────────────────────────────────────────────────────
                HERO SECTION
            ────────────────────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
                    style={{ backgroundImage: "url('/images/hero_danang_night.png')" }}
                />
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/75 via-[#080d1a]/50 to-[#080d1a]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a]/60 via-transparent to-[#080d1a]/30" />

                {/* Glowing blobs */}
                <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-16">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-medium mb-8 backdrop-blur-sm"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        Bản đồ thông minh — Đà Nẵng 2026
                    </motion.div>

                    {/* Heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15 }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold tracking-tight leading-tight md:leading-none mb-6"
                    >
                        Khám phá thành phố
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                            theo cách của bạn
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-10 font-light"
                    >
                        Nền tảng bản đồ GIS thông minh kết hợp AI — cảnh báo ngập lụt, sự kiện thành phố,
                        tìm đường tối ưu và điểm tham quan ngay trên một ứng dụng.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.45 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button
                            onClick={() => navigate(isLoggedIn ? '/dashboard' : '/register')}
                            className="group flex items-center gap-2.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white font-semibold text-base px-8 py-4 rounded-full shadow-[0_8px_30px_rgba(37,99,235,0.45)] hover:shadow-[0_10px_40px_rgba(37,99,235,0.65)] hover:scale-[1.04] transition-all duration-300"
                        >
                            <Map className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                            {isLoggedIn ? 'Vào bản đồ ngay' : 'Bắt đầu miễn phí'}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                        <button
                            onClick={() => scrollTo('#overview')}
                            className="flex items-center gap-2 bg-white/5 border border-white/20 hover:border-white/50 hover:bg-white/10 text-white font-semibold text-base px-8 py-4 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-[1.03]"
                        >
                            Tìm hiểu thêm
                            <ChevronDown className="w-4 h-4 animate-bounce" />
                        </button>
                    </motion.div>

                    {/* Trust badges */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400"
                    >
                        {[
                            { icon: Shield, text: 'Hoàn toàn miễn phí' },
                            { icon: Zap, text: 'Cập nhật real-time' },
                            { icon: Users, text: 'Cộng đồng người dùng' },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-1.5">
                                <Icon className="w-4 h-4 text-blue-400" />
                                <span>{text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500 text-xs"
                >
                    <span>Cuộn xuống</span>
                    <div className="w-5 h-9 rounded-full border border-gray-500/50 flex items-start justify-center pt-1.5">
                        <div className="w-1 h-2.5 rounded-full bg-blue-400 animate-bounce" />
                    </div>
                </motion.div>
            </section>

            {/* ──────────────────────────────────────────────────────────────────
                OVERVIEW SECTION
            ────────────────────────────────────────────────────────────────── */}
            <section id="overview" className="relative py-16 md:py-28 px-4 sm:px-6 lg:px-10 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <div className="absolute -top-32 right-0 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none" />

                <div className="max-w-7xl mx-auto">
                    {/* Section label */}
                    <AnimatedSection className="text-center mb-12 md:mb-20">
                        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-5">
                            <MapPin className="w-3.5 h-3.5" />
                            Giới thiệu tổng quan
                        </motion.div>
                        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
                            Bản đồ thông minh cho
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Đà Nẵng hiện đại</span>
                        </motion.h2>
                        <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            DaNang EventMap là nền tảng GIS thế hệ mới, kết hợp dữ liệu thực tế và trí tuệ nhân tạo
                            để mang đến trải nghiệm di chuyển và khám phá thành phố hoàn toàn mới.
                        </motion.p>
                    </AnimatedSection>

                    {/* Main content: text + image */}
                    <div className="grid lg:grid-cols-2 gap-10 md:gap-16 items-center mb-16 md:mb-24">
                        {/* Text side */}
                        <AnimatedSection>
                            <motion.div variants={fadeLeft} className="space-y-4 md:space-y-6">
                                {[
                                    {
                                        icon: Map,
                                        color: 'text-blue-400',
                                        bg: 'bg-blue-500/10 border-blue-500/20',
                                        title: 'Hệ thống GIS tích hợp toàn diện',
                                        desc: 'Tích hợp dữ liệu địa lý, sự kiện, giao thông và thời tiết vào một bản đồ duy nhất, dễ sử dụng.'
                                    },
                                    {
                                        icon: Zap,
                                        color: 'text-cyan-400',
                                        bg: 'bg-cyan-500/10 border-cyan-500/20',
                                        title: 'Cập nhật dữ liệu thời gian thực',
                                        desc: 'Mọi cảnh báo ngập lụt, ùn tắc và sự kiện đều được đồng bộ ngay lập tức từ nhiều nguồn tin cậy.'
                                    },
                                    {
                                        icon: Shield,
                                        color: 'text-violet-400',
                                        bg: 'bg-violet-500/10 border-violet-500/20',
                                        title: 'An toàn & Bảo mật tuyệt đối',
                                        desc: 'Dữ liệu cá nhân được mã hóa, xác thực 2 lớp và tuân thủ các tiêu chuẩn bảo mật quốc tế.'
                                    },
                                ].map(({ icon: Icon, color, bg, title, desc }) => (
                                    <div key={title} className={`flex gap-4 p-5 rounded-2xl bg-white/3 border ${bg} backdrop-blur-sm`}>
                                        <div className={`shrink-0 w-11 h-11 rounded-xl border ${bg} flex items-center justify-center`}>
                                            <Icon className={`w-5 h-5 ${color}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white mb-1">{title}</h3>
                                            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </AnimatedSection>

                        {/* Image side */}
                        <AnimatedSection>
                            <motion.div variants={fadeRight} className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-3xl blur-2xl" />
                                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                    <img
                                        src="/images/overview_map_dashboard.png"
                                        alt="DaNang EventMap Dashboard"
                                        className="w-full object-cover aspect-[4/3]"
                                    />
                                    {/* Overlay badge */}
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="bg-[#080d1a]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-sm font-medium text-gray-200">Đang cập nhật dữ liệu thực tế</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatedSection>
                    </div>

                    {/* Stats */}
                    <AnimatedSection>
                        <motion.div variants={staggerChildren} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {STATS.map(({ value, label, icon: Icon }) => (
                                <motion.div
                                    key={label}
                                    variants={fadeUp}
                                    className="group relative p-6 rounded-2xl bg-white/3 border border-white/8 hover:border-blue-500/30 backdrop-blur-sm text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white/5"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <Icon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-1">{value}</div>
                                    <div className="text-gray-400 text-sm">{label}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ──────────────────────────────────────────────────────────────────
                FEATURES SECTION
            ────────────────────────────────────────────────────────────────── */}
            <section id="features" className="relative py-16 md:py-28 px-4 sm:px-6 lg:px-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <AnimatedSection className="text-center mb-12 md:mb-20">
                        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-5">
                            <Zap className="w-3.5 h-3.5" />
                            Các chức năng của Map
                        </motion.div>
                        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
                            Mọi thứ bạn cần
                            <br />
                            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">trên một bản đồ</span>
                        </motion.h2>
                        <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Từ sự kiện giải trí đến cảnh báo an toàn — DaNang EventMap cung cấp tất cả
                            những gì bạn cần để di chuyển và khám phá thành phố thông minh hơn.
                        </motion.p>
                    </AnimatedSection>

                    {/* Feature Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <AnimatedSection key={feature.title}>
                                    <motion.div
                                        variants={fadeUp}
                                        className={`group relative h-full rounded-2xl bg-white/3 border border-white/8 hover:border-white/20 backdrop-blur-sm overflow-hidden transition-all duration-400 hover:-translate-y-2 hover:shadow-xl ${feature.glow}`}
                                    >
                                        {/* Image */}
                                        <div className="relative h-44 overflow-hidden">
                                            <img
                                                src={feature.img}
                                                alt={feature.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/20 to-transparent" />
                                            {/* Badge */}
                                            <div className="absolute top-3 right-3">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${feature.color} text-white shadow-lg`}>
                                                    {feature.badge}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 pt-4">
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{feature.title}</h3>
                                            <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                                        </div>

                                        {/* Hover border glow */}
                                        <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ring-1 ring-inset ${feature.border}`} />
                                    </motion.div>
                                </AnimatedSection>
                            );
                        })}
                    </div>

                    {/* CTA Banner */}
                    <AnimatedSection className="mt-16">
                        <motion.div
                            variants={fadeUp}
                            className="relative rounded-3xl overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-950/50 to-indigo-950/50 backdrop-blur-sm p-8 sm:p-12 text-center"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-indigo-600/10 pointer-events-none" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                                Sẵn sàng trải nghiệm bản đồ thông minh?
                            </h3>
                            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                                Đăng ký miễn phí và bắt đầu khám phá Đà Nẵng với đầy đủ tính năng ngay hôm nay.
                            </p>
                            <button
                                onClick={() => navigate(isLoggedIn ? '/dashboard' : '/register')}
                                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-8 py-4 rounded-full shadow-[0_8px_30px_rgba(37,99,235,0.4)] hover:shadow-[0_10px_40px_rgba(37,99,235,0.6)] hover:scale-[1.04] transition-all duration-300"
                            >
                                <Map className="w-5 h-5" />
                                {isLoggedIn ? 'Vào bản đồ ngay' : 'Đăng ký miễn phí'}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>

            {/* ──────────────────────────────────────────────────────────────────
                CONTACT SECTION
            ────────────────────────────────────────────────────────────────── */}
            <section id="contact" className="relative py-28 px-4 sm:px-6 lg:px-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/6 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <AnimatedSection className="text-center mb-16">
                        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-5">
                            <Mail className="w-3.5 h-3.5" />
                            Liên hệ hỗ trợ
                        </motion.div>
                        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
                            Chúng tôi luôn
                            <br />
                            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">sẵn sàng hỗ trợ</span>
                        </motion.h2>
                        <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-xl mx-auto">
                            Có câu hỏi hoặc cần hỗ trợ? Hãy liên hệ với đội ngũ phát triển của chúng tôi.
                        </motion.p>
                    </AnimatedSection>

                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        {/* Contact Info */}
                        <AnimatedSection>
                            <motion.div variants={fadeLeft} className="space-y-6">
                                {/* Info Cards */}
                                {[
                                    {
                                        icon: Mail,
                                        color: 'text-blue-400',
                                        bg: 'bg-blue-500/10 border-blue-500/20',
                                        label: 'Email hỗ trợ',
                                        value: 'dnpulse.vn@gmail.com',
                                        sub: 'Phản hồi trong vòng 24h'
                                    },
                                    {
                                        icon: Phone,
                                        color: 'text-emerald-400',
                                        bg: 'bg-emerald-500/10 border-emerald-500/20',
                                        label: 'Hotline',
                                        value: '1800 1334',
                                        sub: 'Thứ 2 – Thứ 6 | 8:00 – 17:00'
                                    },
                                    {
                                        icon: MapPinned,
                                        color: 'text-orange-400',
                                        bg: 'bg-orange-500/10 border-orange-500/20',
                                        label: 'Địa chỉ',
                                        value: 'FPT University Đà Nẵng',
                                        sub: 'Khu đô thị FPT, Ngũ Hành Sơn, Đà Nẵng'
                                    },
                                ].map(({ icon: Icon, color, bg, label, value, sub }) => (
                                    <div key={label} className={`flex items-start gap-4 p-5 rounded-2xl border ${bg} bg-white/2 backdrop-blur-sm`}>
                                        <div className={`shrink-0 w-12 h-12 rounded-xl border ${bg} flex items-center justify-center`}>
                                            <Icon className={`w-5 h-5 ${color}`} />
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
                                            <p className="text-white font-semibold">{value}</p>
                                            <p className="text-gray-400 text-sm mt-0.5">{sub}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Social Links */}
                                <div className="flex items-center gap-3 pt-2">
                                    <span className="text-gray-500 text-sm">Theo dõi chúng tôi:</span>
                                    {[
                                        { icon: Facebook, label: 'Facebook', href: '#' },
                                        { icon: Github, label: 'GitHub', href: '#' },
                                    ].map(({ icon: Icon, label, href }) => (
                                        <a
                                            key={label}
                                            href={href}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 flex items-center justify-center transition-all duration-200 text-gray-400 hover:text-white"
                                            aria-label={label}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </a>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatedSection>

                        {/* Contact Form */}
                        <AnimatedSection>
                            <motion.div variants={fadeRight}>
                                <div className="relative p-8 rounded-2xl bg-white/3 border border-white/8 backdrop-blur-sm">
                                    {formSubmitted ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col items-center justify-center py-12 text-center"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Gửi thành công!</h3>
                                            <p className="text-gray-400 text-sm">Chúng tôi sẽ phản hồi sớm nhất có thể. Cảm ơn bạn!</p>
                                        </motion.div>
                                    ) : (
                                        <form onSubmit={handleFormSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Họ và tên</label>
                                                <input
                                                    id="contact-name"
                                                    type="text"
                                                    required
                                                    value={contactForm.name}
                                                    onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                                                    placeholder="Nhập họ và tên..."
                                                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                                                <input
                                                    id="contact-email"
                                                    type="email"
                                                    required
                                                    value={contactForm.email}
                                                    onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                                                    placeholder="example@email.com"
                                                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Nội dung</label>
                                                <textarea
                                                    id="contact-message"
                                                    required
                                                    rows={5}
                                                    value={contactForm.message}
                                                    onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                                                    placeholder="Mô tả vấn đề hoặc câu hỏi của bạn..."
                                                    className="w-full bg-white/5 border border-white/10 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all duration-200 resize-none"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.5)] transition-all duration-300 hover:scale-[1.02]"
                                            >
                                                <Send className="w-4 h-4" />
                                                Gửi tin nhắn
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* ──────────────────────────────────────────────────────────────────
                FOOTER
            ────────────────────────────────────────────────────────────────── */}
            <footer className="relative border-t border-white/8 bg-black/30 backdrop-blur-sm py-10 px-4 sm:px-6 lg:px-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Logo + tagline */}
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-base font-extrabold text-white">
                                DaNang<span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">EventMap</span>
                            </span>
                        </div>
                        <p className="text-gray-500 text-xs">Bản đồ thông minh cho Đà Nẵng hiện đại</p>
                    </div>

                    {/* Nav links */}
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
                        {NAV_LINKS.map(link => (
                            <button
                                key={link.href}
                                onClick={() => scrollTo(link.href)}
                                className="hover:text-white transition-colors"
                            >
                                {link.label}
                            </button>
                        ))}
                    </div>

                    {/* Copyright */}
                    <div className="text-center text-xs text-gray-500">
                        <p>© 2026 DaNang EventMap. All rights reserved.</p>
                        <p className="mt-1">
                            Phát triển bởi{' '}
                            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent font-semibold">
                                SE20A04 — Group 01
                            </span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
