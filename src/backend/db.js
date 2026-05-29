require('dotenv').config();
console.log('🔑 RESEND_API_KEY loaded:', !!process.env.RESEND_API_KEY);
console.log('🔑 API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER ,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Kết nối Database DNPulse thành công!');
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối Database:', err.message);
        throw err; 
    });

module.exports = { sql, poolPromise };