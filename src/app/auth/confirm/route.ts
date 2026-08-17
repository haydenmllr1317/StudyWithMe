import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/redirect";

const allowedTypes = new Set<EmailOtpType>(["email", "email_change", "invite", "magiclink", "recovery", "signup"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const requestedType = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createClient();

  if (tokenHash && requestedType && allowedTypes.has(requestedType)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: requestedType });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
