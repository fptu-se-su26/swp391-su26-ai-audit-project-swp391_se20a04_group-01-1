const fs = require('fs');
const path = require('path');

const srcDir = 'd:/WorkSpace/SWP/swp391-su26-ai-audit-project-swp391_se20a04_group-01-1/src/backend/test';
const unitDir = path.join(srcDir, 'unit');
const intDir = path.join(srcDir, 'integration');

if (!fs.existsSync(unitDir)) fs.mkdirSync(unitDir, { recursive: true });
if (!fs.existsSync(intDir)) fs.mkdirSync(intDir, { recursive: true });

function moveAndUpdate(file, targetDir) {
    const oldPath = path.join(srcDir, file);
    if (!fs.existsSync(oldPath)) return;
    let content = fs.readFileSync(oldPath, 'utf8');
    
    // Update relative imports to go one level higher
    content = content.replace(/require\(['"](\.\.\/[^'"]+)['"]\)/g, (match, p1) => {
        return 'require(\'../' + p1 + '\')';
    });
    // Update jest mocks
    content = content.replace(/jest\.mock\(['"](\.\.\/[^'"]+)['"]/g, (match, p1) => {
        return 'jest.mock(\'../' + p1 + '\'';
    });

    const newPath = path.join(targetDir, file);
    fs.writeFileSync(newPath, content);
    fs.unlinkSync(oldPath);
}

moveAndUpdate('auth.middleware.test.js', unitDir);
moveAndUpdate('weather.test.js', unitDir);
moveAndUpdate('auth.integration.test.js', intDir);
moveAndUpdate('user.integration.test.js', intDir);
moveAndUpdate('helpers.test.js', unitDir);

console.log('Restructure complete');
