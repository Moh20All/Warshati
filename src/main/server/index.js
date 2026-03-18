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

const app = express()
const PORT = 3456

app.use(cors())
app.use(express.json())

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
        const logPath = path.join(electronApp.getPath('userData'), 'rakam-error.log');
        fs.appendFileSync(logPath, errorLog);
        console.error(errorLog);
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }

    res.status(500).json({ error: 'Internal Server Error', details: err.message });
})

import { initPrisma } from './lib/prisma.js'

export async function startServer() {
    try {
        await initPrisma()
    } catch (dbErr) {
        console.error('Failed to initialize or validate Prisma database on startup', dbErr)
        throw dbErr
    }

    return new Promise((resolve, reject) => {
        const server = app.listen(PORT, () => {
            console.log(`Rakam API running on http://localhost:${PORT}`)
            resolve(server)
        })

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Is another instance running?`)
                reject(new Error(`Port ${PORT} is already in use. Please close any other running instances or development servers of Rakam.`))
            } else {
                reject(err)
            }
        })
    })
}

export default app

