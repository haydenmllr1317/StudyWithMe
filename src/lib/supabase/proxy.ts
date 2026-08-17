import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { loginPathFor } from "@/lib/auth/redirect";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPublicPwaRoute = pathname === "/sw.js" || pathname === "/manifest.webmanifest" || pathname === "/offline" || pathname === "/offline.html";
  const isPublicAuthRoute = isAuthPage || pathname.startsWith("/auth/") || pathname === "/signup/check-email" || isPublicPwaRoute;

  if (!url || !publishableKey) {
    if (isPublicAuthRoute) return NextResponse.next({ request });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validates the token and refreshes it when necessary. Do not replace with
  // getSession(), which does not verify the token for authorization decisions.
  const { data, error } = await supabase.auth.getClaims();
  const authenticated = !error && typeof data?.claims?.sub === "string";

  const redirectWithRefreshedCookies = (path: string) => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (isAuthPage && authenticated) return redirectWithRefreshedCookies("/today");
  if (!isPublicAuthRoute && !authenticated) {
    return redirectWithRefreshedCookies(loginPathFor(pathname, request.nextUrl.search));
  }
  return response;
}
