import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerHrTools, type Caller } from "@/lib/mcp/tools";

/**
 * The Matrix Technologies MCP server, at the same URL in every stage.
 *
 * DEMO_STAGE=1  MCP not released yet: returns 404.
 * DEMO_STAGE=2  Released without authentication (the "before" story). Every caller is anonymous,
 *               so the server cannot check who is calling or what they may do.
 * DEMO_STAGE=3  Secured with Descope OAuth: every request needs a valid Descope access token.
 */
export const dynamic = "force-dynamic";

async function serve(request: Request, caller: Caller): Promise<Response> {
  const server = new McpServer({ name: "matrix-technologies", version: "1.0.0" });
  registerHrTools(server, caller, "mcp");

  // Stateless: a fresh server and transport per request, JSON responses instead of SSE.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

async function handle(request: Request): Promise<Response> {
  const stage = process.env.DEMO_STAGE ?? "1";

  if (stage === "2") {
    return serve(request, { kind: "anonymous" });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

export { handle as GET, handle as POST, handle as DELETE };
