// The shop's plan, from the license check at startup (the main process enforces it too).
// 1 Lifetime · 2 Pro (lifetime + several PCs on the shop network) · 3 VIP (everything: cloud, phone anywhere, new features)
export const PLAN_VIP = 3
export const PLAN_PRO = 2

let plan = 1
export const setPlan = (p) => { plan = Number(p) || 1 }
export const getPlan = () => plan
export const isVip = () => plan >= PLAN_VIP
export const hasNetworkPlan = () => plan >= PLAN_PRO

/** 'off' | 'host' (main PC sharing its data) | 'client' (this PC uses the main PC's data) */
export const networkMode = () => window.api?.apiTarget?.mode || 'off'
export const isConnectedPc = () => networkMode() === 'client'
