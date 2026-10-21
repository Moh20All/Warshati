const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

// Check if icon.ico exists, warn if not
if (!fs.existsSync(path.join(assetsDir, 'icon.ico'))) {
  console.warn('⚠️  assets/icon.ico missing — add your Warshati icon before final build');
}

// Check license.txt
if (!fs.existsSync(path.join(assetsDir, 'license.txt'))) {
  console.error('✗ assets/license.txt missing');
} else {
  console.log('✓ assets/license.txt found');
}

console.log('Asset check complete. Run npm run electron:build to package.');
