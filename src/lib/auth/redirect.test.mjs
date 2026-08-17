import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalPath } from "./redirect.ts";

test("accepts only same-origin application paths", () => {
  assert.equal(safeInternalPath("/history?range=7"), "/history?range=7");
  assert.equal(safeInternalPath("//attacker.example"), "/today");
  assert.equal(safeInternalPath("https://attacker.example"), "/today");
  assert.equal(safeInternalPath("not-a-path"), "/today");
  assert.equal(safeInternalPath(null, "/login"), "/login");
});
