import assert from "node:assert/strict";
import test from "node:test";
import { formatMinutes, splitMinutes, validateGoalForm } from "./validation.ts";

function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }

test("accepts a trimmed goal with optional targets", () => {
  const result = validateGoalForm(form({ name: "  LSAT  ", description: "  October exam  ", dailyHours: "1", dailyMinutes: "30", weeklyHours: "8", weeklyMinutes: "0" }));
  assert.deepEqual(result.data, { name: "LSAT", description: "October exam", daily_target_minutes: 90, weekly_target_minutes: 480 });
});

test("allows targets to remain unset", () => {
  const result = validateGoalForm(form({ name: "Physics GRE" }));
  assert.equal(result.data?.daily_target_minutes, null);
  assert.equal(result.data?.weekly_target_minutes, null);
});

test("rejects empty names and invalid minute fields", () => {
  const result = validateGoalForm(form({ name: " ", dailyMinutes: "60" }));
  assert.equal(result.errors?.name, "Give this goal a name.");
  assert.match(result.errors?.dailyTarget ?? "", /0–59/);
});

test("formats and splits stored minute totals", () => {
  assert.deepEqual(splitMinutes(95), { hours: "1", minutes: "35" });
  assert.equal(formatMinutes(95), "1h 35m");
  assert.equal(formatMinutes(null), "Not set");
  assert.equal(formatMinutes(0), "0m");
});
