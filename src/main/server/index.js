import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import storeRoutes from './routes/store.js'
import customerRoutes from './routes/customers.js'
import inventoryRoutes from './routes/inventory.js'
import checkinRoutes from './routes/checkins.js'
import ticketRoutes from './routes/tickets.js'
import salesRoutes from './routes/sales.js'
import debtRoutes from './routes/debts.js'
import supplierRoutes from './routes/suppliers.js'
import purchaseOrderRoutes from './routes/purchase-orders.js'
import supplierDebtRoutes from './routes/supplier-debts.js'
import expenseRoutes from './routes/expenses.js'
import warrantyRoutes from './routes/warranty.js'
import tradeInRoutes from './routes/trade-ins.js'
import dailyCloseRoutes from './routes/daily-close.js'
import reportRoutes from './routes/reports.js'
import catalogRoutes from './routes/catalog.js'
import { syncCatalog } from './lib/catalog.js'
import { SESSION_KEY, SESSION_HEADER } from './lib/session-key.js'

const app = express()
const PORT = 3456
const HOST = '127.0.0.1' // local only — never expose the API to the shop network

app.use(cors())
app.use(express.json())

// Only the Warshati window knows this launch's key; any other caller (e.g. a web page) is refused
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next()
    if (req.get(SESSION_HEADER) !== SESSION_KEY) return res.status(403).json({ error: 'Forbidden' })
    next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/store', storeRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/checkins', checkinRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/debts', debtRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/supplier-debts', supplierDebtRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/warranty', warrantyRoutes)
app.use('/api/trade-ins', tradeInRoutes)
app.use('/api/daily-close', dailyCloseRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/catalog', catalogRoutes)

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
})

// Global Error Logging Middleware for Production Debugging
import fs from 'fs'
import path from 'path'
import { app as electronApp } from 'electron'

app.use((err, req, res, next) => {
    const errorLog = `[${new Date().toISOString()}] ${req.method} ${req.url}\n` +
                     `${err.stack || err.message}\n` +
                     `--------------------------------------------------\n`;
    
    try {
        const logPath = path.join(electronApp.getPath('userData'), 'warshati-error.log');
        fs.appendFileSync(logPath, errorLog);
        logger.error(errorLog);
    } catch (e) {
        logger.error("Failed to write to log file:", e);
    }

    res.status(500).json({ error: 'Internal Server Error' });
})

import prisma, { initPrisma } from './lib/prisma.js'
import logger from './lib/logger.js'

export async function startServer() {
    try {
        await initPrisma()
    } catch (dbErr) {
        logger.error('Failed to initialize or validate Prisma database on startup', dbErr)
        throw dbErr
    }

    // Load the bundled device catalog when its version changed (a failure never blocks startup)
    try {
        await syncCatalog(prisma)
    } catch (err) {
        logger.error('Device catalog sync failed', err)
    }

    return new Promise((resolve, reject) => {
        const server = app.listen(PORT, HOST, () => {
            logger.info(`Warshati API running on http://${HOST}:${PORT}`)
            resolve(server)
        })

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use. Is another instance running?`)
                reject(new Error(`Port ${PORT} is already in use. Please close any other running instances or development servers of Warshati.`))
            } else {
                reject(err)
            }
        })
    })
}

export default app

