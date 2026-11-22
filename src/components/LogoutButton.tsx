"use client";

import { useDescope } from "@descope/nextjs-sdk/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const sdk = useDescope();
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost"
      onClick={async () => {
        await sdk.logout();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
