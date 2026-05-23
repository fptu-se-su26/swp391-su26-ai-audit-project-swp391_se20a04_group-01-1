const sql = require('mssql');

const dbConfig = {
    user: 'sa',
    password: '@Tothioanh15',
    server: 'localhost',
    database: 'DNPulse',
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