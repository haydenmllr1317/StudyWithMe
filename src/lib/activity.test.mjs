import assert from "node:assert/strict";
import test from "node:test";
import { activityScopeAllowed, parseActivityFeed, parseActivityScope } from "./activity.ts";

const circleId = "123e4567-e89b-42d3-a456-426614174000";

test("activity scopes accept only safe built-ins and circle UUIDs", () => {
  assert.equal(parseActivityScope("mine"), "mine");
  assert.equal(parseActivityScope(`circle:${circleId}`), `circle:${circleId}`);
  assert.equal(parseActivityScope("circle:not-a-uuid"), "everyone");
  assert.equal(activityScopeAllowed(`circle:${circleId}`, [{ id: circleId, name: "Friends", role: "member", memberCount: 2 }]), true);
  assert.equal(activityScopeAllowed(`circle:${circleId}`, []), false);
});

test("activity parser keeps only the feed-safe projection", () => {
  const feed = parseActivityFeed({
    timezone: "America/Denver",
    items: [{ id: circleId, displayName: "A", username: "a_user", avatarPath: `${circleId}/avatar-${circleId}.webp`, goalName: "LSAT", durationSeconds: 3600, completedAt: "2026-08-17T18:00:00Z", rating: 4, sharedNotes: null, notesShared: false, isCurrentUser: false, privateField: "ignored" }],
    nextCursor: null,
  });
  assert.equal(feed?.items[0]?.goalName, "LSAT");
  assert.equal("privateField" in (feed?.items[0] ?? {}), false);
  assert.equal(feed?.items[0]?.sharedNotes, null);
  assert.equal(feed?.items[0]?.avatarPath, `${circleId}/avatar-${circleId}.webp`);
});
