const { poolPromise, sql } = require('./db');
poolPromise.then(async pool => {
    // Fix Nha thuoc name to Vietnamese with diacritics
    await pool.request()
        .input('newname', sql.NVarChar, 'Nhà thuốc')
        .query("UPDATE POIsCategories SET name = @newname WHERE name = 'Nha thuoc'");
    console.log('Fixed: Nha thuoc -> Nhà thuốc');
    
    // Check existing
    const existing = await pool.request().query('SELECT id, name FROM POIsCategories ORDER BY id');
    console.log('Existing:', JSON.stringify(existing.recordset));
    
    // Add Khu mua sam if not exists
    const shopping = existing.recordset.find(r => r.name.includes('mua') || r.name.includes('sắm'));
    if (!shopping) {
        await pool.request()
            .input('name', sql.NVarChar, 'Khu mua sắm')
            .input('icon', sql.NVarChar, '🛍️')
            .input('color_code', sql.NVarChar, '#F59E0B')
            .input('description', sql.NVarChar, 'Trung tâm thương mại, siêu thị, khu mua sắm')
            .query('INSERT INTO POIsCategories (name, icon, color_code, description) VALUES (@name, @icon, @color_code, @description)');
        console.log('Added: Khu mua sắm');
    } else {
        console.log('Shopping exists:', shopping.id, shopping.name);
    }
    
    const final = await pool.request().query('SELECT id, name FROM POIsCategories ORDER BY id');
    console.log('Final:', JSON.stringify(final.recordset));
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
