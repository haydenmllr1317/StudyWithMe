import assert from "node:assert/strict";
import test from "node:test";
import { avatarBelongsToUser, isAvatarPath } from "./avatar.ts";

const userA = "123e4567-e89b-42d3-a456-426614174000";
const userB = "223e4567-e89b-42d3-a456-426614174000";
const objectId = "323e4567-e89b-42d3-a456-426614174000";

test("accepts only versioned avatar object paths", () => {
  assert.equal(isAvatarPath(`${userA}/avatar-${objectId}.webp`), true);
  assert.equal(isAvatarPath(`${userA}/avatar-${objectId}.gif`), false);
  assert.equal(isAvatarPath("https://example.com/avatar.webp"), false);
  assert.equal(isAvatarPath("../avatar.webp"), false);
});

test("binds an avatar reference to its profile owner", () => {
  const path = `${userA}/avatar-${objectId}.webp`;
  assert.equal(avatarBelongsToUser(path, userA), true);
  assert.equal(avatarBelongsToUser(path, userB), false);
});
