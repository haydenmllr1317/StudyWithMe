export const usernamePattern = /^[a-z0-9][a-z0-9_]{2,29}$/;

export type AuthField = "displayName" | "email" | "password" | "username";

export type ProfileFieldErrors = Partial<Record<"displayName" | "username", string>>;

export type AuthActionState = {
  message?: string;
  fieldErrors?: Partial<Record<AuthField, string>>;
};

export const initialAuthState: AuthActionState = {};

export function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeUsername(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function readText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function readPassword(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export function validateLogin(formData: FormData): AuthActionState["fieldErrors"] {
  const errors: AuthActionState["fieldErrors"] = {};
  const email = normalizeEmail(formData.get("email"));
  const password = readPassword(formData.get("password"));

  if (!email || !email.includes("@")) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";

  return errors;
}

export function validateSignup(formData: FormData): AuthActionState["fieldErrors"] {
  const errors = validateLogin(formData) ?? {};
  const username = normalizeUsername(formData.get("username"));
  const displayName = readText(formData.get("displayName"));
  const password = readPassword(formData.get("password"));

  if (!usernamePattern.test(username)) {
    errors.username = "Use 3–30 lowercase letters, numbers, or underscores; start with a letter or number.";
  }
  if (!displayName || displayName.length > 80) {
    errors.displayName = "Enter a display name between 1 and 80 characters.";
  }
  if (password.length < 8) errors.password = "Use at least 8 characters.";

  return errors;
}

export function validateProfileNames(formData: FormData) {
  const errors: ProfileFieldErrors = {};
  const username = normalizeUsername(formData.get("username"));
  const displayName = readText(formData.get("displayName"));
  if (!usernamePattern.test(username)) errors.username = "Use 3–30 lowercase letters, numbers, or underscores; start with a letter or number.";
  if (!displayName || displayName.length > 80) errors.displayName = "Enter a display name between 1 and 80 characters.";
  return Object.keys(errors).length ? { errors } : { data: { display_name: displayName, username } };
}

export function hasFieldErrors(errors: AuthActionState["fieldErrors"]) {
  return Boolean(errors && Object.keys(errors).length > 0);
}

export function authErrorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials":
      return "The email or password is incorrect.";
    case "email_not_confirmed":
      return "Confirm your email before signing in.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Try signing in.";
    case "weak_password":
      return "That password is too weak. Use a longer, less predictable password.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a moment, then try again.";
    case "signup_disabled":
      return "New accounts are temporarily unavailable.";
    default:
      return "We couldn’t reach the account service. Check your connection and try again.";
  }
}
