const packager = require('electron-packager');
const { createWindowsInstaller } = require('electron-winstaller');
const path = require('path');
const fs = require('fs');

async function build() {
  console.log('1. Packaging electron app...');
  const appPaths = await packager({
    dir: '.',
    out: 'dist',
    name: 'FixFlow',
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    ignore: [
      /^\/\.git/,
      /node_modules[\\\/]\.cache/,
      /node_modules[\\\/]@prisma[\\\/]engines/,
      /src[\\\/]renderer/,
      /electron-builder\.yml/
    ],
    asar: true,
    extraResource: [
      'prisma',
      'node_modules/@prisma/engines'
    ]
  });

  const appPath = appPaths[0];
  console.log(`✓ Packaged successfully to ${appPath}`);

  console.log('2. Creating Windows Installer...');
  try {
    await createWindowsInstaller({
      appDirectory: appPath,
      outputDirectory: path.join(__dirname, '../dist/installer'),
      authors: 'Moha',
      exe: 'FixFlow.exe',
      setupExe: 'FixFlow-Setup.exe',
      name: 'fixflow',
      noMsi: true
    });
    console.log('✓ Installer successfully created at dist/installer/FixFlow-Setup.exe!');
  } catch (e) {
    console.error(`No dice: ${e.message}`);
  }
}

build();
