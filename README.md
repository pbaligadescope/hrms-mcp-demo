# Matrix Technologies: MCP security demo

A demo of a web portal that gains MCP access, in three stages:

1. **Stage 1 (this build):** an HR and expenses portal with Descope login (magic link). No MCP.
2. **Stage 2 (next):** the same portal plus an MCP server with **no auth**, to show the problem.
3. **Stage 3 (next):** the MCP server secured with Descope OAuth, so each persona gets the right data or a denial.

Claude is the MCP client in stages 2 and 3.

## Personas

| Persona | Role | Email | Can do |
| --- | --- | --- | --- |
| Emma Clarke | Employee | [EMAIL_EMMA] | See own profile and pay, submit expenses |
| Mark Davies | Manager | [EMAIL_MARK] | Everything Emma can, plus approve his team's expenses |
| Hannah Lee | HR Admin | [EMAIL_HANNAH] | Everything, including viewing and changing all salaries |

Roles and permissions live in the Descope project **[DESCOPE_PROJECT]**:

| Permission | Employee | Manager | HR Admin |
| --- | :-: | :-: | :-: |
| `profile:read` | ✓ | ✓ | ✓ |
| `expenses:submit` | ✓ | ✓ | ✓ |
| `expenses:approve` | | ✓ | ✓ |
| `salaries:read` | | | ✓ |
| `salaries:write` | | | ✓ |

## Run it locally

Needs Node.js 20 or newer.

```bash
cp .env.example .env.local   # already points at [DESCOPE_PROJECT]
npm install
npm run dev
```

Open http://localhost:3000, enter one of the persona emails, and click the magic link in Gmail.

To put the demo data back to its starting state, stop the server and run `npm run reset`.

## How it works

- `src/app/page.tsx` renders the Descope `sign-up-or-in` flow.
- `src/middleware.ts` blocks `/dashboard` without a valid Descope session.
- `src/lib/auth.ts` validates the session on the server and reads `roles` and `permissions` from the Descope JWT.
- `src/app/dashboard/actions.ts` checks the permission again on the server for every change.
- `src/lib/db.ts` keeps the data in `data/db.json`, so the portal and the MCP servers (stages 2 and 3) share it.
- The activity log on the dashboard records who did what and through which channel (portal or MCP).
