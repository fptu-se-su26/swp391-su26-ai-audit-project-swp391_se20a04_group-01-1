import React, { useEffect, useState } from 'react';
import { Navigation, LogOut, Map } from 'lucide-react';

export default function Home() {
    const [isChecking, setIsChecking] = useState(true);

    // Hàm dùng chung để xóa dữ liệu và đẩy về Login
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastActivityTime');
        window.location.href = '/login';
    };

    // 1. useEffect: Kiểm tra xác thực và Kiểm tra Timeout (5 phút)
    useEffect(() => {
        const token = localStorage.getItem('token');
        const lastActivity = localStorage.getItem('lastActivityTime');
        const currentTime = Date.now();
        const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 phút = 300,000 mili-giây

        // Điều kiện đẩy về trang đăng nhập:
        // - Không có token (chưa đăng nhập)
        // - HOẶC có lastActivity nhưng khoảng cách đến hiện tại > 5 phút
        if (!token || (lastActivity && currentTime - parseInt(lastActivity) > TIMEOUT_DURATION)) {
            handleLogout();
            return;
        }

        // Gọi API lấy dữ liệu trang chủ kèm Token
        fetch('http://localhost:5001/api/home', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(res => {
                if (res.status === 401) {
                    handleLogout(); // Token hết hạn hoặc không hợp lệ
                }
                return res.json();
            })
            .then(() => {
                // Đã tải xong API, cập nhật state để hiển thị giao diện UI
                setIsChecking(false);
            })
            .catch(err => {
                console.error(err);
                setIsChecking(false);
            });
    }, []);

    // 2. useEffect: Theo dõi tương tác người dùng để cập nhật lại lastActivityTime
    useEffect(() => {
        let timeoutId: any;

        // Hàm cập nhật thời gian hoạt động. Dùng setTimeout (debounce) để tránh
        // việc lưu localStorage quá nhiều lần liên tục (gây giật lag khi cuộn/di chuột).
        const updateActivity = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                localStorage.setItem('lastActivityTime', Date.now().toString());
            }, 1000);
        };

        // Lắng nghe các sự kiện khi người dùng thao tác trên trang web
        window.addEventListener('click', updateActivity);
        window.addEventListener('keypress', updateActivity);
        window.addEventListener('scroll', updateActivity);
        window.addEventListener('mousemove', updateActivity);

        // Gỡ lắng nghe sự kiện khi Component bị hủy để tránh rò rỉ bộ nhớ
        return () => {
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('keypress', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            window.removeEventListener('mousemove', updateActivity);
            clearTimeout(timeoutId);
        };
    }, []);

    if (isChecking) return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;

    return (
        <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
            {/* THANH ĐIỀU HƯỚNG (NAVBAR) */}
            <nav style={{ backgroundColor: '#2563EB', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 'bold' }}>
                    <Navigation size={24} />
                    <span>DaNang EventMap</span>
                </div>

                <button
                    onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'transparent', border: '1px solid white', color: 'white', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#2563EB'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'white'; }}
                >
                    <LogOut size={18} />
                    Đăng xuất
                </button>
            </nav>

            {/* NỘI DUNG CHÍNH */}
            <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: '#1f2937', marginBottom: '10px' }}>👋 Chào mừng bạn quay trở lại!</h1>
                <p style={{ color: '#6b7280', fontSize: '18px', marginBottom: '30px' }}>
                    Bạn đã đăng nhập thành công vào hệ thống. Bản đồ sự kiện Đà Nẵng đã sẵn sàng.
                </p>

                {/* Khung giả lập Bản đồ */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                    <Map size={60} color="#9ca3af" style={{ marginBottom: '15px' }} />
                    <h2 style={{ color: '#4b5563', margin: '0 0 10px 0' }}>Khu vực hiển thị Bản đồ (Map)</h2>
                    <p style={{ color: '#9ca3af', maxWidth: '400px' }}>Sau này bạn có thể nhúng Google Maps API hoặc Leaflet vào khung này để hiển thị các sự kiện và tuyến đường kẹt xe.</p>
                </div>
            </main>
        </div>
    );
}