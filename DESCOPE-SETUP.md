# Descope console setup

Every Descope change this demo needs, written as console steps so you can do them live. Everything below already exists in **[DESCOPE_PROJECT]**. To repeat it on stage, use a fresh project, or delete these objects first.

Console: https://app.descope.com. Pick the project from the project switcher at the top left.

Console menu labels change from time to time. If one looks different, search the console for the bold term.

---

## Stage 1: portal login with roles

### 1.1 Permissions

**Authorization → Permissions → + Permission.** Create these 6:

| Name | Description |
| --- | --- |
| `profile:read` | Read own profile and payslip |
| `expenses:submit` | Submit and view own expenses |
| `expenses:approve` | Approve or reject direct reports' expenses |
| `salaries:read` | View all employee salaries |
| `salaries:read:team` | View salaries of your direct reports (read only) |
| `salaries:write` | Change employee salaries |

### 1.2 Roles

**Authorization → Roles → + Role.** Create these 3 and tick their permissions:

| Role | Permissions |
| --- | --- |
| **Employee** | `profile:read`, `expenses:submit` |
| **Manager** | `profile:read`, `expenses:submit`, `expenses:approve`, `salaries:read:team` |
| **HR Admin** | `profile:read`, `expenses:submit`, `expenses:approve`, `salaries:read`, `salaries:write` |

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

### 3.2 MCP Server Scopes

In the MCP Server's **MCP Server Scopes** section, add 5 scopes. Leave **Connection scope mapping** empty, because these tools don't call third-party APIs:

| Scope | Description | Optional |
| --- | --- | --- |
| `hr:profile` | See your own profile and pay | no |
| `hr:expenses` | See and submit your own expenses | no |
| `hr:approvals` | Approve or reject your team's expenses | yes |
| `hr:team-salaries` | See your direct reports' salaries | yes |
| `hr:salaries` | See and change employee salaries | yes |

Use MCP Server Scopes here, not the role or permission scope mapping you'd use on an API Resource. Clients that register themselves (DCR) can only request MCP Server Scopes. A permission-mapped scope fails at login with `Received invalid scope. valid=[], invalid=[hr:...]`.

The MCP server maps each scope to the role permissions it unlocks (in `src/lib/mcp/descope-auth.ts`):

| Scope | Unlocks permissions |
| --- | --- |
| `hr:profile` | `profile:read` |
| `hr:expenses` | `expenses:submit` |
| `hr:approvals` | `expenses:approve` |
| `hr:team-salaries` | `salaries:read:team` (the server also limits it to the caller's direct reports, read only) |
| `hr:salaries` | `salaries:read`, `salaries:write` |

Talking point: the scopes are what the user lets the AI client do, and the user ticks them on the consent screen. The role is what the person is allowed to do, and it comes from Descope in the token. The MCP server only allows an action when both say yes. So even if Emma grants `hr:salaries`, she still can't see salaries, because her role doesn't have `salaries:read`.

### 3.3 Access

- **User access:** Allow for now. Section 3.4b switches it to **Allow via policy**.
- **Client access:** Allow

### 3.4 Client registration and login

In the MCP Server's **Settings** (client registration) section:

- **Issuer:** per MCP server (`mcpServer`). Each MCP server gets its own issuer and discovery URL.
- **Dynamic Client Registration (DCR): On.** Claude registers itself the first time it connects, so nobody pastes a client ID or secret.
- **Client Registration Flow: leave empty.** This optional field takes a *management* flow that runs after a client registers, for example to vet or tag new clients. A login flow such as `sign-up-or-in` does **not** belong here. If one is set, every registration fails with `403 E102005 "... is not a management flow"`.
- **User Consent Flow:** `inbound-apps-user-consent`. Descope projects include this flow. It signs the user in with a one-time code by email, then shows the consent screen listing the scopes Claude asked for.
- **Login page URL:** `https://api.descope.com/login/P3MSmEHghEmtezkjowOSa5RjqRW3?flow=inbound-apps-user-consent` (the Descope-hosted page running that consent flow).
- **Skip consent screen:** off. The user sees which scopes Claude is asking for.
- **Always include all user authorization info on the token:** **On**. The token then carries the user's roles and permissions, and the MCP server combines them with the granted scopes.

Save.

Talking point: the portal login uses a magic link (`sign-up-or-in`), and the AI login uses an email code with consent (`inbound-apps-user-consent`). They're different flows, but the same Descope user and the same roles.

### 3.4b Access policies: only offer scopes the user's role allows

Without policies, the consent screen offers every scope to everyone. Emma (Employee) would see "See and change employee salaries", even though the server would refuse her anyway. Policies make Descope trim the consent screen *before* it renders, so each persona only sees and can grant what their role allows.

**Access Policy** page (https://app.descope.com/policies). Create 3 rules, each with **+ Rule** and **Allow**:

| Rule name | Subjects | Targets (resource → scopes) | Grant type |
| --- | --- | --- | --- |
| Matrix HR - Employees | Custom conditions: roles is one of `Employee` | Matrix Technologies HR → `hr:profile`, `hr:expenses` | User access |
| Matrix HR - Managers | Custom conditions: roles is one of `Manager` | Matrix Technologies HR → `hr:profile`, `hr:expenses`, `hr:approvals`, `hr:team-salaries` | User access |
| Matrix HR - HR Admins | Custom conditions: roles is one of `HR Admin` | Matrix Technologies HR → `hr:profile`, `hr:expenses`, `hr:approvals`, `hr:salaries` | User access |

For each rule (**Access Policy → + Rule**):
1. **Rule name**, for example `Matrix HR - Employees`.
2. **Subjects:** choose **Custom conditions**, then **roles** · **is one of** · the role name (`Employee`, `Manager` or `HR Admin`).
3. **Targets:** **Resources** tab → **Specified** → **Matrix Technologies HR** → tick only that rule's scopes. The list then shows "Matrix Technologies HR (2)", "(3)" or "(4)".
4. **Grant type:** **User access**. This is the user login Claude uses (authorization code).
5. **Allow**, then **Create**. The rule shows as **Active**.

The list already contains a **Default rule** ("Blocks any request", Block). Leave it as the **last** rule. New rules are added above it, so anyone who isn't an Employee, Manager or HR Admin gets nothing.

Then switch the MCP server's **User access** from **Allow** to **Allow via policy**. (Not yet confirmed whether this is required. Descope's policy docs suggest the rules filter consent scopes without it.)

**What we observed (2026-11-23):** with the rules in place, Emma's consent screen *still listed all 4 scopes* with the optional ones ticked, but after she clicked Authorize her token carried only `hr:profile` and `hr:expenses` (the `whoami` tool shows the token's scopes). So Descope enforces the policy when it issues the token, even though this consent screen doesn't hide the extra scopes. Show it that way on stage: "Emma ticked salaries, and Descope still didn't put it in her token." Worth asking Descope why the screen itself is not filtered.

The Resources page for an MCP server currently has no User access toggle (it shows details, scopes, client registration, consent flow, connection info and session management). In this project it was set through the Descope Management API: `POST /v1/mgmt/resource/update` with the full resource and `"userAccess": "allowViaPolicy"` (the same call the Descope MCP tools make as `UpdateResource`). If your console version shows a **User access** setting on the MCP Server page or under **Agentic Identity Hub → MCP Servers**, pick **Allow via policy** there instead. To show it live, open the resource and point out that the access rules now apply to it, or show the API call.

To undo, set `userAccess` back to `allow`.

Descope evaluates rules top to bottom and applies the first enabled rule that matches. Each persona has one role, so the order of these 3 doesn't matter. A user who matches no rule (no Matrix role) is refused at login.

Talking point: this is defense in depth. Descope decides what the AI can even ask for, and the MCP server still checks the role on every call.

**Retest:** quit Claude Desktop, run `rm -rf ~/.mcp-auth`, reopen it, and sign in as Emma, then ask Claude to run the matrix `whoami` tool. Its `scopes` should be only `hr:profile` and `hr:expenses`, even if the consent screen showed all 4.

### 3.4c Role-aware consent screen (custom flow "Matrix HR consent")

The standard consent screen (3.4b) still lists all 4 scopes for this MCP server, even though the policy trims the token. To make each persona *see* only what their role allows, use a copy of the consent flow that branches on role. Descope's own `inbound-apps-user-consent` flow is left untouched.

**Flows → Inbound apps - user consent → ⋯ → Duplicate.** Name it `Matrix HR consent` (flow ID `matrix-hr-consent`). In the copy:

1. **Replace the "Is inbound app verified?" condition** (after "Is consent already granted?" → False) with a new **Condition** named `Which Matrix role?`, with 3 branches plus Else:
   - `Employee`: **user.project.roles** · **Contains** · `Employee`
   - `Manager`: **user.project.roles** · **Contains** · `Manager`
   - `HR Admin`: **user.project.roles** · **Contains** · `HR Admin`
   - **Else** → End (a user with no Matrix role gets nothing).
2. **Make 3 consent screens**, one per branch: `Consent Screen - Employee`, `- Manager`, `- HR Admin`. Start from the existing consent screen, delete the **Inbound App Scopes** component, and put a **Text** component in its place listing that role's scopes:
   - Employee: ✓ See your own profile and pay, ✓ See and submit your own expenses
   - Manager: the 2 above, plus ✓ Approve or reject your team's expenses, ✓ See your direct reports' salaries
   - HR Admin: Employee's 2, ✓ Approve or reject your team's expenses, ✓ See and change employee salaries
   Keep the logo, the "Connect … with …" title, and the **Authorize** and **Cancel** buttons. Wire **Authorize → Update user consent** and **Cancel → End**.
3. Delete the two old consent screens (Verified App / Unverified App).
4. Open the **Update user consent** action and turn on **Scopes auto approval**. The screen no longer has checkboxes, so the action approves what the client requested, and the access policy (3.4b) trims the token to what the role allows.
5. **Save** (publish).

Then point the MCP server at it: **Agentic Identity Hub → MCP Servers → Matrix Technologies HR → Settings → User Consent Flow:** `Matrix HR consent`. The login page URL becomes `https://api.descope.com/login/P3MSmEHghEmtezkjowOSa5RjqRW3?flow=matrix-hr-consent`. Save.

To undo, set User Consent Flow back to `inbound-apps-user-consent`.

Talking point: the screen is a promise to the user, and the policy is the enforcement. Both now say the same thing: Emma is offered 2 scopes, and her token carries 2.

**Retest:** quit Claude Desktop, run `rm -rf ~/.mcp-auth`, reopen it, and sign in as Emma. The consent screen lists 2 items, and `whoami` shows the same 2 scopes.

### 3.4d Managers see their team's salaries (read only)

Managers should see what their own direct reports earn, but not everyone's salary and not change anything. This needs one new permission, one new scope and a code check, so it shows how Descope and the MCP server split the job:

1. **Authorization → Permissions → + Permission:** `salaries:read:team`, "View salaries of your direct reports (read only)".
2. **Authorization → Roles → Manager → edit:** tick `salaries:read:team`. Save.
3. **Agentic Identity Hub → MCP Servers → Matrix Technologies HR → MCP Server Scopes → + Scope:** `hr:team-salaries`, "See your direct reports' salaries", optional. Save.
4. **Access Policy → Matrix HR - Managers → edit → Targets:** also tick `hr:team-salaries`, so it shows "Matrix Technologies HR (4)". Save.
5. **Flows → Matrix HR consent → Consent Screen - Manager:** add the line "✓ See your direct reports' salaries". Save.

The MCP server maps `hr:team-salaries` to `salaries:read:team`, and then checks that the employee's manager is the caller. Descope says *what kind* of access Mark has; the app decides *whose* records that covers, because only the app knows the org chart.

Talking point: Mark can ask "What do Emma and Raj earn?" and get answers, but "What does Sofia earn?" is denied (not his report), and "Set Emma's salary" is denied (read only).

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
