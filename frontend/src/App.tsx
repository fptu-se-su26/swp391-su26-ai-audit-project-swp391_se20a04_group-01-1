// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import Login from './pages/Login/Login';
// import Register from './pages/Login/Register';
// import Home from './pages/Home/Home'; // Import trang Home vừa tạo

// export default function App() {
//   return (
//     <Router>
//       <Routes>
//         {/* Đường dẫn mặc định sẽ vào trang Chủ */}
//         <Route path="/" element={<Home />} />

//         {/* Các đường dẫn Auth */}
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />

//         {/* Bắt lỗi đường dẫn linh tinh, đẩy về trang chủ */}
//         <Route path="*" element={<Navigate to="/" />} />
//       </Routes>
//     </Router>
//   );
// }

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen/SplashScreen';
import Login from './pages/Login/Login';
import Register from './pages/Login/Register';
import Home from './pages/Home/Home';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Trang đầu tiên xuất hiện sẽ là Màn hình chờ Du lịch */}
        <Route path="/" element={<SplashScreen />} />

        {/* Các trang tài khoản */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Trang bản đồ chính */}
        <Route path="/map" element={<Home />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}