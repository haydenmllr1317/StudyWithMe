import assert from "node:assert/strict";
import test from "node:test";
import { analyticsRanges, parseAnalyticsData, parseAnalyticsRange } from "./analytics.ts";

test("analytics accepts the shared timeframes and defaults safely", () => {
  for (const range of analyticsRanges) assert.equal(parseAnalyticsRange(range), range);
  assert.equal(parseAnalyticsRange("forever"), "30d");
  assert.equal(parseAnalyticsRange(["7d"]), "30d");
});

test("analytics parser keeps aggregate fields only", () => {
  const parsed = parseAnalyticsData({ scope: "circle", range: "7d", timezone: "America/Denver", totalSeconds: 3600, daily: [{ date: "2026-08-17", seconds: 3600, sessionId: "private" }], goals: [{ name: "LSAT", seconds: 3600, userId: "private" }], leaderboard: [{ displayName: "Avery", username: "avery", avatarPath: "safe/path.webp", durationSeconds: 3600, rank: 1 }] });
  assert.deepEqual(parsed?.daily, [{ date: "2026-08-17", seconds: 3600 }]);
  assert.deepEqual(parsed?.goals, [{ name: "LSAT", seconds: 3600 }]);
  assert.equal(parsed?.leaderboard[0]?.avatarPath, "safe/path.webp");
});
