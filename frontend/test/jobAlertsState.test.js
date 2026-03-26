import { test, expect } from "vitest";

import {
  getRefreshState,
  getRewriteState,
  REFRESH_MAX,
  REFRESH_WINDOW_MS,
  REWRITE_WINDOW_MS,
  updateUsageList,
} from "../src/utils/jobAlertsState.js";

test("getRefreshState resets counts after refresh window expires", () => {
  const now = new Date("2026-03-26T12:00:00.000Z").getTime();
  const state = getRefreshState(
    {
      manual_refresh_count: 2,
      manual_refresh_window_start: new Date(now - REFRESH_WINDOW_MS - 60_000).toISOString(),
    },
    now,
  );

  expect(state).toEqual({
    used: 0,
    remaining: REFRESH_MAX,
    atLimit: false,
    resetInMin: null,
  });
});

test("getRefreshState reports cooldown when limit is hit", () => {
  const now = new Date("2026-03-26T12:00:00.000Z").getTime();
  const windowStart = new Date(now - (REFRESH_WINDOW_MS - 30 * 60 * 1000)).toISOString();
  const state = getRefreshState(
    {
      manual_refresh_count: REFRESH_MAX,
      manual_refresh_window_start: windowStart,
    },
    now,
  );

  expect(state.used).toBe(REFRESH_MAX);
  expect(state.remaining).toBe(0);
  expect(state.atLimit).toBe(true);
  expect(state.resetInMin).toBe(30);
});

test("getRewriteState blocks edits during cooldown", () => {
  const now = new Date("2026-03-26T12:00:00.000Z").getTime();
  const alert = {
    updated_at: new Date(now - (REWRITE_WINDOW_MS - 15 * 60 * 1000)).toISOString(),
  };

  expect(getRewriteState(alert, now)).toEqual({
    canRewrite: false,
    remainingMin: 15,
  });
});

test("updateUsageList only changes job_alerts usage", () => {
  const result = updateUsageList(
    [
      { feature: "job_alerts", used: 1, limit: 2, remaining: 1 },
      { feature: "cv_analysis", used: 3, limit: 5, remaining: 2 },
    ],
    1,
  );

  expect(result).toEqual([
    { feature: "job_alerts", used: 2, limit: 2, remaining: 0 },
    { feature: "cv_analysis", used: 3, limit: 5, remaining: 2 },
  ]);
});
