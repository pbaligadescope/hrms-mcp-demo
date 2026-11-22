import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/LogoutButton";
import { submitExpense, decideExpense, updateSalary } from "./actions";
import type { Expense } from "@/lib/seed";

export const dynamic = "force-dynamic";

const aud = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function StageBanner() {
  const stage = process.env.DEMO_STAGE ?? "1";
  if (stage === "1") return null;
  return (
    <div className="stage-banner">
      New: Matrix Technologies now works with AI assistants like Claude. Connect at <code>/api/mcp</code>
    </div>
  );
}

function StatusPill({ status }: { status: Expense["status"] }) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const db = await readDb();
  const me = user.employee;

  if (!me) {
    return (
      <main className="shell">
        <header className="topbar">
          <Brand />
          <LogoutButton />
        </header>
        <section className="card">
          <h2>No employee record</h2>
          <p className="muted">
            You signed in successfully, but this Descope user ({user.descopeUserId}) isn&apos;t linked to
            a Matrix Technologies employee. Sign in as one of the demo personas.
          </p>
        </section>
      </main>
    );
  }

  const byId = new Map(db.employees.map((e) => [e.id, e]));
  const myExpenses = db.expenses.filter((x) => x.employeeId === me.id);
  const isHr = can(user, "salaries:write");
  const approvals = db.expenses.filter((x) => {
    if (x.status !== "pending" || x.employeeId === me.id) return false;
    const owner = byId.get(x.employeeId);
    return owner?.managerId === me.id || isHr;
  });
  const manager = me.managerId ? byId.get(me.managerId) : undefined;
  const recentAudit = [...db.audit].reverse().slice(0, 8);

  return (
    <main className="shell">
      <header className="topbar">
        <Brand />
        <div className="who">
          <div>
            <div className="who-name">{me.name}</div>
            <div className="who-role">{user.roles.join(", ") || "No role"}</div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <StageBanner />

      <div className="grid">
        {can(user, "profile:read") && (
          <section className="card">
            <h2>My profile</h2>
            <dl className="facts">
              <dt>Title</dt>
              <dd>{me.title}</dd>
              <dt>Department</dt>
              <dd>{me.department}</dd>
              <dt>Manager</dt>
              <dd>{manager?.name ?? "None"}</dd>
              <dt>Annual salary</dt>
              <dd>{aud(me.salary)}</dd>
              <dt>Permissions</dt>
              <dd className="perm-list">
                {user.permissions.map((p) => (
                  <code key={p}>{p}</code>
                ))}
              </dd>
            </dl>
          </section>
        )}

        {can(user, "expenses:submit") && (
          <section className="card">
            <h2>My expenses</h2>
            <table>
              <tbody>
                {myExpenses.map((x) => (
                  <tr key={x.id}>
                    <td>{x.description}</td>
                    <td className="num">{aud(x.amount)}</td>
                    <td>
                      <StatusPill status={x.status} />
                    </td>
                  </tr>
                ))}
                {myExpenses.length === 0 && (
                  <tr>
                    <td className="muted">No expenses yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <form action={submitExpense} className="inline-form">
              <input name="description" placeholder="What was it for?" required />
              <input name="amount" type="number" min="1" step="0.01" placeholder="Amount" required />
              <button className="btn">Submit</button>
            </form>
          </section>
        )}

        {can(user, "expenses:approve") && (
          <section className="card">
            <h2>{isHr ? "Pending approvals (all staff)" : "Team approvals"}</h2>
            <table>
              <tbody>
                {approvals.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <div>{x.description}</div>
                      <div className="muted small">{byId.get(x.employeeId)?.name}</div>
                    </td>
                    <td className="num">{aud(x.amount)}</td>
                    <td className="actions">
                      <form action={decideExpense}>
                        <input type="hidden" name="id" value={x.id} />
                        <button className="btn btn-sm" name="decision" value="approve">
                          Approve
                        </button>
                        <button className="btn btn-sm btn-ghost" name="decision" value="reject">
                          Reject
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {approvals.length === 0 && (
                  <tr>
                    <td className="muted">Nothing waiting for you.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {can(user, "salaries:read") && (
          <section className="card card-wide">
            <h2>Salaries</h2>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Title</th>
                  <th className="num">Salary (AUD)</th>
                </tr>
              </thead>
              <tbody>
                {db.employees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td className="muted">{e.title}</td>
                    <td className="num">
                      {can(user, "salaries:write") ? (
                        <form action={updateSalary} className="salary-form">
                          <input type="hidden" name="id" value={e.id} />
                          <input name="salary" type="number" defaultValue={e.salary} min="1" />
                          <button className="btn btn-sm">Save</button>
                        </form>
                      ) : (
                        aud(e.salary)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="card card-wide">
          <h2>Activity log</h2>
          <ul className="audit">
            {recentAudit.map((a, i) => (
              <li key={i}>
                <span className={`chan chan-${a.channel}`}>{a.channel}</span>
                <strong>{a.actor}</strong> {a.action}
                <span className="muted small"> · {new Date(a.at).toLocaleString("en-AU")}</span>
              </li>
            ))}
            {recentAudit.length === 0 && <li className="muted">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
