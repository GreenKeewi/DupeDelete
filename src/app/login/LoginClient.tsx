"use client";

import { useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isSessionLoading } = useSession();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const paramRedirectTo =
      searchParams.get("redirect_to") || "/dashboard/pricing";
    if (typeof window !== "undefined") {
      setRedirectUrl(`${window.location.origin}${paramRedirectTo}`);
    }

    const errorCode = searchParams.get("error_code");
    const errorDescription = searchParams.get("error_description");

    if (errorCode === "otp_expired" || errorCode === "access_denied") {
      setAuthErrorMessage(
        "Your login link has expired or is invalid. Please try logging in again to receive a new link."
      );
      // Optionally, clear the error params from the URL to clean it up
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("error");
      newSearchParams.delete("error_code");
      newSearchParams.delete("error_description");
      router.replace(`${window.location.pathname}?${newSearchParams.toString()}`);
    } else {
      setAuthErrorMessage(null);
    }

    if (!isSessionLoading && user) {
      router.push(paramRedirectTo);
    } else if (!isSessionLoading && !user) {
      setIsAuthLoading(false);
    }
  }, [user, isSessionLoading, router, searchParams]);

  if (isAuthLoading || isSessionLoading || redirectUrl === null) {
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
        <h2 className="text-2xl font-bold text-center text-foreground">
          Welcome to DupeDelete
        </h2>
        {authErrorMessage && (
          <div className="bg-destructive/10 text-destructive border border-destructive/30 p-3 rounded-md text-sm text-center">
            {authErrorMessage}
          </div>
        )}
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
          redirectTo={redirectUrl}
        />
      </div>
    </div>
  );
}