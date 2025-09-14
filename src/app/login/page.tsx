"use client";

import { useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client"; // Import the shared Supabase client
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Loader2 } from "lucide-react";
import NextDynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Avoid SSR/prerender of the Auth UI by dynamically importing it on the client only
const SupabaseAuth = NextDynamic(
  () => import("@supabase/auth-ui-react").then((m) => m.Auth),
  { ssr: false }
);

// Force this page to be dynamic so Next.js/Netlify doesn't try to prerender it at build time
export const dynamic = "force-dynamic";
// export const revalidate = 0; // Removed this line

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isSessionLoading } = useSession();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null); // New state for the redirect URL

  useEffect(() => {
    // This effect runs only on the client side
    const paramRedirectTo =
      searchParams.get("redirect_to") || "/dashboard/pricing";
    if (typeof window !== "undefined") {
      setRedirectUrl(`${window.location.origin}${paramRedirectTo}`);
    }

    if (!isSessionLoading && user) {
      router.push(paramRedirectTo); // Use the paramRedirectTo directly for client-side navigation
    } else if (!isSessionLoading && !user) {
      setIsAuthLoading(false);
    }
  }, [user, isSessionLoading, router, searchParams]);

  if (isAuthLoading || isSessionLoading || redirectUrl === null) {
    // Wait for redirectUrl to be set
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
        <SupabaseAuth
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
          redirectTo={redirectUrl} // Use the state variable here
        />
      </div>
    </div>
  );
}