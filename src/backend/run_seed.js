const fs = require('fs');
const path = require('path');
const { sql, poolPromise } = require('./db');

async function seed() {
    try {
        console.log('Reading seed file...');
        const sqlFilePath = path.join(__dirname, '../../docs/database/seed_pois.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Connecting to database...');
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();
        try {
            console.log('Deleting existing POIs and Categories to avoid conflicts...');
            // First disable FK checks if any, or just delete in correct order
            await transaction.request().query('DELETE FROM POIs');
            await transaction.request().query('DELETE FROM POIsCategories');

            console.log('Executing seed SQL...');
            // We run the SQL queries. sqlContent contains multiple statements which mssql's request can execute.
            await transaction.request().query(sqlContent);

            await transaction.commit();
            console.log(' Seeding completed successfully!');
        } catch (err) {
            console.error('Error during transaction, rolling back...', err);
            await transaction.rollback();
            throw err;
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
