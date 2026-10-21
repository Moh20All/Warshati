import log from 'electron-log';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Override default filename to warshati-debug.log
if (app) {
    log.transports.file.resolvePath = () => path.join(app.getPath('logs'), 'warshati-debug.log');

    // In production builds, completely silence terminal output
    if (app.isPackaged) {
        log.transports.console.level = false;
    }
}

export const logger = {
    info: (...args) => log.info(...args),
    warn: (...args) => log.warn(...args),
    error: (...args) => {
        log.error(...args);
        
        // Also write errors to warshati-crash.log for severe issues
        if (app) {
            try {
                const logPath = path.join(app.getPath('logs'), 'warshati-crash.log');
                const msg = args.map(a => (a instanceof Error ? a.stack || a.message : (typeof a === 'object' ? JSON.stringify(a) : String(a)))).join(' ');
                fs.appendFileSync(logPath, `[${new Date().toISOString()}] RUNTIME ERROR: ${msg}\n`);
            } catch (e) {
                // Ignore write errors to prevent recursive crashing
            }
        }
    }
};

export default logger;
