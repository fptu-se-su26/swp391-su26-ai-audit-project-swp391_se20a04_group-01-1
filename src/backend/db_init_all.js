/**
 * DB INIT ALL - Script khởi tạo hoàn chỉnh Database DN_Pulse
 * Chạy: node db_init_all.js
 * Script này sẽ tự động:
 * 1. Tạo Database DN_Pulse (nếu chưa có)
 * 2. Chạy file schema chính (DNPulse_DB_final.sql)
 * 3. Chạy các file migration bổ sung
 * 4. Chạy db_patch.js logic (tạo bảng phụ)
 * 5. Seed dữ liệu POIs
 */

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

// Load .env
try { require('dotenv').config(); } catch(e) {
    try { require('@dotenvx/dotenvx').config(); } catch(e2) {}
}

const DB_CONFIG = {
    server: process.env.DB_SERVER || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 120000,
};

const DB_NAME = process.env.DB_NAME || 'DN_Pulse';
const DOCS_DB_DIR = path.join(__dirname, '..', '..', 'docs', 'database');
const DOCS_DB_DIR2 = path.join(__dirname, '..', '..', 'docs', 'Database');

async function runSqlFile(pool, filePath, label) {
    if (!fs.existsSync(filePath)) {
        console.log(`  ⏭️  [SKIP] File không tồn tại: ${label}`);
        return;
    }
    console.log(`  📄 Đang chạy: ${label}...`);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Tách theo GO statements
    const batches = content.split(/^\s*GO\s*$/gmi).filter(b => b.trim());

    for (const batch of batches) {
        if (!batch.trim()) continue;
        try {
            await pool.request().query(batch);
        } catch (err) {
            // Bỏ qua lỗi trùng lặp (đã tồn tại)
            if (err.number === 2714 || // Object already exists
                err.number === 1913 || // Index already exists
                err.number === 2627 || // Unique constraint violation (duplicate seed)
                err.number === 2601 || // Cannot insert duplicate key
                err.number === 8152 || // String truncation
                err.message?.includes('already exists') ||
                err.message?.includes('IDENTITY_INSERT')) {
                // Silent skip
            } else {
                console.log(`  ⚠️  Cảnh báo trong ${label}: ${err.message?.substring(0, 120)}`);
            }
        }
    }
    console.log(`  ✅ Hoàn thành: ${label}`);
}

async function runPatchLogic(pool) {
    console.log(`  📄 Đang chạy: db_patch logic (bảng bổ sung)...`);

    const patches = [
        // is_email_verified column
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'is_email_verified')
         ALTER TABLE Users ADD is_email_verified BIT NOT NULL DEFAULT 0;`,

        // UsersPreferences table
        `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UsersPreferences')
         CREATE TABLE UsersPreferences (
             user_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
             avoid_floods BIT NOT NULL DEFAULT 0,
             avoid_congestion BIT NOT NULL DEFAULT 0,
             show_traffic_layer BIT NOT NULL DEFAULT 1,
             show_restricted_roads BIT NOT NULL DEFAULT 1,
             enable_buffer_alerts BIT NOT NULL DEFAULT 1,
             default_travel_mode NVARCHAR(20) NOT NULL DEFAULT 'driving',
             updated_at DATETIME NOT NULL DEFAULT GETDATE()
         );`,

        // UserFavoritePOIs table
        `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserFavoritePOIs')
         CREATE TABLE UserFavoritePOIs (
             user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
             poi_id INT NOT NULL FOREIGN KEY REFERENCES POIs (poi_id) ON DELETE CASCADE,
             saved_at DATETIME NOT NULL DEFAULT GETDATE(),
             PRIMARY KEY (user_id, poi_id)
         );`,

        // Notifications type column
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notifications') AND name = 'type')
         ALTER TABLE Notifications ADD type NVARCHAR(30) NOT NULL DEFAULT 'system';`,

        // FloodZones depth_cm column
        `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FloodZones') AND name = 'depth_cm')
         ALTER TABLE FloodZones ADD depth_cm INT NULL;`,

        // UserSocialAccount table
        `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserSocialAccount')
         CREATE TABLE UserSocialAccount (
             social_id INT IDENTITY(1, 1) PRIMARY KEY,
             user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
             provider NVARCHAR(50) NOT NULL,
             provider_id NVARCHAR(100) NOT NULL,
             linked_at DATETIME NOT NULL DEFAULT GETDATE()
         );`,

        // UserFavoritePlaces table
        `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserFavoritePlaces')
         CREATE TABLE UserFavoritePlaces (
             favorite_id INT IDENTITY(1,1) PRIMARY KEY,
             user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
             poi_id INT NULL,
             favorite_type NVARCHAR(50) NOT NULL DEFAULT 'custom',
             source NVARCHAR(100) NULL,
             latitude DECIMAL(9,6) NOT NULL,
             longitude DECIMAL(9,6) NOT NULL,
             name NVARCHAR(255) NOT NULL,
             address NVARCHAR(255) NULL,
             note NVARCHAR(MAX) NULL,
             created_at DATETIME NOT NULL DEFAULT GETDATE()
         );`,

        // UserFavoriteLocations table
        `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserFavoriteLocations')
         CREATE TABLE UserFavoriteLocations (
             id INT IDENTITY(1,1) PRIMARY KEY,
             user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
             label NVARCHAR(255) NOT NULL,
             latitude DECIMAL(9,6) NOT NULL,
             longitude DECIMAL(9,6) NOT NULL,
             source_place_id NVARCHAR(100) NULL,
             saved_at DATETIME NOT NULL DEFAULT GETDATE()
         );`,
    ];

    for (const patch of patches) {
        try {
            await pool.request().query(patch);
        } catch (err) {
            if (!err.message?.includes('already exists')) {
                console.log(`  ⚠️  Patch warning: ${err.message?.substring(0, 100)}`);
            }
        }
    }
    console.log(`  ✅ Hoàn thành: db_patch logic`);
}

async function main() {
    console.log('='.repeat(60));
    console.log('🚀 DN-PULSE DATABASE FULL INITIALIZATION');
    console.log('='.repeat(60));
    console.log(`📋 Server: ${DB_CONFIG.server}:${DB_CONFIG.port}`);
    console.log(`📋 Database: ${DB_NAME}`);
    console.log(`📋 User: ${DB_CONFIG.user}`);
    console.log('');

    // STEP 1: Tạo Database (kết nối master trước)
    console.log('📦 BƯỚC 1: Tạo Database...');
    try {
        const masterPool = await sql.connect({ ...DB_CONFIG, database: 'master' });
        await masterPool.request().query(
            `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${DB_NAME}') CREATE DATABASE [${DB_NAME}];`
        );
        console.log(`  ✅ Database [${DB_NAME}] đã sẵn sàng!`);
        await masterPool.close();
    } catch (err) {
        console.error(`  ❌ Lỗi tạo Database: ${err.message}`);
        process.exit(1);
    }

    // STEP 2: Kết nối vào DB chính
    console.log('\n📦 BƯỚC 2: Kết nối Database...');
    let pool;
    try {
        pool = await sql.connect({ ...DB_CONFIG, database: DB_NAME });
        console.log(`  ✅ Kết nối [${DB_NAME}] thành công!`);
    } catch (err) {
        console.error(`  ❌ Lỗi kết nối: ${err.message}`);
        process.exit(1);
    }

    // STEP 3: Chạy file schema chính
    console.log('\n📦 BƯỚC 3: Khởi tạo Schema chính...');
    await runSqlFile(pool, path.join(DOCS_DB_DIR, 'DNPulse_DB_final.sql'), 'DNPulse_DB_final.sql');

    // STEP 4: Chạy các file migration bổ sung
    console.log('\n📦 BƯỚC 4: Chạy các Migration bổ sung...');
    const migrationFiles = [
        'update_otp_user.sql',
        'RefreshToken.sql',
        'update_event.sql',
        'EventImages.sql',
        'ALTER_TABLE_EventImages.sql',
        'view_count.sql',
        'migration_add_save_type.sql',
        'save_type.sql',
        '001_add_traffic_alert_verification.sql',
    ];
    for (const file of migrationFiles) {
        await runSqlFile(pool, path.join(DOCS_DB_DIR, file), file);
    }
    // Check docs/Database (capital D)
    await runSqlFile(pool, path.join(DOCS_DB_DIR2, 'update_profile.sql'), 'update_profile.sql');

    // STEP 5: Chạy patch logic (tạo bảng phụ)
    console.log('\n📦 BƯỚC 5: Chạy Patch bảng bổ sung...');
    await runPatchLogic(pool);

    // STEP 6: Seed dữ liệu POIs
    console.log('\n📦 BƯỚC 6: Seed dữ liệu POIs...');
    await runSqlFile(pool, path.join(DOCS_DB_DIR, 'seed_pois.sql'), 'seed_pois.sql');
    await runSqlFile(pool, path.join(DOCS_DB_DIR, 'seed_event_roads.sql'), 'seed_event_roads.sql');

    // STEP 7: Verify
    console.log('\n📦 BƯỚC 7: Kiểm tra kết quả...');
    try {
        const result = await pool.request().query(`
            SELECT 'Users' AS TableName, COUNT(*) AS Rows FROM Users
            UNION ALL SELECT 'POIsCategories', COUNT(*) FROM POIsCategories
            UNION ALL SELECT 'POIs', COUNT(*) FROM POIs
            UNION ALL SELECT 'EventCategories', COUNT(*) FROM EventCategories
            UNION ALL SELECT 'Events', COUNT(*) FROM Events
            UNION ALL SELECT 'EventRoad', COUNT(*) FROM EventRoad
            UNION ALL SELECT 'Notifications', COUNT(*) FROM Notifications
        `);
        console.log('\n  📊 Thống kê Database:');
        console.log('  ' + '-'.repeat(35));
        for (const row of result.recordset) {
            console.log(`  | ${row.TableName.padEnd(20)} | ${String(row.Rows).padStart(8)} |`);
        }
        console.log('  ' + '-'.repeat(35));
    } catch (err) {
        console.log(`  ⚠️  Không thể kiểm tra: ${err.message?.substring(0, 80)}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 KHỞI TẠO DATABASE HOÀN TẤT THÀNH CÔNG!');
    console.log('='.repeat(60));

    await pool.close();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});
