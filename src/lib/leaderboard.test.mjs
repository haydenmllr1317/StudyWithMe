import assert from "node:assert/strict";
import test from "node:test";
import { parseLeaderboardData, parseLeaderboardPeriod } from "./leaderboard.ts";

test("leaderboard period defaults to week and accepts supported values", () => {
  assert.equal(parseLeaderboardPeriod(undefined), "week");
  assert.equal(parseLeaderboardPeriod("all"), "all");
  assert.equal(parseLeaderboardPeriod("year"), "week");
});

test("leaderboard response parser preserves rank and zero-time current user", () => {
  const parsed = parseLeaderboardData({ period: "today", timezone: "America/Denver", totalParticipants: 1, top: [{ displayName: "Avery", username: "avery", durationSeconds: 3600, rank: 1, isCurrentUser: false }], currentUser: { displayName: "Blair", username: "blair", durationSeconds: 0, rank: null, includedInTop: false } });
  assert.equal(parsed?.top[0]?.rank, 1);
  assert.equal(parsed?.currentUser?.rank, null);
  assert.equal(parsed?.currentUser?.durationSeconds, 0);
});
