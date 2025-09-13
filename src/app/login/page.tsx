"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

export default function LoginPage() {
  const searchParams = useSearchParams();
  // Default to /dashboard if no redirect_to is specified
  const redirectTo = searchParams.get('redirect_to') || '/dashboard'; 

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
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light"
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}${redirectTo}`} // Use the dynamic redirectTo URL
        />
      </div>
    </div>
  );
}