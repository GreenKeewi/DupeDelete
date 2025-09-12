"use client"; // Added "use client" directive as this component uses hooks and client-side features.

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client'; // Corrected import to use 'supabase'

export default function LoginPage() {
  // The supabase client is already initialized and exported from '@/integrations/supabase/client'
  // No need to call createClient() again here.

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-foreground">Welcome to DupeDelete</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers for now
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
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`} // Redirect after successful login
        />
      </div>
    </div>
  );
}