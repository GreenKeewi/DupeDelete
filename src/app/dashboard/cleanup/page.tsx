"use client";

import CleanupPageContent from "@/app/cleanup/page"; // Import the original CleanupPage content
import { useSession } from "@/components/SessionContextProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardCleanupPage() {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect_to=/dashboard/cleanup");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading user session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full">
      <CleanupPageContent />
    </div>
  );
}