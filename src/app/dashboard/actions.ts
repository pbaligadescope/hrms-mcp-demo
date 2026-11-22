"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, can } from "@/lib/auth";
import { readDb, writeDb } from "@/lib/db";

// Every server action re-validates the Descope session and checks the permission on the server.
async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.employee) throw new Error("Not signed in");
  return { ...user, employee: user.employee };
}

const today = () => new Date().toISOString().slice(0, 10);
const aud = (n: number) => `$${n.toLocaleString("en-AU")}`;

export async function submitExpense(formData: FormData) {
  const user = await requireUser();
  if (!can(user, "expenses:submit")) throw new Error("Forbidden");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  if (!description || !(amount > 0)) return;

  const db = await readDb();
  db.expenses.push({
    id: `x${Date.now()}`,
    employeeId: user.employee.id,
    description,
    amount,
    status: "pending",
    submittedAt: today(),
  });
  db.audit.push({
    at: new Date().toISOString(),
    actor: user.employee.name,
    channel: "portal",
    action: `submitted expense "${description}" (${aud(amount)})`,
  });
  await writeDb(db);
  revalidatePath("/dashboard");
}

export async function decideExpense(formData: FormData) {
  const user = await requireUser();
  if (!can(user, "expenses:approve")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const decision = formData.get("decision") === "approve" ? "approved" : "rejected";

  const db = await readDb();
  const expense = db.expenses.find((x) => x.id === id);
  if (!expense || expense.status !== "pending") return;
  const owner = db.employees.find((e) => e.id === expense.employeeId);
  // Nobody can decide on their own expense. Managers decide for direct reports; HR can decide for anyone.
  if (!owner || owner.id === user.employee.id) throw new Error("Forbidden");
  if (owner.managerId !== user.employee.id && !can(user, "salaries:write")) throw new Error("Forbidden");

  expense.status = decision;
  expense.decidedBy = user.employee.name;
  expense.decidedAt = today();
  db.audit.push({
    at: new Date().toISOString(),
    actor: user.employee.name,
    channel: "portal",
    action: `${decision} expense "${expense.description}" for ${owner.name}`,
  });
  await writeDb(db);
  revalidatePath("/dashboard");
}

export async function updateSalary(formData: FormData) {
  const user = await requireUser();
  if (!can(user, "salaries:write")) throw new Error("Forbidden");
  const id = String(formData.get("id"));
  const salary = Number(formData.get("salary"));
  if (!(salary > 0)) return;

  const db = await readDb();
  const emp = db.employees.find((e) => e.id === id);
  if (!emp || emp.salary === salary) return;
  const old = emp.salary;
  emp.salary = salary;
  db.audit.push({
    at: new Date().toISOString(),
    actor: user.employee.name,
    channel: "portal",
    action: `changed salary of ${emp.name} from ${aud(old)} to ${aud(salary)}`,
  });
  await writeDb(db);
  revalidatePath("/dashboard");
}
