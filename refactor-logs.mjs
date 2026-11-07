import fs from 'fs';
import path from 'path';

const routesDir = './src/main/server/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
files.push('../index.js'); // Add src/main/server/index.js

for (const file of files) {
    const fullPath = path.join(routesDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if it has console.
    if (!content.includes('console.')) continue;
    
    if (!content.includes('import logger from')) {
        const importLevel = file === '../index.js' ? './lib/logger.js' : '../lib/logger.js';
        const importStmt = `import logger from '${importLevel}'\n`;
        const lastImportIdx = content.lastIndexOf('import ');
        if (lastImportIdx !== -1) {
            const endOfLine = content.indexOf('\n', lastImportIdx);
            content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
        } else {
            content = importStmt + content;
        }
    }
    
    content = content.replace(/console\.error/g, 'logger.error');
    content = content.replace(/console\.log/g, 'logger.info');
    content = content.replace(/console\.warn/g, 'logger.warn');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
}
