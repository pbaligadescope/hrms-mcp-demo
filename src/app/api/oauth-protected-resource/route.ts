import { AUTH_SERVER_URL, RESOURCE_URL, SCOPE_PERMISSIONS } from "@/lib/mcp/descope-auth";

/**
 * OAuth Protected Resource Metadata (RFC 9728) for the MCP server.
 * Served at /.well-known/oauth-protected-resource (and .../api/mcp) via a rewrite in next.config.ts.
 * MCP clients read this to learn that Descope is the authorization server.
 */
export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.DEMO_STAGE !== "3") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(
    {
      resource: RESOURCE_URL,
      authorization_servers: [AUTH_SERVER_URL],
      bearer_methods_supported: ["header"],
      scopes_supported: Object.keys(SCOPE_PERMISSIONS),
      resource_name: "Matrix Technologies HR",
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
