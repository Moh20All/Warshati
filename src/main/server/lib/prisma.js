import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { fillMissingRefs } from './numbering.js'

const isDev = !app.isPackaged
export const dbPath = isDev
  ? path.join(process.cwd(), 'prisma', 'warshati.db')
  : path.join(app.getPath('userData'), 'warshati.db')

// Ensure the directory exists
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

function logToDisk(msg) {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'warshati-prisma.log'), `[${new Date().toISOString()}] ${msg}\n`);
  } catch(e) {}
}

const sourceDbPath = path.join(process.resourcesPath, 'app', 'assets', 'db', 'template.db');

// Idempotent startup upgrade: adds what newer versions need to an existing database
async function applyMigrations(prismaDb) {
  try {
    logToDisk('Checking schema for missing columns...');
    
    // Check Store
    const storeInfo = await prismaDb.$queryRaw`PRAGMA table_info(Store)`;
    if (!storeInfo.some(col => col.name === 'warrantyDays')) {
      logToDisk('Migrating Store table: adding warrantyDays');
      await prismaDb.$executeRaw`ALTER TABLE Store ADD COLUMN warrantyDays INTEGER NOT NULL DEFAULT 30`;
    }

    // Check InventoryItem
    const invInfo = await prismaDb.$queryRaw`PRAGMA table_info(InventoryItem)`;
    if (!invInfo.some(col => col.name === 'warrantyDays')) {
      logToDisk('Migrating InventoryItem table: adding warrantyDays');
      await prismaDb.$executeRaw`ALTER TABLE InventoryItem ADD COLUMN warrantyDays INTEGER NOT NULL DEFAULT 0`;
    }

    // Check RepairTicket
    const ticketInfo = await prismaDb.$queryRaw`PRAGMA table_info(RepairTicket)`;
    if (!ticketInfo.some(col => col.name === 'warrantyDays')) {
      logToDisk('Migrating RepairTicket table: adding warrantyDays');
      await prismaDb.$executeRaw`ALTER TABLE RepairTicket ADD COLUMN warrantyDays INTEGER NOT NULL DEFAULT 30`;
    }

    // Check SaleItem
    const saleItemInfo = await prismaDb.$queryRaw`PRAGMA table_info(SaleItem)`;
    if (!saleItemInfo.some(col => col.name === 'warrantyDays')) {
      logToDisk('Migrating SaleItem table: adding warrantyDays');
      await prismaDb.$executeRaw`ALTER TABLE SaleItem ADD COLUMN warrantyDays INTEGER NOT NULL DEFAULT 0`;
    }

    // v1.5: deposit applied to repair invoices
    const saleInfo = await prismaDb.$queryRaw`PRAGMA table_info(Sale)`;
    if (!saleInfo.some(col => col.name === 'depositApplied')) {
      logToDisk('Migrating Sale table: adding depositApplied');
      await prismaDb.$executeRaw`ALTER TABLE Sale ADD COLUMN depositApplied DECIMAL NOT NULL DEFAULT 0`;
    }

    // v1.5: trade-in payout method
    const tradeInInfo = await prismaDb.$queryRaw`PRAGMA table_info(TradeIn)`;
    if (!tradeInInfo.some(col => col.name === 'payoutMethod')) {
      logToDisk('Migrating TradeIn table: adding payoutMethod');
      await prismaDb.$executeRaw`ALTER TABLE TradeIn ADD COLUMN payoutMethod TEXT NOT NULL DEFAULT 'CASH'`;
    }

    // v1.5: dated repair deposits (backfilled from existing tickets on their received date)
    const depositTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='RepairDeposit'`;
    if (depositTable.length === 0) {
      logToDisk('Migrating: creating RepairDeposit table');
      await prismaDb.$executeRawUnsafe(`CREATE TABLE "RepairDeposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repairTicketId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairDeposit_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
      await prismaDb.$executeRawUnsafe(`CREATE INDEX "RepairDeposit_paidAt_idx" ON "RepairDeposit"("paidAt")`);
      await prismaDb.$executeRawUnsafe(`INSERT INTO "RepairDeposit" ("id", "repairTicketId", "amount", "paidAt")
        SELECT 'mig' || lower(hex(randomblob(10))), "id", "deposit", "receivedAt" FROM "RepairTicket" WHERE "deposit" > 0`);
    }

    // v1.5: refunds
    const refundTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='Refund'`;
    if (refundTable.length === 0) {
      logToDisk('Migrating: creating Refund table');
      await prismaDb.$executeRawUnsafe(`CREATE TABLE "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "revenue" DECIMAL NOT NULL,
    "cost" DECIMAL NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Refund_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Refund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
      await prismaDb.$executeRawUnsafe(`CREATE UNIQUE INDEX "Refund_saleId_key" ON "Refund"("saleId")`);
      await prismaDb.$executeRawUnsafe(`CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt")`);
    }

    // v1.5: license offline grace period (very old databases have no LocalLicense table at all).
    // Own try/catch so a problem here can never skip the steps after it.
    try {
      const licenseInfo = await prismaDb.$queryRaw`PRAGMA table_info(LocalLicense)`;
      if (licenseInfo.length === 0) {
        logToDisk('Migrating: creating LocalLicense table');
        await prismaDb.$executeRawUnsafe(`CREATE TABLE "LocalLicense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" DATETIME
)`);
        await prismaDb.$executeRawUnsafe(`CREATE UNIQUE INDEX "LocalLicense_key_key" ON "LocalLicense"("key")`);
      } else if (!licenseInfo.some(col => col.name === 'lastValidatedAt')) {
        logToDisk('Migrating LocalLicense table: adding lastValidatedAt');
        await prismaDb.$executeRaw`ALTER TABLE LocalLicense ADD COLUMN lastValidatedAt DATETIME`;
      }
    } catch (err) {
      logToDisk(`LocalLicense migration failed: ${err.message}`);
    }

    // v1.6: cancelling entries for debt payments (own try/catch: never blocks later steps)
    try {
      for (const table of ['DebtPayment', 'SupplierDebtPayment']) {
        const info = await prismaDb.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
        if (info.length && !info.some(col => col.name === 'reversalOf')) {
          logToDisk(`Migrating ${table} table: adding reversalOf`);
          await prismaDb.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "reversalOf" TEXT`);
        }
      }
    } catch (err) {
      logToDisk(`Payment reversal migration failed: ${err.message}`);
    }

    // v1.6: device catalog + key/value settings (own try/catch: never blocks later steps)
    try {
      const catalogTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='DeviceCatalog'`;
      if (catalogTable.length === 0) {
        logToDisk('Migrating: creating DeviceCatalog table');
        await prismaDb.$executeRawUnsafe(`CREATE TABLE "DeviceCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "specs" TEXT NOT NULL DEFAULT '{}',
    "imageUrl" TEXT,
    "imageFile" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
        await prismaDb.$executeRawUnsafe(`CREATE INDEX "DeviceCatalog_category_brand_idx" ON "DeviceCatalog"("category", "brand")`);
        await prismaDb.$executeRawUnsafe(`CREATE UNIQUE INDEX "DeviceCatalog_category_brand_model_key" ON "DeviceCatalog"("category", "brand", "model")`);
      }
      const metaTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='AppMeta'`;
      if (metaTable.length === 0) {
        logToDisk('Migrating: creating AppMeta table');
        await prismaDb.$executeRawUnsafe(`CREATE TABLE "AppMeta" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT NOT NULL)`);
      }
    } catch (err) {
      logToDisk(`Catalog migration failed: ${err.message}`);
    }

    // v1.5: parts taken from stock for repairs
    const partTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='RepairPart'`;
    if (partTable.length === 0) {
      logToDisk('Migrating: creating RepairPart table');
      await prismaDb.$executeRawUnsafe(`CREATE TABLE "RepairPart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repairTicketId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairPart_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RepairPart_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
      await prismaDb.$executeRawUnsafe(`CREATE INDEX "RepairPart_repairTicketId_idx" ON "RepairPart"("repairTicketId")`);
    }

    // v1.7: license plan (1 lifetime, 2 Pro: lifetime + shop network, 3 VIP: everything)
    const licenseInfo = await prismaDb.$queryRaw`PRAGMA table_info(LocalLicense)`;
    if (!licenseInfo.some(col => col.name === 'plan')) {
      logToDisk('Migrating LocalLicense table: adding plan');
      await prismaDb.$executeRaw`ALTER TABLE LocalLicense ADD COLUMN plan INTEGER NOT NULL DEFAULT 1`;
    }

    // v1.8: the default repair warranty is 5 days. Once, a shop still on the old 30-day default moves to 5
    // (new tickets did not use the setting before, so nobody chose 30 on purpose). Own try/catch.
    try {
      const done = await prismaDb.$queryRaw`SELECT value FROM AppMeta WHERE key = 'warranty_default_5'`;
      if (done.length === 0) {
        const changed = await prismaDb.$executeRaw`UPDATE Store SET warrantyDays = 5 WHERE warrantyDays = 30`;
        await prismaDb.$executeRaw`INSERT INTO AppMeta (key, value) VALUES ('warranty_default_5', 'done')`;
        logToDisk(`Default warranty set to 5 days (${changed} store row(s) changed)`);
      }
    } catch (err) {
      logToDisk(`Warranty default migration failed: ${err.message}`);
    }

    // v1.8: accessory catalog (own try/catch)
    try {
      const accessoryTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='AccessoryCatalog'`;
      if (accessoryTable.length === 0) {
        logToDisk('Migrating: creating AccessoryCatalog table');
        await prismaDb.$executeRawUnsafe(`CREATE TABLE "AccessoryCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER,
    "oldPrice" INTEGER,
    "imageUrl" TEXT,
    "imageFile" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
        await prismaDb.$executeRawUnsafe(`CREATE UNIQUE INDEX "AccessoryCatalog_name_key" ON "AccessoryCatalog"("name")`);
        await prismaDb.$executeRawUnsafe(`CREATE INDEX "AccessoryCatalog_category_idx" ON "AccessoryCatalog"("category")`);
      }
    } catch (err) {
      logToDisk(`Accessory catalog migration failed: ${err.message}`);
    }

    // v1.8: optional features, opening cash, repairmen (own try/catch)
    try {
      const addColumns = async (table, columns) => {
        const have = (await prismaDb.$queryRawUnsafe(`PRAGMA table_info("${table}")`)).map(c => c.name);
        for (const [name, type] of columns) {
          if (!have.includes(name)) {
            logToDisk(`Migrating ${table} table: adding ${name}`);
            await prismaDb.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${type}`);
          }
        }
      };
      await addColumns('Store', [
        ['featCheckIn', 'BOOLEAN NOT NULL DEFAULT true'], ['featDeliveryReceipt', 'BOOLEAN NOT NULL DEFAULT true'], ['featQuickCash', 'BOOLEAN NOT NULL DEFAULT true'],
        ['featDrawerFloat', 'BOOLEAN NOT NULL DEFAULT false'], ['drawerFloat', 'INTEGER NOT NULL DEFAULT 0'],
        ['featRepairmen', 'BOOLEAN NOT NULL DEFAULT false']
      ]);
      await addColumns('DailyClose', [['openingCash', 'DECIMAL NOT NULL DEFAULT 0']]);
      await addColumns('RepairTicket', [['repairmanId', 'TEXT'], ['repairmanPay', 'DECIMAL']]);
      const repairmanTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='Repairman'`;
      if (repairmanTable.length === 0) {
        logToDisk('Migrating: creating Repairman and RepairmanPayment tables');
        await prismaDb.$executeRawUnsafe(`CREATE TABLE "Repairman" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "payType" TEXT NOT NULL DEFAULT 'PROFIT_PERCENT',
    "payValue" DECIMAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
        await prismaDb.$executeRawUnsafe(`CREATE TABLE "RepairmanPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repairmanId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "notes" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairmanPayment_repairmanId_fkey" FOREIGN KEY ("repairmanId") REFERENCES "Repairman" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
        await prismaDb.$executeRawUnsafe(`CREATE INDEX "RepairmanPayment_paidAt_idx" ON "RepairmanPayment"("paidAt")`);
      }
      await addColumns('RepairmanPayment', [['reversalOf', 'TEXT']]);
    } catch (err) {
      logToDisk(`Features/repairmen migration failed: ${err.message}`);
    }

    // v1.8.1: activity log (own try/catch)
    try {
      const logTable = await prismaDb.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table' AND name='ActivityLog'`;
      if (logTable.length === 0) {
        logToDisk('Migrating: creating ActivityLog table');
        await prismaDb.$executeRawUnsafe(`CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
        await prismaDb.$executeRawUnsafe(`CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt")`);
        await prismaDb.$executeRawUnsafe(`CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action")`);
      }
    } catch (err) {
      logToDisk(`Activity log migration failed: ${err.message}`);
    }

    // Every stock item has a ref (typed, or REF-xxxx) so items without a barcode can be found too
    try {
      const filled = await fillMissingRefs(prismaDb);
      if (filled) logToDisk(`Gave ${filled} item(s) an automatic ref`);
    } catch (err) {
      logToDisk(`Item refs fill failed: ${err.message}`);
    }

    logToDisk('Schema migrations completed.');
  } catch (err) {
    logToDisk(`Migration failed: ${err.message}`);
  }
}

export async function initPrisma() {
  logToDisk(`Starting Prisma initialization in ${isDev ? 'DEV' : 'PROD'}`);
  logToDisk(`Target DB path: ${dbPath}`);

  let prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } }
  });

  // Dev: bring the developer's own database up to date too (same idempotent steps as an installed app)
  if (isDev && fs.existsSync(dbPath)) await applyMigrations(prisma);

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
          await applyMigrations(prisma);
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
