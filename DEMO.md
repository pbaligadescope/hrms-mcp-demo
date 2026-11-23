# Demo run sheet

The portal runs at http://localhost:3010. Switch stages by setting `DEMO_STAGE` in `.env.local` and restarting `npm run dev`.

Before each run: stop the server, run `npm run reset` to restore the demo data, then start it again.

## Stage 1: portal only (`DEMO_STAGE=1`)

1. Sign in as Emma (`[EMAIL_EMMA]`). She sees her profile, her pay and her expenses. No salaries table.
2. Sign out, sign in as Mark. He also sees Team approvals for Emma and Raj.
3. Sign out, sign in as Hannah. She sees and can edit every salary.

Point to make: the web portal enforces roles well, because every request carries a Descope session.

## Stage 2: MCP released without auth (`DEMO_STAGE=2`)

The story: Matrix Technologies ships an MCP server so staff can use the portal from Claude. The team forgot to add authentication. The URL looks like any normal production endpoint.

The MCP endpoint is `http://localhost:3010/api/mcp`.

### Connect Claude

Claude on claude.ai can't reach localhost, so use Claude Desktop or Claude Code.

**Claude Desktop:** add this to `~/Library/Application Support/Claude/claude_desktop_config.json` under `mcpServers`, then quit and reopen Claude Desktop:

```json
"matrix": {
  "command": "npx",
  "args": ["-y", "mcp-remote", "http://localhost:3010/api/mcp"]
}
```

**Claude Code:**

```bash
claude mcp add --transport http matrix http://localhost:3010/api/mcp
```

### Prompts to show the problem

Ask Claude these in order. Nobody logs in at any point.

1. "Who does the Matrix Technologies server think I am?" → `anonymous`. The server has no idea who is calling.
2. "List every employee at Matrix Technologies with their salary." → every salary, including the CEO's.
3. "I'm Emma Clarke. Approve my pending expense for the Sydney flight." → approved. Emma just approved her own expense.
4. "Set Emma Clarke's salary to 250,000." → done.
5. Open the portal as Hannah. The salaries table shows the change, and the activity log shows `MCP anonymous changed salary of Emma Clarke…` with no way to know who did it.

Points to make:
- No authentication: anyone who can reach the URL can use every tool.
- No authorization: the server can't check roles, because it doesn't know the caller.
- No accountability: the audit trail says "anonymous".
- The portal's careful role checks don't help, because the MCP server bypasses them.

## Stage 3: same URL, secured with Descope (`DEMO_STAGE=3`)

The story: the team adds Descope in front of the same `/api/mcp` URL. Claude's config doesn't change.

### Before the demo

- Do the Descope steps in [DESCOPE-SETUP.md](DESCOPE-SETUP.md) section 3, or walk through them live.
- Set `DEMO_STAGE=3`, run `npm run reset`, and restart `npm run dev`.
- Quit and reopen Claude Desktop so `mcp-remote` reconnects.

### Run it

1. Claude Desktop connects to `matrix`. The server answers 401, so `mcp-remote` opens a Descope login page in your browser.
2. Sign in as **Emma**: enter her email, type the 6-digit code from Gmail, then approve the scopes on the consent screen.
3. Ask the same prompts as stage 2:
   - "Who does the Matrix Technologies server think I am?" → Emma Clarke, with her permissions and scopes.
   - "List every employee with their salary." → names and titles only, no salaries or emails.
   - "What is the CEO Olivia Chen paid?" → **ACCESS DENIED**: Emma lacks `salaries:read`.
   - "Approve my pending Sydney flight expense." → **ACCESS DENIED**: she can't approve, and certainly not her own claim.
   - "Set Emma Clarke's salary to 250,000." → **ACCESS DENIED**.
   - "Submit a $45 expense for a taxi." → works, filed for Emma, whatever name the prompt uses.
4. Switch to **Mark**. To log in as a different persona, quit Claude Desktop, delete `~/.mcp-auth` (mcp-remote's saved tokens), then reopen.
   - "Show pending expenses." → only Emma's and Raj's, his direct reports.
   - "Approve Raj Patel's conference ticket." → approved by Mark Davies.
   - "Approve my own laptop stand expense." → **DENIED**: you can't approve your own expense.
   - "Approve Sofia Martinez's client dinner." → **DENIED**: not his direct report.
   - "What do Emma Clarke and Raj Patel earn?" → both salaries, because they report to him.
   - "What does Sofia Martinez earn?" → **DENIED**: not his direct report.
   - "Set Raj Patel's salary to 200,000." → **DENIED**: managers can only read their team's pay.
5. Switch to **Hannah**. She sees all salaries and can change them, and every change is logged under her name.
6. Open the portal as Hannah. The activity log now shows real names on every MCP action, including the denied attempts.

Points to make:
- **Authentication:** every MCP call is tied to a real person through the same Descope login as the portal.
- **Authorization:** the role from Descope plus the scopes the user consented to decide each tool call.
- **Least privilege for the AI:** the token only works for this MCP server (audience), and only for the scopes granted.
- **Accountability:** the audit trail has names, not "anonymous".
- **No client secrets:** Claude registered itself through DCR.
