"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionContextProvider";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      // If not loading and no user, redirect to login
      router.push("/login?redirect_to=/dashboard");
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
    // This case should be handled by the useEffect redirect, but as a fallback
    return null;
  }

  return (
    <main className="container mx-auto p-4 md:p-10 min-h-[calc(100vh-128px)] flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome, {user.email}!</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
        Manage your subscription and start cleaning your image folders.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <Link href="/cleanup">
          <Button size="lg" className="w-full sm:w-auto">
            Start Cleaning Images
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-4xl">
        <PricingSection />
      </div>
    </main>
  );
}