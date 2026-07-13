const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            content = content.replace(/const\s+\{\s*(.*?)\s*\}\s*=\s*require\(['"]@playwright\/test['"]\);/g, 'import { $1 } from \'@playwright/test\';');
            content = content.replace(/const\s+(\w+)\s*=\s*require\(['"](.*?)['"]\);/g, 'import $1 from \'$2\';');
            // For relative imports, add .ts extension is not strictly needed for playwright TS runner but let's just make sure they map correctly
            content = content.replace(/import (\w+) from '(\.\.?\/.*?)';/g, 'import $1 from \'$2\';');
            
            content = content.replace(/module\.exports\s*=\s*(.*?);/g, 'export default $1;');

            const newPath = fullPath.replace(/\.js$/, '.ts');
            fs.writeFileSync(newPath, content);
            fs.unlinkSync(fullPath);
        }
    }
}

processDir('d:/WorkSpace/SWP/swp391-su26-ai-audit-project-swp391_se20a04_group-01-1/src/frontend/e2e');

const configPath = 'd:/WorkSpace/SWP/swp391-su26-ai-audit-project-swp391_se20a04_group-01-1/src/frontend/playwright.config.js';
if(fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(/const\s+\{\s*(.*?)\s*\}\s*=\s*require\(['"]@playwright\/test['"]\);/g, 'import { $1 } from \'@playwright/test\';');
    configContent = configContent.replace(/module\.exports\s*=\s*defineConfig/g, 'export default defineConfig');
    fs.writeFileSync(configPath.replace(/\.js$/, '.ts'), configContent);
    fs.unlinkSync(configPath);
}
console.log('Converted to TS');
