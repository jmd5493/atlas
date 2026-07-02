import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return children;
}