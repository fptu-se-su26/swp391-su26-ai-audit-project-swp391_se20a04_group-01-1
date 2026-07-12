const fs = require('fs');
const path = require('path');
const { sql, poolPromise } = require('./db');

async function seedEventRoads() {
    try {
        console.log('Reading EventRoads seed file...');
        const sqlFilePath = path.join(__dirname, '../../docs/Database/seed_event_roads.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Connecting to database...');
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();
        try {
            console.log('Executing EventRoads seed SQL...');
            
            // Execute SQL statements
            await transaction.request().query(sqlContent);

            await transaction.commit();
            console.log(' EventRoads seeding completed successfully!');
        } catch (err) {
            console.error('Error during transaction, rolling back...', err);
            await transaction.rollback();
            throw err;
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ EventRoads seeding failed:', error);
        process.exit(1);
    }
}

seedEventRoads();
