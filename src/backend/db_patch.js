const { sql, poolPromise } = require('./db');

async function runPatch() {
    try {
        console.log('Connecting to database...');
        const pool = await poolPromise;
        
        console.log('Checking UsersPreferences table...');
        const checkPreferencesQuery = `
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UsersPreferences')
            BEGIN
                CREATE TABLE UsersPreferences (
                    user_id INT PRIMARY KEY FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
                    avoid_floods BIT NOT NULL DEFAULT 0,
                    avoid_congestion BIT NOT NULL DEFAULT 0,
                    show_traffic_layer BIT NOT NULL DEFAULT 1,
                    show_restricted_roads BIT NOT NULL DEFAULT 1,
                    enable_buffer_alerts BIT NOT NULL DEFAULT 1,
                    default_travel_mode NVARCHAR(20) NOT NULL DEFAULT 'driving',
                    updated_at DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created UsersPreferences table';
            END
            ELSE
            BEGIN
                PRINT 'UsersPreferences table already exists';
            END
        `;
        await pool.request().query(checkPreferencesQuery);

        console.log('Checking UserFavoritePOIs table...');
        const checkFavoritePOIsQuery = `
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserFavoritePOIs')
            BEGIN
                CREATE TABLE UserFavoritePOIs (
                    user_id INT NOT NULL FOREIGN KEY REFERENCES Users (user_id) ON DELETE CASCADE,
                    poi_id INT NOT NULL FOREIGN KEY REFERENCES POIs (poi_id) ON DELETE CASCADE,
                    saved_at DATETIME NOT NULL DEFAULT GETDATE(),
                    PRIMARY KEY (user_id, poi_id)
                );
                PRINT 'Created UserFavoritePOIs table';
            END
            ELSE
            BEGIN
                PRINT 'UserFavoritePOIs table already exists';
            END
        `;
        await pool.request().query(checkFavoritePOIsQuery);

        console.log('Checking Notifications table type column...');
        const checkNotificationsTypeQuery = `
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('Notifications') AND name = 'type'
            )
            BEGIN
                ALTER TABLE Notifications ADD type NVARCHAR(30) NOT NULL DEFAULT 'system';
                PRINT 'Added type column to Notifications table';
            END

            IF NOT EXISTS (
                SELECT * FROM sys.objects 
                WHERE parent_object_id = OBJECT_ID('Notifications') AND name = 'CHK_Notifications_Type'
            )
            BEGIN
                ALTER TABLE Notifications ADD CONSTRAINT CHK_Notifications_Type CHECK (type IN ('event_reminder', 'traffic_alert', 'event_update', 'system'));
                PRINT 'Added CHK_Notifications_Type constraint to Notifications table';
            END
        `;
        await pool.request().query(checkNotificationsTypeQuery);

        console.log('Checking FloodZones table depth_cm column...');
        const checkFloodZonesDepthQuery = `
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('FloodZones') AND name = 'depth_cm'
            )
            BEGIN
                ALTER TABLE FloodZones ADD depth_cm INT NULL;
                PRINT 'Added depth_cm column to FloodZones table';
            END
        `;
        await pool.request().query(checkFloodZonesDepthQuery);
        
        console.log('✅ Database patch applied successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database patch failed:', err);
        process.exit(1);
    }
}

runPatch();
