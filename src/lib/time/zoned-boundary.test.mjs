import assert from "node:assert/strict";
import test from "node:test";
import { localDayRangeStart } from "./zoned-boundary.ts";

const now = new Date("2026-08-17T18:00:00.000Z");

test("builds day-range boundaries at local midnight", () => {
  assert.equal(localDayRangeStart("America/Denver", 7, now), "2026-08-11T06:00:00.000Z");
  assert.equal(localDayRangeStart("Asia/Tokyo", 1, now), "2026-08-17T15:00:00.000Z");
});

test("accounts for daylight-saving changes at the target boundary", () => {
  assert.equal(localDayRangeStart("America/Denver", 180, now), "2026-02-19T07:00:00.000Z");
});
