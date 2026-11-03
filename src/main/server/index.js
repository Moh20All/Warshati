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
import { syncCatalog, syncAccessories } from './lib/catalog.js'
import { SESSION_KEY, SESSION_HEADER } from './lib/session-key.js'

import { API_PORT as PORT, isSharing, isPairedRequest, markSeen, updateDiscovery, getConfig, getPlan, setPlan, VIP_PLAN } from '../network.js'

const app = express()
// Local only, unless this is the main PC of a VIP shop network (see ../network.js)
const hostAddress = () => (isSharing() ? '0.0.0.0' : '127.0.0.1')

app.use(cors())
app.use(express.json())

// Only the Warshati window knows this launch's key; other PCs need the shop's pairing code.
// Anything else (e.g. a web page) is refused.
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next()
    if (req.get(SESSION_HEADER) === SESSION_KEY) return next()
    if (isPairedRequest(req)) {
        markSeen(req)
        return next()
    }
    if (getConfig().mode === 'host' && getPlan() < VIP_PLAN) return res.status(403).json({ error: 'not_vip' })
    res.status(403).json({ error: 'Forbidden' })
})

// A connected PC checks the pairing code and learns the shop's name
app.get('/api/network/hello', async (_req, res) => {
    const store = await prisma.store.findFirst({ select: { name: true } })
    res.json({ name: store?.name || 'Warshati' })
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
    try {
        await syncAccessories(prisma)
    } catch (err) {
        logger.error('Accessory catalog sync failed', err)
    }

    // The saved plan lets a VIP main PC share right away; the online license check confirms it later
    try {
        const local = await prisma.localLicense.findFirst({ select: { plan: true } })
        if (local) setPlan(local.plan)
    } catch (err) {
        logger.error('Could not read the saved plan', err)
    }

    return listen()
}

let server = null
let storeName = ''
const refreshStoreName = () => prisma.store.findFirst({ select: { name: true } }).then((s) => { storeName = s?.name || '' }).catch(() => {})

/** (Re)open the API on the right address after network sharing was switched on or off */
export async function applyNetworkMode() {
    await refreshStoreName()
    updateDiscovery(() => storeName)
    if (server && server.address()?.address === hostAddress()) return
    if (server) {
        const closing = new Promise((r) => server.close(() => r()))
        server.closeAllConnections() // keep-alive connections would hold the port open
        await closing
    }
    server = null
    await listen()
}

function listen() {
    const HOST = hostAddress()
    return new Promise((resolve, reject) => {
        server = app.listen(PORT, HOST, () => {
            logger.info(`Warshati API running on http://${HOST}:${PORT}`)
            refreshStoreName().then(() => updateDiscovery(() => storeName))
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

