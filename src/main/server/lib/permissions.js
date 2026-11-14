// What each account may do. An owner can do everything. Every other account (a user, or a repairman's login)
// holds the list the owner ticked for it. This file is the only place the list lives: the routes check it,
// and the apps receive it (GET /api/users) to draw the tick boxes. Translated in the apps: perms.<key>
export const PERMISSION_GROUPS = {
  // Pages of the daily work
  work: ['repairs', 'sales', 'tradeins', 'inventory', 'customers', 'debts', 'expenses', 'daily_close'],
  // Pages only the owner had before
  manage: ['suppliers', 'repairmen', 'reports', 'activity'],
  // Actions inside those pages
  sensitive: ['inventory_edit', 'refunds', 'corrections', 'profit']
}
export const PERMISSIONS = Object.values(PERMISSION_GROUPS).flat()

// A user nobody set up yet keeps what staff could always do. A repairman's login starts with nothing more
// than his own repairs.
export const STAFF_DEFAULT = PERMISSION_GROUPS.work

// Not a tick box: every repairman's login has it. It opens the repairs given to him, and only those.
export const MY_REPAIRS = 'my_repairs'

/** Clean list for saving: known keys only, null when nothing was sent */
export function cleanPermissions(list) {
  if (!Array.isArray(list)) return null
  return PERMISSIONS.filter(p => list.includes(p))
}

/** What the tick boxes show for this account (a stored list, or the defaults) */
export function grantedTo(user) {
  if (user.role === 'OWNER') return PERMISSIONS
  let stored = null
  try { stored = cleanPermissions(JSON.parse(user.permissions)) } catch { /* never set */ }
  return stored ?? (user.repairmanId ? [] : STAFF_DEFAULT)
}

/** Everything the account may do right now */
export const permissionsOf = (user) => [...grantedTo(user), ...(user.repairmanId && user.role !== 'OWNER' ? [MY_REPAIRS] : [])]

/** can(req.user, 'sales', 'debts') — true with any one of them */
export const can = (user, ...keys) => !!user && (user.role === 'OWNER' || keys.some(k => user.perms?.includes(k)))

/** Sees only the repairs given to him (a repairman without the Repairs permission) */
export const ownRepairsOnly = (user) => !can(user, 'repairs') && can(user, MY_REPAIRS)

/** The account as the apps receive it */
export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive,
  repairmanId: u.repairmanId || null, permissions: permissionsOf(u)
})
