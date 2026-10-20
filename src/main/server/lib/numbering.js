// Next document number like INV-2026-0001.
// Takes the highest NUMBER after the prefix (not the highest text), so INV-2026-10000
// correctly follows INV-2026-9999 instead of sorting before it.
// `table` and `column` are fixed names from our own code, never user input.
export async function nextNumber(db, table, column, prefix) {
  const rows = await db.$queryRawUnsafe(
    `SELECT MAX(CAST(substr("${column}", ?) AS INTEGER)) AS n FROM "${table}" WHERE "${column}" LIKE ?`,
    prefix.length + 1,
    `${prefix}%`
  )
  const n = Number(rows[0]?.n || 0) + 1
  return `${prefix}${String(n).padStart(4, '0')}`
}

const year = () => new Date().getFullYear()
export const nextSaleNumber = (db) => nextNumber(db, 'Sale', 'saleNumber', `INV-${year()}-`)
export const nextTicketNumber = (db) => nextNumber(db, 'RepairTicket', 'ticketNumber', `TKT-${year()}-`)
export const nextCheckInNumber = (db) => nextNumber(db, 'CheckIn', 'checkInNumber', `CI-${year()}-`)
export const nextOrderNumber = (db) => nextNumber(db, 'PurchaseOrder', 'orderNumber', `PO-${year()}-`)
