"use client";

import dynamic from 'next/dynamic'; // Import dynamic for client-side rendering
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react'; // Import useEffect

// Dynamically import Auth component with SSR disabled
const DynamicAuth = dynamic(() =>
  import('@supabase/auth-ui-react').then((mod) => mod.Auth),
  { ssr: false }
);

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectToParam = searchParams.get('redirect_to') || '/pricing';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // Removed '!' for safer access

  // Construct the full redirect URL
  const fullRedirectTo = baseUrl ? `${baseUrl}${redirectToParam}` : redirectToParam;

  useEffect(() => {
    console.log("Supabase Auth redirectTo URL:", fullRedirectTo);
    if (!baseUrl) {
      console.warn("NEXT_PUBLIC_BASE_URL is not set. Redirects might not work correctly.");
    }
  }, [fullRedirectTo, baseUrl]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-foreground">Welcome to DupeDelete!</h2>
        <DynamicAuth // Use DynamicAuth here
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light"
          redirectTo={fullRedirectTo}
        />
      </div>
    </div>
  );
}