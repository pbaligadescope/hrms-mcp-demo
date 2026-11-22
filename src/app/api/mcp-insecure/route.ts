import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerHrTools } from "@/lib/mcp/tools";

/**
 * STAGE 2: an MCP server with NO authentication.
 *
 * Anyone who can reach this URL gets every tool, and the server has no idea who is calling.
 * This is the "before" picture of the demo. Do not ship anything like this.
 */
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  // Only switched on for Stage 2 (set DEMO_STAGE=2 in .env.local).
  if (process.env.DEMO_STAGE !== "2") {
    return Response.json({ error: "The unsecured MCP server is switched off. Set DEMO_STAGE=2 to turn it on." }, { status: 404 });
  }

  const server = new McpServer({ name: "matrix-technologies-insecure", version: "1.0.0" });
  registerHrTools(server, { kind: "anonymous" }, "mcp-insecure");

  // Stateless: a fresh server and transport per request, JSON responses instead of SSE.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
