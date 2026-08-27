import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorMessage,
  hasFieldErrors,
  normalizeUsername,
  validateProfileNames,
  validateSignup,
} from "./validation.ts";

test("normalizes usernames before validation", () => {
  assert.equal(normalizeUsername("  Calm_Learner  "), "calm_learner");
});

test("validates editable profile names with the signup username rules", () => {
  const valid = new FormData();
  valid.set("displayName", "  Avery Stone  ");
  valid.set("username", "  AVERY_7  ");
  assert.deepEqual(validateProfileNames(valid).data, { display_name: "Avery Stone", username: "avery_7" });

  const invalid = new FormData();
  invalid.set("displayName", " ");
  invalid.set("username", "_no");
  const result = validateProfileNames(invalid);
  assert.match(result.errors?.displayName ?? "", /1 and 80/);
  assert.match(result.errors?.username ?? "", /3–30/);
});

test("rejects malformed signup values", () => {
  const formData = new FormData();
  formData.set("email", "not-an-email");
  formData.set("password", "short");
  formData.set("username", "_no");
  formData.set("displayName", "");
  const errors = validateSignup(formData);

  assert.equal(hasFieldErrors(errors), true);
  assert.match(errors?.username ?? "", /3–30/);
  assert.match(errors?.password ?? "", /8 characters/);
});

test("maps credential failures without exposing provider details", () => {
  assert.equal(authErrorMessage("invalid_credentials"), "The email or password is incorrect.");
  assert.doesNotMatch(authErrorMessage("unknown_internal_code"), /Supabase|database|JWT/i);
});
