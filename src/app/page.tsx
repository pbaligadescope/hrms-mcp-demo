import { redirect } from "next/navigation";
import { session } from "@descope/nextjs-sdk/server";
import { Brand } from "@/components/Brand";
import { LoginFlow } from "@/components/LoginFlow";

export default async function Home() {
  if (await session()) redirect("/dashboard");

  return (
    <main className="login">
      <section className="login-hero">
        <Brand />
        <h1>Your people, pay and expenses in one place.</h1>
        <p>Sign in with your work email. We&apos;ll send you a magic link.</p>
        <ul className="persona-hint">
          <li>
            <strong>Emma</strong> Employee
          </li>
          <li>
            <strong>Mark</strong> Manager
          </li>
          <li>
            <strong>Hannah</strong> HR Admin
          </li>
        </ul>
      </section>
      <section className="login-card">
        <LoginFlow />
      </section>
    </main>
  );
}
