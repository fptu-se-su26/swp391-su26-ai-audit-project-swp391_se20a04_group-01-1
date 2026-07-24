const jwt = require('jsonwebtoken');

// ✅ Middleware: Kiểm tra token hợp lệ
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            message: 'Thiếu token xác thực!' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token đã hết hạn!' 
                });
            }
            return res.status(403).json({ 
                message: 'Token không hợp lệ!' 
            });
        }
        
        req.user = user;
        next();
    });
};

// ✅ Middleware: Kiểm tra role
const authorizeRole = (...allowedRoles) => {
    const roles = allowedRoles.flat(Infinity);
    return (req, res, next) => {
        const userRole = req.user?.role || req.user?.role_name;
        if (!req.user || !roles.includes(userRole)) {
            return res.status(403).json({ 
                message: 'Bạn không có quyền truy cập tài nguyên này!' 
            });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRole };