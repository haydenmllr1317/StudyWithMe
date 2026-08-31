import assert from "node:assert/strict";
import test from "node:test";
import { activityScopeAllowed, filterActivityCirclesForViewer, parseActivityFeed, parseActivityScope } from "./activity.ts";
import { parseNotifications } from "./notifications.ts";

const circleId = "123e4567-e89b-42d3-a456-426614174000";

test("activity scopes accept only safe built-ins and circle UUIDs", () => {
  assert.equal(parseActivityScope("mine"), "mine");
  assert.equal(parseActivityScope(`circle:${circleId}`), `circle:${circleId}`);
  assert.equal(parseActivityScope("circle:not-a-uuid"), "all_circles");
  assert.equal(activityScopeAllowed(`circle:${circleId}`, [{ id: circleId, name: "Friends", role: "member", memberCount: 2 }]), true);
  assert.equal(activityScopeAllowed(`circle:${circleId}`, []), false);
});

test("activity Circle labels are limited to the viewer's memberships", () => {
  const otherCircleId="223e4567-e89b-42d3-a456-426614174000";
  const labels=[{id:circleId,name:"Circle A"},{id:otherCircleId,name:"Circle B"}];
  assert.deepEqual(filterActivityCirclesForViewer(labels,[{id:circleId}]),[{id:circleId,name:"Circle A"}]);
  assert.deepEqual(filterActivityCirclesForViewer(labels,[{id:circleId},{id:otherCircleId}]),labels);
  assert.deepEqual(filterActivityCirclesForViewer(labels,[]),[]);
});

test("notification parser keeps stable actor and session identities", () => {
  const items=parseNotifications([{id:circleId,sessionId:circleId,actorDisplayName:"Alex",actorUsername:"alex",createdAt:"2026-08-30T18:00:00Z",read:false,recipientEmail:"private@example.com"}]);
  assert.deepEqual(items,[{id:circleId,sessionId:circleId,actorDisplayName:"Alex",actorUsername:"alex",createdAt:"2026-08-30T18:00:00Z",read:false}]);
});

test("activity parser keeps only the feed-safe projection", () => {
  const feed = parseActivityFeed({
    timezone: "America/Denver",
    items: [{ id: circleId, displayName: "A", username: "a_user", goalName: "LSAT", durationSeconds: 3600, completedAt: "2026-08-17T18:00:00Z", rating: 4, sharedNotes: "Focused review", reflectionPhotoPath: `${circleId}/${circleId}/reflection-${circleId}.webp`, circles: [{ id: circleId, name: "Study Friends" }], loveCount: 2, isLoved: true, canLove: true, isCurrentUser: false, privateField: "ignored" }],
    nextCursor: null,
  });
  assert.equal(feed?.items[0]?.goalName, "LSAT");
  assert.equal("privateField" in (feed?.items[0] ?? {}), false);
  assert.equal(feed?.items[0]?.sharedNotes, "Focused review");
  assert.deepEqual(feed?.items[0]?.circles, [{ id: circleId, name: "Study Friends" }]);
  assert.equal(feed?.items[0]?.loveCount, 2);
  assert.equal(feed?.items[0]?.isLoved, true);
  assert.equal(feed?.items[0]?.reflectionPhotoPath, `${circleId}/${circleId}/reflection-${circleId}.webp`);
});
