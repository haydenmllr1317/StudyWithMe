import assert from "node:assert/strict";
import test from "node:test";
import { elapsedSeconds, formatClock, formatDuration, POMODORO_LENGTHS, POMODORO_SECONDS } from "./format.ts";

test("derives elapsed time from timestamps instead of tick counts", () => {
  assert.equal(elapsedSeconds("2026-08-17T10:00:00.000Z", Date.parse("2026-08-17T10:20:15.900Z")), 1215);
});

test("formats open timers and longer sessions", () => {
  assert.equal(formatClock(65), "01:05");
  assert.equal(formatClock(3661), "1:01:01");
  assert.equal(formatDuration(3900), "1h 5m");
});

test("defines the MVP Pomodoro interval as 25 minutes", () => {
  assert.equal(POMODORO_SECONDS, 1500);
  assert.deepEqual(POMODORO_LENGTHS, [25, 50]);
});
