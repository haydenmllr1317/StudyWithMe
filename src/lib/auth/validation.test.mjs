import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorMessage,
  hasFieldErrors,
  normalizeUsername,
  validateSignup,
} from "./validation.ts";

test("normalizes usernames before validation", () => {
  assert.equal(normalizeUsername("  Calm_Learner  "), "calm_learner");
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

