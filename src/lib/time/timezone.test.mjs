import assert from "node:assert/strict";
import test from "node:test";
import { isValidTimeZone } from "./timezone.ts";

test("accepts IANA timezones and rejects invalid values", () => {
  assert.equal(isValidTimeZone("America/Denver"), true);
  assert.equal(isValidTimeZone("Asia/Tokyo"), true);
  assert.equal(isValidTimeZone("Not/A_Zone"), false);
  assert.equal(isValidTimeZone(""), false);
});
