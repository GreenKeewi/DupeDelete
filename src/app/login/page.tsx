"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/SessionContextProvider";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set default redirect to /dashboard/pricing if no specific redirect_to is provided
  const redirectTo = searchParams.get("redirect_to") || "/dashboard/pricing"; 
  const { user, isLoading: isSessionLoading } = useSession();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (!isSessionLoading && user) {
      router.push(redirectTo);
    } else if (!isSessionLoading && !user) {
      setIsAuthLoading(false);
    }
  }, [user, isSessionLoading, router, redirectTo]);

  if (isAuthLoading || isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-foreground">Welcome to DupeDelete</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "hsl(var(--primary))",
                  brandAccent: "hsl(var(--primary-foreground))",
                },
              },
            },
          }}
          theme="dark"
          showLinks={true}
          redirectTo={`${window.location.origin}${redirectTo}`}
        />
      </div>
    </div>
  );
}