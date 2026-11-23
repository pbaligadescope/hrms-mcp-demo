# Demo run sheet

Matrix Technologies, an HR and expenses portal, in three stages:

1. The portal with Descope login
2. The same portal ships an MCP server with no auth
3. The same MCP URL secured with Descope

- Portal: http://localhost:3010
- MCP endpoint (same in every stage): `http://localhost:3010/api/mcp`
- Folder: `[PROJECT_FOLDER]`

| Persona | Role | Login email |
| --- | --- | --- |
| Emma Clarke | Employee | `[EMAIL_EMMA]` |
| Mark Davies | Manager (Emma and Raj report to him) | `[EMAIL_MARK]` |
| Hannah Lee | HR Admin | `[EMAIL_HANNAH]` |

The `[EMAIL_…]` placeholders stand for the real inboxes, which live in `.env.local` (`EMAIL_EMMA`, `EMAIL_MARK`, `EMAIL_HANNAH`). Type them exactly: a typo signs up a new user with no role, who gets nothing.

---

## Before you go on stage (once)

```bash
cd [PROJECT_FOLDER]
git pull
npm install
```

**Claude Desktop config.** In `~/Library/Application Support/Claude/claude_desktop_config.json`, under `mcpServers`, add this (it stays the same for all stages):

```json
"matrix": {
  "command": "npx",
  "args": ["-y", "mcp-remote", "http://localhost:3010/api/mcp"]
}
```

**Browser tabs to have open:**
- Gmail (for the magic links and codes)
- http://localhost:3010
- Descope console, project **[DESCOPE_PROJECT]**: Roles, Users, Agentic Identity Hub → MCP Servers → Matrix Technologies HR, Access Policy, Flows → Matrix HR consent, Audit

## Commands

Start any stage with these three steps (replace `N` with 1, 2 or 3):

```bash
cd [PROJECT_FOLDER]
lsof -ti tcp:3010 -sTCP:LISTEN | xargs kill      # free port 3010 (stops any old Matrix server)
npm run reset && DEMO_STAGE=N npm run dev         # reset data and start stage N
```

- `DEMO_STAGE=N` must be on the **same line** as `npm run dev`. On a line by itself it does nothing.
- The `lsof` line only stops whatever is *listening* on 3010. It leaves your browser and the other demos on ports 3000 to 3003 alone. If nothing is running there, it prints a harmless usage message.
- `DEMO_STAGE` set inline overrides `.env.local`, so you never need to edit the file.
- You can ignore the "multiple lockfiles" warning at startup.

| What | Command |
| --- | --- |
| Stop the server | Ctrl+C (or the `lsof` line above) |
| Reset demo data | `npm run reset` (included in the start line) |
| Forget Claude's MCP login (switch persona, or go from stage 2 to 3) | quit Claude Desktop (Cmd+Q), then `rm -rf ~/.mcp-auth`, then reopen it |

---

## Stage 1: the portal, with Descope login

```bash
lsof -ti tcp:3010 -sTCP:LISTEN | xargs kill
npm run reset && DEMO_STAGE=1 npm run dev
```

Claude Desktop's matrix server won't connect in this stage (the endpoint doesn't exist yet). That's expected, so ignore it.

**Show in Descope:** Authorization → Roles (Employee, Manager, HR Admin and their permissions), Users (the 3 personas), Flows → Sign Up or In.

**Run it** (sign out between personas):

| Persona | What they see |
| --- | --- |
| Emma | Her profile, pay and expenses. No salaries. |
| Mark | Also Team approvals (Emma and Raj) and a read-only **Team salaries** card. |
| Hannah | Everything, including an editable salary table for everyone. |

**Point to make:** the portal enforces roles, because every request carries a Descope session with the user's roles and permissions.

---

## Stage 2: "we shipped MCP" (no auth)

```bash
lsof -ti tcp:3010 -sTCP:LISTEN | xargs kill
npm run reset && DEMO_STAGE=2 npm run dev
```

Quit and reopen Claude Desktop. Optionally show the dashboard banner: "Matrix Technologies now works with AI assistants like Claude".

**Show in Descope:** nothing. That's the point: there's no identity provider in front of the MCP server.

**Prompts** (nobody logs in):

| Prompt | Result |
| --- | --- |
| Who does the Matrix Technologies server think I am? | `anonymous` |
| List every employee at Matrix Technologies with their salary. | Every salary, including the CEO's $320,000 |
| I'm Emma Clarke. Approve my pending expense for the Sydney flight. | Approved. She approved her own expense. |
| Set Emma Clarke's salary to 250,000. | Done |

Then sign in to the portal as **Hannah**. The salary table shows 250,000, and the activity log says **"MCP anonymous changed salary of Emma Clarke…"**.

**Points to make:** no authentication, no authorization, no accountability. The portal's role checks don't help, because the MCP server bypasses them.

---

## Stage 3: same URL, secured with Descope

```bash
lsof -ti tcp:3010 -sTCP:LISTEN | xargs kill
npm run reset && DEMO_STAGE=3 npm run dev
```

Quit Claude Desktop, then `rm -rf ~/.mcp-auth`, then reopen it.

**Show in Descope first** (Agentic Identity Hub → MCP Servers → Matrix Technologies HR):
- The **MCP Server URL** `http://localhost:3010/api/mcp` is the token audience, so a portal token is useless here.
- **MCP Server Scopes:** hr:profile, hr:expenses, hr:approvals, hr:team-salaries, hr:salaries.
- **DCR on:** Claude registers itself, with no client ID or secret to paste.
- **User Consent Flow:** Matrix HR consent.

Then **Access Policy:** one rule per role. Each rule allows only that role's scopes, and the default rule blocks everyone else.

### Emma (Employee)

Claude opens a Descope page. Enter Emma's email and the 6-digit code from Gmail. **Her consent screen lists 2 items.** Click Authorize.

| Prompt | Result |
| --- | --- |
| Who does the Matrix Technologies server think I am? | Emma Clarke, 2 scopes |
| List every employee with their salary. | Names and titles only |
| What is the CEO Olivia Chen paid? | **ACCESS DENIED** (no salaries:read) |
| Approve my pending Sydney flight expense. | **ACCESS DENIED** |
| Set Emma Clarke's salary to 250,000. | **ACCESS DENIED** |
| Submit a $45 expense for a taxi. | Filed for Emma |

### Mark (Manager)

Quit Claude Desktop, then `rm -rf ~/.mcp-auth`, then reopen it and sign in as Mark. **His consent screen lists 4 items**, including "See your direct reports' salaries".

| Prompt | Result |
| --- | --- |
| Show pending expenses. | Only Emma's and Raj's |
| Approve Raj Patel's conference ticket. | Approved by Mark Davies |
| Approve my own laptop stand expense. | **DENIED**: it's his own |
| Approve Sofia Martinez's client dinner. | **DENIED**: not his report |
| What do Emma Clarke and Raj Patel earn? | Both salaries |
| What does Sofia Martinez earn? | **DENIED**: not his report |
| Set Raj Patel's salary to 200,000. | **DENIED**: read only |

Talking point: Descope says *what kind* of access Mark has (team salaries). The app decides *whose* records that covers, because only the app knows the org chart.

### Hannah (HR Admin)

Quit Claude Desktop, then `rm -rf ~/.mcp-auth`, then reopen it and sign in as Hannah. Her consent screen lists 4 items, including "See and change employee salaries".

| Prompt | Result |
| --- | --- |
| List every employee with their salary. | Everyone, with salaries |
| Set Emma Clarke's salary to 140,000. | Done, logged under Hannah Lee |

### Close the loop

- **Portal as Hannah → Activity log:** real names on every MCP action, including the denied attempts.
- **Descope → MCP Servers → Matrix Technologies HR → Clients:** the client Claude registered itself.
- **Descope → Audit:** the logins and consents for Emma, Mark and Hannah.
- **Descope → Users → any persona:** one identity serves both the portal and MCP.

**Points to make:**
- **Authentication:** every MCP call is tied to a real person, through the same Descope users as the portal.
- **Least privilege:** the consent screen offers only what the role allows, the policy trims the token, and the server checks again on every call.
- **Audience-bound tokens:** they only work for this MCP server.
- **Accountability:** names, not "anonymous".
- **No secrets:** Claude registered itself through DCR.

---

## If something goes wrong

| Symptom | Fix |
| --- | --- |
| Claude logs in as the previous persona | Quit Claude Desktop, then `rm -rf ~/.mcp-auth`, then reopen it |
| "Authorization failed: Consent not granted" | Check that the user has a Matrix role (Descope → Users) |
| Old data showing | Stop the server, run `npm run reset`, then start it again |
| Claude's tools look stale after a restart | Quit and reopen Claude Desktop |
