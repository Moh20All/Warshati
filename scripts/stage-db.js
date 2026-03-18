const fs = require('fs');
const path = require('path');

const srcDb = path.join(__dirname, '..', 'prisma', 'rakam.db');
const destDir = path.join(__dirname, '..', 'assets', 'db');
const destDb = path.join(destDir, 'template.db');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDb)) {
    fs.copyFileSync(srcDb, destDb);
    console.log(`[Staging] Successfully copied mapped template database to: ${destDb}`);
} else {
    console.error(`[Staging Error] Source database not found at: ${srcDb}`);
    console.warn(`If this is a fresh clone, run 'npm run prisma:push' first to generate the tables.`);
    process.exit(1);
}
