"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SessionContextProvider } from "@/components/SessionContextProvider"; // Ensure this is imported

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionContextProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </SessionContextProvider>
  );
}