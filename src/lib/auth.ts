import { session } from "@descope/nextjs-sdk/server";
import { readDb } from "./db";
import type { Employee } from "./seed";

export type Permission =
  | "profile:read"
  | "expenses:submit"
  | "expenses:approve"
  | "salaries:read"
  | "salaries:write";

export type CurrentUser = {
  descopeUserId: string;
  employee: Employee | undefined;
  roles: string[];
  permissions: Permission[];
};

// Validates the Descope session cookie on the server and maps it to an employee record.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const info = await session();
  if (!info) return null;
  const token = info.token as Record<string, unknown>;
  const descopeUserId = String(token.sub ?? "");
  const db = await readDb();
  return {
    descopeUserId,
    employee: db.employees.find((e) => e.descopeUserId === descopeUserId),
    roles: (token.roles as string[] | undefined) ?? [],
    permissions: (token.permissions as Permission[] | undefined) ?? [],
  };
}

export function can(user: CurrentUser, permission: Permission): boolean {
  return user.permissions.includes(permission);
}
