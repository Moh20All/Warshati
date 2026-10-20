const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

// Builds a brand-new EMPTY template.db from prisma/schema.prisma.
// Never copy the dev database — it contains your store, users and licence key.
const root = path.join(__dirname, '..');
const schemaPath = path.join(root, 'prisma', 'schema.prisma');
const destDir = path.join(root, 'assets', 'db');
const destDb = path.join(destDir, 'template.db');

async function main() {
    fs.mkdirSync(destDir, { recursive: true });
    for (const f of [destDb, destDb + '-journal']) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    }

    const sql = execSync(
        `npx prisma migrate diff --from-empty --to-schema-datamodel "${schemaPath}" --script`,
        { cwd: root, encoding: 'utf8' }
    );

    const statements = sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
        .filter(Boolean);

    const prisma = new PrismaClient({ datasources: { db: { url: `file:${destDb}` } } });
    try {
        for (const stmt of statements) {
            await prisma.$executeRawUnsafe(stmt);
        }
        const [{ count }] = await prisma.$queryRawUnsafe(
            `SELECT count(*) AS count FROM sqlite_schema WHERE type='table' AND name='Store'`
        );
        if (Number(count) !== 1) throw new Error('Store table missing after build');
    } finally {
        await prisma.$disconnect();
    }

    console.log(`[Staging] Built empty template database (${statements.length} statements): ${destDb}`);
}

main().catch((err) => {
    console.error(`[Staging Error] ${err.message}`);
    process.exit(1);
});
