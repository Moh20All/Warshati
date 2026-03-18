import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = !app.isPackaged
const dbPath = isDev
  ? path.join(process.cwd(), 'prisma', 'rakam.db')
  : path.join(app.getPath('userData'), 'rakam.db')

// Ensure the directory exists
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

function logToDisk(msg) {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'rakam-prisma.log'), `[${new Date().toISOString()}] ${msg}\n`);
  } catch(e) {}
}

const sourceDbPath = path.join(process.resourcesPath, 'app', 'assets', 'db', 'template.db');

export async function initPrisma() {
  logToDisk(`Starting Prisma initialization in ${isDev ? 'DEV' : 'PROD'}`);
  logToDisk(`Target DB path: ${dbPath}`);

  let prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } }
  });

  if (!isDev) {
    let needsCopy = false;

    if (!fs.existsSync(dbPath)) {
      logToDisk(`DB file completely missing. Will copy template.`);
      needsCopy = true;
    } else {
      // Validate schema on the existing file
      try {
        logToDisk(`DB file exists. Validating schema...`);
        const tables = await prisma.$queryRaw`SELECT count(*) as count FROM sqlite_schema WHERE type='table' AND name='Store'`;
        
        // Prisma $queryRaw returns BigInts sometimes, or standard numbers. 
        // We just check if the array has a result and if it's > 0
        if (!tables || tables.length === 0 || Number(tables[0].count) === 0) {
          logToDisk(`Validation failed: 'Store' table missing (empty database). Will overwrite with template.`);
          needsCopy = true;
        } else {
          logToDisk(`Database validation successful: Tables exist.`);
        }
      } catch (err) {
        logToDisk(`Validation query crashed: ${err.message}. Assuming corrupted database. Will overwrite with template.`);
        needsCopy = true;
      }
    }

    if (needsCopy) {
      logToDisk(`Attempting to copy from resources: ${sourceDbPath}`);
      try {
        if (prisma) {
          await prisma.$disconnect(); // Release lock on the broken file
        }
        
        if (fs.existsSync(sourceDbPath)) {
          // Force overwrite any empty/broken file
          fs.copyFileSync(sourceDbPath, dbPath);
          logToDisk(`Successfully copied database template to user data directory.`);
          
          // Re-instantiate to establish fresh connection to the fixed file
          prisma = new PrismaClient({
            datasources: { db: { url: `file:${dbPath}` } }
          });
          logToDisk(`Re-instantiated Prisma on fresh database.`);
        } else {
          logToDisk(`FATAL ERROR: Source template database not found at ${sourceDbPath}!`);
        }
      } catch (copyErr) {
        logToDisk(`FATAL ERROR COPYING TEMPLATE: ${copyErr.message}`);
      }
    }
  }

  return prisma;
}

// We still export a default dummy instance to satisfy synchronous imports,
// but the server boot sequence will await initPrisma() instead.
const defaultPrisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } }
});

export default defaultPrisma;
