export function safeInternalPath(value: unknown, fallback = "/today") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://studywithme.invalid");
    return parsed.origin === "https://studywithme.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function loginPathFor(pathname: string, search = "") {
  const destination = safeInternalPath(`${pathname}${search}`, "/today");
  return `/login?next=${encodeURIComponent(destination)}`;
}
