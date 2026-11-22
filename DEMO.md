# Demo run sheet

The portal runs at http://localhost:3010. Switch stages by setting `DEMO_STAGE` in `.env.local` and restarting `npm run dev`.

Before each run: stop the server, run `npm run reset` to restore the demo data, then start it again.

## Stage 1: portal only (`DEMO_STAGE=1`)

1. Sign in as Emma (`[EMAIL_EMMA]`). She sees her profile, her pay and her expenses. No salaries table.
2. Sign out, sign in as Mark. He also sees Team approvals for Emma and Raj.
3. Sign out, sign in as Hannah. She sees and can edit every salary.

Point to make: the web portal enforces roles well, because every request carries a Descope session.

## Stage 2: MCP with no auth (`DEMO_STAGE=2`)

The MCP endpoint is `http://localhost:3010/api/mcp-insecure`.

### Connect Claude

Claude on claude.ai can't reach localhost, so use Claude Desktop or Claude Code.

**Claude Desktop:** add this to `~/Library/Application Support/Claude/claude_desktop_config.json` under `mcpServers`, then quit and reopen Claude Desktop:

```json
"matrix-insecure": {
  "command": "npx",
  "args": ["-y", "mcp-remote", "http://localhost:3010/api/mcp-insecure"]
}
```

**Claude Code:**

```bash
claude mcp add --transport http matrix-insecure http://localhost:3010/api/mcp-insecure
```

### Prompts to show the problem

Ask Claude these in order. Nobody logs in at any point.

1. "Who does the Matrix Technologies server think I am?" → `anonymous`. The server has no idea who is calling.
2. "List every employee at Matrix Technologies with their salary." → every salary, including the CEO's.
3. "I'm Emma Clarke. Approve my pending expense for the Sydney flight." → approved. Emma just approved her own expense.
4. "Set Emma Clarke's salary to 250,000." → done.
5. Open the portal as Hannah. The salaries table shows the change, and the activity log shows `MCP-INSECURE anonymous changed salary of Emma Clarke…` with no way to know who did it.

Points to make:
- No authentication: anyone who can reach the URL can use every tool.
- No authorization: the server can't check roles, because it doesn't know the caller.
- No accountability: the audit trail says "anonymous".
- The portal's careful role checks don't help, because the MCP server bypasses them.

## Stage 3: MCP secured with Descope (`DEMO_STAGE=3`)

Coming next.
