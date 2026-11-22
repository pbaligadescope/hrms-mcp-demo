import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { readDb } from "@/lib/db";
import type { Permission } from "@/lib/auth";
import type { Caller } from "./tools";

/**
 * Stage 3: validate Descope-issued access tokens for the Matrix Technologies MCP server.
 *
 * Descope is the OAuth authorization server. This server is the "resource server": it only checks
 * the token Descope issued and decides what the caller may do.
 */

const PROJECT_ID = process.env.DESCOPE_PROJECT_ID ?? "P3MSmEHghEmtezkjowOSa5RjqRW3";
// The MCP Server resource created in Descope (Agentic Identity Hub -> MCP Servers -> Matrix Technologies HR).
const MCP_SERVER_ID = process.env.DESCOPE_MCP_SERVER_ID ?? "RS3MT5UoEefFbPplpfgBeUzRGsuNC";

export const RESOURCE_URL = process.env.MCP_RESOURCE_URL ?? "http://localhost:3010/api/mcp";
export const AUTH_SERVER_URL =
  process.env.DESCOPE_MCP_ISSUER ?? `https://api.descope.com/v1/apps/agentic/${PROJECT_ID}/${MCP_SERVER_ID}`;

/** The MCP scopes defined on the Descope MCP Server, and the Descope permissions each one unlocks. */
export const SCOPE_PERMISSIONS: Record<string, Permission[]> = {
  "hr:profile": ["profile:read"],
  "hr:expenses": ["expenses:submit"],
  "hr:approvals": ["expenses:approve"],
  "hr:salaries": ["salaries:read", "salaries:write"],
};

type Discovery = { issuer: string; jwks_uri: string };
let discovery: Promise<Discovery> | undefined;
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

async function getDiscovery(): Promise<Discovery> {
  discovery ??= fetch(`${AUTH_SERVER_URL}/.well-known/openid-configuration`).then(async (r) => {
    if (!r.ok) throw new Error(`Descope discovery failed: HTTP ${r.status}`);
    return (await r.json()) as Discovery;
  });
  try {
    return await discovery;
  } catch (e) {
    discovery = undefined; // retry next time
    throw e;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403 = 401,
  ) {
    super(message);
  }
}

function readScopes(payload: JWTPayload): string[] {
  const raw = payload.scope ?? payload.scp;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(" ").filter(Boolean);
  return [];
}

/** Collects permissions from the project-level claim and any tenant claims on the token. */
function readPermissions(payload: JWTPayload): string[] {
  const perms = new Set<string>((payload.permissions as string[] | undefined) ?? []);
  const tenants = payload.tenants as Record<string, { permissions?: string[] }> | undefined;
  for (const t of Object.values(tenants ?? {})) for (const p of t.permissions ?? []) perms.add(p);
  return [...perms];
}

/**
 * Verifies the bearer token and turns it into a Caller.
 * - signature, issuer and expiry are checked against Descope's published keys
 * - the audience must be this MCP server's URL, so tokens for other apps are rejected
 * - the user must be a Matrix Technologies employee
 * - effective permissions = the user's Descope permissions (from their role) that the granted scopes allow
 */
export async function authenticate(request: Request): Promise<Caller> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AuthError("Missing access token");

  const { issuer, jwks_uri } = await getDiscovery();
  jwks ??= createRemoteJWKSet(new URL(jwks_uri));

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(match[1], jwks, { issuer, audience: RESOURCE_URL }));
  } catch (e) {
    throw new AuthError(`Invalid access token: ${(e as Error).message}`);
  }

  const db = await readDb();
  const employee = db.employees.find((e) => e.descopeUserId === payload.sub);
  if (!employee) throw new AuthError(`User ${payload.sub} is not a Matrix Technologies employee`, 403);

  const scopes = readScopes(payload);
  const userPermissions = readPermissions(payload) as Permission[];
  // If the client asked for no MCP scopes at all, fall back to the role's permissions alone.
  const allowedByScopes = new Set(
    scopes.length ? scopes.flatMap((s) => SCOPE_PERMISSIONS[s] ?? []) : userPermissions,
  );
  const permissions = userPermissions.filter((p) => allowedByScopes.has(p));

  return { kind: "user", employee, permissions, scopes };
}
