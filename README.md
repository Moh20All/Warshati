# Rakam — Phone Repair & Store Management

Rakam (formerly FixFlow) is a modern, offline-first desktop application designed for local phone repair shops to manage tickets, inventory, and customers without relying on cloud subscriptions.

## Tech Stack
- **Framework**: Electron.js
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: Prisma + SQLite (`rakam.db`) ,online : 51zthgJtGxX1ZlC4
- **Packager**: electron-builder (NSIS)

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize the Prisma database:
```bash
npm run prisma:generate
npm run prisma:push
```

3. Start the Vite dev server and Electron wrapper:
```bash
npm run dev
```

## Building the Windows Installer (NSIS)

The project is configured to automatically handle file locks and pre-build compilation steps.

```bash
npm run electron:build
```

**What this command does:**
1. `clean:locks` - Forcefully terminates any dangling `app-builder.exe` processes from previous failed runs.
2. `prisma:generate` - Rebuilds the native Prisma client for the host OS.
3. `build` - Uses `electron-vite` to compile React into `out/`.
4. `check-assets` - Ensures the `icon.ico` and `license.txt` are present.
5. `electron-builder` - Packages the `.asar` and compiles the final `.exe`.

**Output**: The final installer is found at `release/Rakam Setup 1.0.0.exe`.

### Build Troubleshooting & Custom Scripts
If you encounter Windows-specific build lockups or network errors, several custom Node scripts have been provided in the `scripts/` directory:

- `generate-icon.js`: Reconstructs the `assets/icon.ico` file. electron-builder expects a cryptographically strict 256x256 PNG-embedded `.ico` layer. If it complains about icon sizes, run this script.
- `download-winCodeSign.js`: The `winCodeSign` `.7z` tool suite often fails to download from GitHub CDNs due to timeouts. This script targets the raw artifact URL and downloads it locally.
- `extract-wincodeSign.js`: Works alongside the downloader to bypass macOS symbolic-link OS privileges on Windows, extracting `rcedit.exe` directly into the electron-builder caching directory (`%LOCALAPPDATA%`).
- `build-installer.js`: Fallback manual installer generation script.

### Note on Windows Defender
Windows Defender aggressively scans `.asar` files during compilation. To avoid random `EPERM` or `EBUSY` crashes during `npm run electron:build`, please add the project root and `%LOCALAPPDATA%\electron-builder\cache` to your Defender Folder Exclusions.
