"use client";

import { Descope } from "@descope/nextjs-sdk";
import { useEffect, useState } from "react";

// Renders the Descope "sign-up-or-in" flow (magic link). The magic link returns the user to this page.
export function LoginFlow() {
  const [origin, setOrigin] = useState<string>();
  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;

  return (
    <Descope
      flowId="sign-up-or-in"
      theme="light"
      redirectUrl={`${origin}/`}
      redirectAfterSuccess="/dashboard"
    />
  );
}
