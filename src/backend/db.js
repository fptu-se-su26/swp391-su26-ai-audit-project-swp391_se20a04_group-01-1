const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: 'SQLEXPRESS'
    }
};

const poolPromise = sql.connect(dbConfig)
    .then(pool => {
        console.log('✅ Kết nối Database DNPulse thành công!');
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối Database:\n', err);
        process.exit(1);
    });

module.exports = { sql, poolPromise };