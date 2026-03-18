const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const url = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';
const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign', 'winCodeSign-2.6.0');

fs.mkdirSync(cacheDir, { recursive: true });
const dest = path.join(cacheDir, 'winCodeSign-2.6.0.7z');

if (fs.existsSync(dest) && fs.statSync(dest).size > 1000000) {
  console.log('winCodeSign already cached at', dest, '(' + fs.statSync(dest).size + ' bytes)');
  process.exit(0);
}

console.log('Downloading winCodeSign-2.6.0.7z ...');
console.log('From:', url);
console.log('To:', dest);

function download(url, dest, redirects = 0) {
  if (redirects > 5) { console.error('Too many redirects'); process.exit(1); }
  
  const proto = url.startsWith('https') ? https : http;
  proto.get(url, { headers: { 'User-Agent': 'electron-builder' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Redirecting to:', res.headers.location);
      download(res.headers.location, dest, redirects + 1);
      return;
    }
    if (res.statusCode !== 200) {
      console.error('HTTP', res.statusCode);
      process.exit(1);
    }
    const total = parseInt(res.headers['content-length'] || '0');
    let downloaded = 0;
    const file = fs.createWriteStream(dest);
    res.on('data', (chunk) => {
      downloaded += chunk.length;
      if (total) {
        const pct = ((downloaded / total) * 100).toFixed(1);
        process.stdout.write(`\rDownloading: ${pct}% (${(downloaded/1024/1024).toFixed(1)} MB)`);
      }
    });
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('\nDone! Cached at:', dest, '(' + fs.statSync(dest).size + ' bytes)');
    });
  }).on('error', (e) => {
    console.error('Download failed:', e.message);
    process.exit(1);
  });
}

download(url, dest);
