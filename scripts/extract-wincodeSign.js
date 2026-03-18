const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign', 'winCodeSign-2.6.0');
const archivePath = path.join(cacheDir, 'winCodeSign-2.6.0.7z');

if (!fs.existsSync(archivePath)) {
    console.error('ERROR: Archive not found!');
    process.exit(1);
}

const sevenZipBinPath = require('7zip-bin').path7za;

// On Windows, the path7za string sometimes points to 7za.exe inside node_modules
// Let's create an output folder specifically for windows-10/x64 so it matches what electron-builder expects
const outputDir = cacheDir; 
const cmd = `"${sevenZipBinPath}" x "${archivePath}" -o"${outputDir}" -y`;

try {
    console.log('Running:', cmd);
    execSync(cmd, { stdio: 'inherit' });
    
    // electron-builder checks for winCodeSign-2.6.0/windows-10/x64/rcedit.exe
    // If the zip was extracted into a nested winCodeSign-2.6.0 folder, we need to move it up
    const nestedDir = path.join(cacheDir, 'winCodeSign-2.6.0');
    if (fs.existsSync(nestedDir)) {
        console.log('Flattening nested directory...');
        const items = fs.readdirSync(nestedDir);
        for (const item of items) {
           const src = path.join(nestedDir, item);
           const dest = path.join(cacheDir, item);
           try { fs.renameSync(src, dest); } catch(e) {}
        }
    }
    
    const rceditPath = path.join(cacheDir, 'windows-10', 'x64', 'rcedit.exe');
    if (fs.existsSync(rceditPath)) {
        console.log('SUCCESS: rcedit.exe is ready at', rceditPath);
    } else {
        console.error('Extraction finished, but rcedit.exe not found at', rceditPath);
    }
} catch (error) {
    console.error('Extraction failed:', error.message);
    process.exit(1);
}
