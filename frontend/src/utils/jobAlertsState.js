export const REFRESH_MAX = 3;
export const REFRESH_WINDOW_MS = 4 * 60 * 60 * 1000;
export const REWRITE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function getRefreshState(refreshState, now = Date.now()) {
  const windowStart = refreshState?.manual_refresh_window_start
    ? new Date(refreshState.manual_refresh_window_start)
    : null;
  const windowExpired = !windowStart || (now - windowStart.getTime()) >= REFRESH_WINDOW_MS;
  const used = windowExpired ? 0 : (refreshState?.manual_refresh_count || 0);
  const atLimit = used >= REFRESH_MAX;
  let resetInMin = null;

  if (atLimit && windowStart) {
    const resetAt = windowStart.getTime() + REFRESH_WINDOW_MS;
    resetInMin = Math.ceil((resetAt - now) / 60000);
  }

  return { used, remaining: REFRESH_MAX - used, atLimit, resetInMin };
}

export function getRewriteState(alert, now = Date.now()) {
  const base = alert?.updated_at ? new Date(alert.updated_at) : alert?.created_at ? new Date(alert.created_at) : null;
  if (!base) return { canRewrite: true, remainingMin: 0 };
  const remainingMs = base.getTime() + REWRITE_WINDOW_MS - now;
  return remainingMs <= 0
    ? { canRewrite: true, remainingMin: 0 }
    : { canRewrite: false, remainingMin: Math.ceil(remainingMs / 60000) };
}

export function updateUsageList(usage = [], delta) {
  return usage.map((item) => {
    if (item.feature !== "job_alerts") return item;
    const nextUsed = Math.max(0, (item.used || 0) + delta);
    return {
      ...item,
      used: nextUsed,
      remaining: item.limit === -1 ? -1 : Math.max(0, item.limit - nextUsed),
    };
  });
}
