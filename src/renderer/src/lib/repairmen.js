// Same rule as the server (src/main/server/routes/repairmen.js), to show the share before delivery
export const PAY_TYPES = ['PROFIT_PERCENT', 'PRICE_PERCENT', 'FIXED']

export function repairmanShare(repairman, price, parts) {
  const num = (v) => parseFloat(v || 0)
  const value = num(repairman?.payValue)
  if (repairman?.payType === 'FIXED') return value
  const base = repairman?.payType === 'PRICE_PERCENT' ? num(price) : Math.max(0, num(price) - num(parts))
  return Math.round((base * value) / 100)
}
