import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import type { NextResponse } from "next/server";

// Public routes: auth pages and join-by-code pages.
// - /auth, /auth/... should be public
// - /join/<dynamic> should be public
const isPublicPage = createRouteMatcher([/^\/auth(\/.*)?$/, /^\/join(\/.*)?$/]);

// Auth pages specifically. We only redirect authenticated users away from these,
// not from other public pages like /join/*.
const isAuthPage = createRouteMatcher([/^\/auth(\/.*)?$/]);

function isLocalHost(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function clearConvexAuthCookies(request: Request, response: NextResponse) {
  const host = request.headers.get("host") ?? "";
  const secure = !isLocalHost(host);
  const prefix = secure ? "__Host-" : "";
  const cookieNames = [
    `${prefix}__convexAuthJWT`,
    `${prefix}__convexAuthRefreshToken`,
    `${prefix}__convexAuthOAuthVerifier`,
    "__convexAuthJWT",
    "__convexAuthRefreshToken",
    "__convexAuthOAuthVerifier",
    "__Host-__convexAuthJWT",
    "__Host-__convexAuthRefreshToken",
    "__Host-__convexAuthOAuthVerifier",
  ];

  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      secure,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  }
}

export default convexAuthNextjsMiddleware(async (request, ctx) => {
  const token = await ctx.convexAuth.getToken();
  const authed = await ctx.convexAuth.isAuthenticated();
  const accept = request.headers.get("accept") ?? "";
  const isPageNavigation = accept.includes("text/html");
  const shouldClearCookies = token !== undefined && !authed && isPageNavigation;

  const url = new URL(request.url);
  const redirectParam = url.searchParams.get("redirect");
  const safeRedirectTo =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/";

  if (!isPublicPage(request) && !authed) {
    const response = nextjsMiddlewareRedirect(request, "/auth");
    if (shouldClearCookies) {
      clearConvexAuthCookies(request, response);
    }
    return response;
  }

  // Redirect authenticated users away from the auth screen.
  if (isAuthPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, safeRedirectTo);
  }

  // For non-redirecting requests, leave cookies untouched.
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};