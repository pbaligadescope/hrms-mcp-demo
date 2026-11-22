# Descope console setup

Every Descope change this demo needs, written as console steps so you can do them live. Everything below already exists in **[DESCOPE_PROJECT]**. To repeat it on stage, use a fresh project, or delete these objects first.

Console: https://app.descope.com. Pick the project from the project switcher at the top left.

Console menu labels change from time to time. If one looks different, search the console for the bold term.

---

## Stage 1: portal login with roles

### 1.1 Permissions

**Authorization → Permissions → + Permission.** Create these 5:

| Name | Description |
| --- | --- |
| `profile:read` | Read own profile and payslip |
| `expenses:submit` | Submit and view own expenses |
| `expenses:approve` | Approve or reject direct reports' expenses |
| `salaries:read` | View all employee salaries |
| `salaries:write` | Change employee salaries |

### 1.2 Roles

**Authorization → Roles → + Role.** Create these 3 and tick their permissions:

| Role | Permissions |
| --- | --- |
| **Employee** | `profile:read`, `expenses:submit` |
| **Manager** | `profile:read`, `expenses:submit`, `expenses:approve` |
| **HR Admin** | all 5 |

Talking point: Descope puts the user's roles and permissions in their session token, and the portal reads them from there. The app has no role table of its own.

### 1.3 Users

**Users → + User.** Create one per persona. Set Login ID and Email to the same address, fill in the name, and add the role under **Roles**:

| Name | Login ID / email | Role |
| --- | --- | --- |
| Emma Clarke | `[EMAIL_EMMA]` | Employee |
| Mark Davies | `[EMAIL_MARK]` | Manager |
| Hannah Lee | `[EMAIL_HANNAH]` | HR Admin |

Each user's status shows **Invited** until their first login. After you create a user, copy its **User ID** (it starts with `U`) into `src/lib/seed.ts` as that employee's `descopeUserId`. That's how the app links a Descope user to an employee record.

### 1.4 Login flow

**Flows → Sign Up or In** (`sign-up-or-in`). Use it as it is: magic link by email, with name collected on sign-up. The portal renders it with `<Descope flowId="sign-up-or-in" />`. Nothing to change.

Optional for the demo: open the flow to show the magic link step.

### 1.5 Project ID

**Project Settings → General → Project ID** (`P3MSmEHghEmtezkjowOSa5RjqRW3`). This is the only Descope value the app needs, in `.env.local`.

---

## Stage 2: MCP released without auth

**No Descope changes.** That's the point of this stage: the MCP server went live with no identity provider in front of it.

---

## Stage 3: secure the MCP server with Descope

### 3.1 Create the MCP Server

**Agentic Identity Hub → MCP Servers → + MCP Server.** The same object also appears under **Resources**.

- **Name:** `Matrix Technologies HR`
- **Description:** MCP server for the Matrix Technologies HR and expenses portal
- **MCP Server URL:** `http://localhost:3010/api/mcp`

  Talking point: Descope writes this URL into every access token as the **audience** (`aud`). The MCP server rejects tokens issued for any other app, so a stolen portal session token is useless here.

### 3.2 Scopes

In the MCP Server's **Scopes** section, add 4 scopes. Map each one to the permissions it unlocks:

| Scope | Description | Maps to permissions | Optional |
| --- | --- | --- | --- |
| `hr:profile` | See your own profile and pay | `profile:read` | no |
| `hr:expenses` | See and submit your own expenses | `expenses:submit` | no |
| `hr:approvals` | Approve or reject your team's expenses | `expenses:approve` | yes |
| `hr:salaries` | See and change employee salaries | `salaries:read`, `salaries:write` | yes |

Talking point: the scopes are about what the AI client is allowed to do. The roles are about what the person is allowed to do. The MCP server only allows an action when both say yes.

### 3.3 Access

- **User access:** Allow
- **Client access:** Allow

These could be changed to **Allow via policy** later, to restrict which users or AI clients may connect at all.

### 3.4 Client registration and login

In the MCP Server's **Client Registration** / **Settings** section:

- **Issuer:** per MCP server (`mcpServer`). Each MCP server gets its own issuer and discovery URL.
- **Dynamic Client Registration (DCR): On.** Claude registers itself the first time it connects, so nobody pastes a client ID or secret.
- **User Consent Flow:** `sign-up-or-in`. This is the same magic link login the portal uses.
- **Login page URL:** `https://api.descope.com/login/P3MSmEHghEmtezkjowOSa5RjqRW3` (the Descope-hosted login page).
- **Skip consent screen:** off. The user sees which scopes Claude is asking for.
- **Always include all user authorization info on the token:** **On**. The token then carries the user's roles and permissions, and the MCP server combines them with the granted scopes.

Save.

### 3.5 Copy the discovery and issuer URLs

The MCP Server page shows its **Discovery URL** under **Usage samples**:

```
https://api.descope.com/v1/apps/agentic/P3MSmEHghEmtezkjowOSa5RjqRW3/RS3MT5UoEefFbPplpfgBeUzRGsuNC/.well-known/openid-configuration
```

The issuer is the same URL without `/.well-known/openid-configuration`. The app uses it in `src/lib/mcp/descope-auth.ts`. The MCP Server ID (`RS3MT5UoEefFbPplpfgBeUzRGsuNC`) is also there, and can be overridden with `DESCOPE_MCP_SERVER_ID`.

### 3.6 After the demo runs: what to show

- **Agentic Identity Hub → MCP Servers → Matrix Technologies HR → Clients:** the Claude client that registered itself through DCR.
- **Audit:** the OAuth authorization and token events for Emma, Mark and Hannah.
- **Users → (persona):** the same user record is used for the portal and for MCP, with one identity across both channels.

---

## What the MCP server code does (for the "how" question)

In `src/lib/mcp/descope-auth.ts` and `src/app/api/mcp/route.ts`:

1. **No token:** it answers `401` with a `WWW-Authenticate` header that points to `/.well-known/oauth-protected-resource/api/mcp`.
2. **That metadata** names the Descope MCP Server issuer as the authorization server. The client discovers Descope, registers itself, and sends the user to log in.
3. **Every request:** it verifies the token's signature against Descope's published keys, plus its issuer, its expiry, and that the audience is `http://localhost:3010/api/mcp`.
4. It looks up the employee by the token's `sub`, which is the Descope user ID.
5. **Effective permissions** are the user's Descope permissions that the granted scopes allow. Each tool checks them, and records denials in the activity log under the user's real name.
