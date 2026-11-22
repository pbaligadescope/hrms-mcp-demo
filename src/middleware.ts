import { authMiddleware } from "@descope/nextjs-sdk/server";

// Every dashboard page requires a valid Descope session. Unauthenticated visitors go to the login page.
export default authMiddleware({
  projectId: process.env.DESCOPE_PROJECT_ID,
  redirectUrl: "/",
  publicRoutes: ["/"],
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
