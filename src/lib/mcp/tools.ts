import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readDb, writeDb } from "@/lib/db";
import type { AuditEntry, Employee } from "@/lib/seed";
import type { Permission } from "@/lib/auth";

/**
 * Who is calling the MCP server.
 *
 * - "anonymous": Stage 2. The server has no idea who is on the other end, so it cannot check anything.
 * - "user": Stage 3. A Descope access token identified the user, and we enforce their permissions.
 */
export type Caller =
  | { kind: "anonymous" }
  | { kind: "user"; employee: Employee; permissions: Permission[]; scopes: string[] };

type Channel = AuditEntry["channel"];

class Denied extends Error {}

const aud = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});
const denied = (reason: string) => ({
  isError: true,
  content: [{ type: "text" as const, text: `ACCESS DENIED: ${reason}` }],
});

function actorName(caller: Caller) {
  return caller.kind === "user" ? caller.employee.name : "anonymous";
}

/** In Stage 2 every check passes, because there is no identity to check against. */
function requirePermission(caller: Caller, permission: Permission) {
  if (caller.kind === "anonymous") return;
  if (!caller.permissions.includes(permission)) {
    throw new Denied(`${caller.employee.name} does not have the "${permission}" permission.`);
  }
}

function hasPermission(caller: Caller, permission: Permission) {
  return caller.kind === "anonymous" || caller.permissions.includes(permission);
}

async function log(channel: Channel, caller: Caller, action: string) {
  const db = await readDb();
  db.audit.push({ at: new Date().toISOString(), actor: actorName(caller), channel, action });
  await writeDb(db);
}

/** Wraps a tool so denials are returned to Claude as a clear error and recorded in the activity log. */
function guarded<A>(channel: Channel, caller: Caller, tool: string, fn: (args: A) => Promise<ReturnType<typeof ok>>) {
  return async (args: A) => {
    try {
      return await fn(args);
    } catch (e) {
      if (e instanceof Denied) {
        await log(channel, caller, `was DENIED calling ${tool}: ${e.message}`);
        return denied(e.message);
      }
      throw e;
    }
  };
}

export function registerHrTools(server: McpServer, caller: Caller, channel: Channel) {
  const publicProfile = (e: Employee) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    department: e.department,
    managerId: e.managerId,
  });

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description: "Returns the identity the Matrix Technologies server sees for this connection.",
      inputSchema: {},
    },
    async () =>
      ok(
        caller.kind === "anonymous"
          ? { identity: "anonymous" }
          : {
              identity: caller.employee.name,
              title: caller.employee.title,
              permissions: caller.permissions,
              scopes: caller.scopes,
            },
      ),
  );

  server.registerTool(
    "list_employees",
    {
      title: "List employees",
      description:
        "Lists Matrix Technologies employees. Includes salaries and emails when the caller is allowed to see them.",
      inputSchema: {},
    },
    guarded(channel, caller, "list_employees", async () => {
      const db = await readDb();
      const full = hasPermission(caller, "salaries:read");
      return ok(
        db.employees.map((e) => (full ? { ...publicProfile(e), email: e.email, salary: aud(e.salary) } : publicProfile(e))),
      );
    }),
  );

  server.registerTool(
    "get_salary",
    {
      title: "Get salary",
      description: "Returns an employee's annual salary in AUD.",
      inputSchema: { employee_id: z.string().describe("Employee ID, for example e1") },
    },
    guarded(channel, caller, "get_salary", async ({ employee_id }: { employee_id: string }) => {
      const db = await readDb();
      const emp = db.employees.find((e) => e.id === employee_id);
      if (!emp) return ok(`No employee with id ${employee_id}.`);
      const isSelf = caller.kind === "user" && caller.employee.id === emp.id;
      if (!isSelf) requirePermission(caller, "salaries:read");
      await log(channel, caller, `read the salary of ${emp.name}`);
      return ok({ employee: emp.name, salary: aud(emp.salary) });
    }),
  );

  server.registerTool(
    "list_expenses",
    {
      title: "List expenses",
      description:
        "Lists expense claims the caller can see: their own, their direct reports' (managers), or everyone's (HR).",
      inputSchema: { status: z.enum(["pending", "approved", "rejected"]).optional() },
    },
    guarded(channel, caller, "list_expenses", async ({ status }: { status?: "pending" | "approved" | "rejected" }) => {
      const db = await readDb();
      const byId = new Map(db.employees.map((e) => [e.id, e]));
      const visible = db.expenses.filter((x) => {
        if (status && x.status !== status) return false;
        if (caller.kind === "anonymous" || caller.permissions.includes("salaries:read")) return true;
        if (x.employeeId === caller.employee.id) return true;
        return caller.permissions.includes("expenses:approve") && byId.get(x.employeeId)?.managerId === caller.employee.id;
      });
      return ok(visible.map((x) => ({ ...x, employee: byId.get(x.employeeId)?.name, amount: aud(x.amount) })));
    }),
  );

  server.registerTool(
    "submit_expense",
    {
      title: "Submit expense",
      description: "Submits a new expense claim.",
      inputSchema: {
        description: z.string(),
        amount: z.number().positive().describe("Amount in AUD"),
        employee_id: z
          .string()
          .optional()
          .describe("Who the expense is for. Required when the server cannot identify the caller."),
      },
    },
    guarded(
      channel,
      caller,
      "submit_expense",
      async ({ description, amount, employee_id }: { description: string; amount: number; employee_id?: string }) => {
        requirePermission(caller, "expenses:submit");
        const db = await readDb();
        // With auth, the expense is always filed for the signed-in user, whatever employee_id says.
        const ownerId = caller.kind === "user" ? caller.employee.id : employee_id;
        const owner = db.employees.find((e) => e.id === ownerId);
        if (!owner) return ok("Please give an employee_id, for example e1.");
        const expense = {
          id: `x${Date.now()}`,
          employeeId: owner.id,
          description,
          amount,
          status: "pending" as const,
          submittedAt: new Date().toISOString().slice(0, 10),
        };
        db.expenses.push(expense);
        db.audit.push({
          at: new Date().toISOString(),
          actor: actorName(caller),
          channel,
          action: `submitted expense "${description}" (${aud(amount)}) for ${owner.name}`,
        });
        await writeDb(db);
        return ok({ submitted: { ...expense, employee: owner.name } });
      },
    ),
  );

  server.registerTool(
    "decide_expense",
    {
      title: "Approve or reject expense",
      description: "Approves or rejects a pending expense claim.",
      inputSchema: { expense_id: z.string(), decision: z.enum(["approve", "reject"]) },
    },
    guarded(
      channel,
      caller,
      "decide_expense",
      async ({ expense_id, decision }: { expense_id: string; decision: "approve" | "reject" }) => {
        requirePermission(caller, "expenses:approve");
        const db = await readDb();
        const expense = db.expenses.find((x) => x.id === expense_id);
        if (!expense) return ok(`No expense with id ${expense_id}.`);
        if (expense.status !== "pending") return ok(`Expense ${expense_id} is already ${expense.status}.`);
        const owner = db.employees.find((e) => e.id === expense.employeeId)!;
        if (caller.kind === "user") {
          if (owner.id === caller.employee.id) throw new Denied("You cannot approve or reject your own expense.");
          const isHr = caller.permissions.includes("salaries:write");
          if (owner.managerId !== caller.employee.id && !isHr) {
            throw new Denied(`${owner.name} is not one of ${caller.employee.name}'s direct reports.`);
          }
        }
        expense.status = decision === "approve" ? "approved" : "rejected";
        expense.decidedBy = actorName(caller);
        expense.decidedAt = new Date().toISOString().slice(0, 10);
        db.audit.push({
          at: new Date().toISOString(),
          actor: actorName(caller),
          channel,
          action: `${expense.status} expense "${expense.description}" (${aud(expense.amount)}) for ${owner.name}`,
        });
        await writeDb(db);
        return ok({ expense_id, status: expense.status, employee: owner.name });
      },
    ),
  );

  server.registerTool(
    "update_salary",
    {
      title: "Update salary",
      description: "Changes an employee's annual salary (AUD).",
      inputSchema: { employee_id: z.string(), salary: z.number().positive() },
    },
    guarded(channel, caller, "update_salary", async ({ employee_id, salary }: { employee_id: string; salary: number }) => {
      requirePermission(caller, "salaries:write");
      const db = await readDb();
      const emp = db.employees.find((e) => e.id === employee_id);
      if (!emp) return ok(`No employee with id ${employee_id}.`);
      const old = emp.salary;
      emp.salary = salary;
      db.audit.push({
        at: new Date().toISOString(),
        actor: actorName(caller),
        channel,
        action: `changed salary of ${emp.name} from ${aud(old)} to ${aud(salary)}`,
      });
      await writeDb(db);
      return ok({ employee: emp.name, old_salary: aud(old), new_salary: aud(salary) });
    }),
  );
}
