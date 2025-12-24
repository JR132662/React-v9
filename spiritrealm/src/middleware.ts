import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/auth"]);

export default convexAuthNextjsMiddleware(async (request) => {
  const authed = await isAuthenticatedNextjs();

  if (!isPublicPage(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/auth");
  }
 //   TODO: redirect authenticated users away from auth pages
 if (isPublicPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};