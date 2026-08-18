import assert from "node:assert/strict";
import test from "node:test";
import { analyticsRanges, parseAnalyticsData, parseAnalyticsRange } from "./analytics.ts";

test("analytics accepts the shared timeframes and defaults safely", () => {
  for (const range of analyticsRanges) assert.equal(parseAnalyticsRange(range), range);
  assert.equal(parseAnalyticsRange("forever"), "30d");
  assert.equal(parseAnalyticsRange(["7d"]), "30d");
});

test("analytics parser keeps aggregate fields only", () => {
  const parsed = parseAnalyticsData({ scope: "circle", range: "7d", timezone: "America/Denver", totalSeconds: 3600, daily: [{ date: "2026-08-17", seconds: 3600, sessionId: "private" }], goals: [], leaderboard: [{ displayName: "Avery", username: "avery", avatarPath: "safe/path.webp", durationSeconds: 3600, rank: 1 }], members: [{ userId: "member-1", displayName: "Avery", username: "avery", durationSeconds: 3600, isCurrentUser: true, daily: [{ date: "2026-08-17", seconds: 3600, sessionId: "private" }] }] });
  assert.deepEqual(parsed?.daily, [{ date: "2026-08-17", seconds: 3600, goals: [] }]);
  assert.deepEqual(parsed?.goals, []);
  assert.equal(parsed?.leaderboard[0]?.avatarPath, "safe/path.webp");
  assert.deepEqual(parsed?.members[0]?.daily, [{ date: "2026-08-17", seconds: 3600, goals: [] }]);
});
