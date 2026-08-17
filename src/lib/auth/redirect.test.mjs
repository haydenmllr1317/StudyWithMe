import assert from "node:assert/strict";
import test from "node:test";
import { loginPathFor, safeInternalPath } from "./redirect.ts";

test("accepts only same-origin application paths", () => {
  assert.equal(safeInternalPath("/history?range=7"), "/history?range=7");
  assert.equal(safeInternalPath("//attacker.example"), "/today");
  assert.equal(safeInternalPath("https://attacker.example"), "/today");
  assert.equal(safeInternalPath("not-a-path"), "/today");
  assert.equal(safeInternalPath(null, "/login"), "/login");
});

test("preserves protected deep links through login", () => {
  assert.equal(loginPathFor("/join/abc123"), "/login?next=%2Fjoin%2Fabc123");
  assert.equal(loginPathFor("/leaderboard", "?period=month"), "/login?next=%2Fleaderboard%3Fperiod%3Dmonth");
});
