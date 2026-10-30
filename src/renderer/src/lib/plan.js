// The shop's plan, from the license check at startup (the main process enforces it too).
// 1 lifetime license + updates · 2 cloud + mobile app · 3 VIP: everything
export const PLAN_VIP = 3

let plan = 1
export const setPlan = (p) => { plan = Number(p) || 1 }
export const getPlan = () => plan
export const isVip = () => plan >= PLAN_VIP

/** 'off' | 'host' (main PC sharing its data) | 'client' (this PC uses the main PC's data) */
export const networkMode = () => window.api?.apiTarget?.mode || 'off'
export const isConnectedPc = () => networkMode() === 'client'
