import type { Metadata } from "next";
import { AuthProvider } from "@descope/nextjs-sdk";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matrix Technologies Portal",
  description: "HR and expenses portal for Matrix Technologies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AuthProvider>
  );
}
