"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react'; // Import useEffect for client-side check
import { toast } from 'sonner'; // Import toast for user feedback

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to') || '/pricing';

  // Client-side check for NEXT_PUBLIC_BASE_URL
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      toast.error("NEXT_PUBLIC_BASE_URL is not set. Please configure it in your environment variables (e.g., .env.local).", {
        duration: 8000,
      });
      console.error("Environment variable NEXT_PUBLIC_BASE_URL is not set.");
    }
  }, []);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'; // Fallback for development

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
          redirectTo={`${baseUrl}${redirectTo}`} // Use the dynamic redirectTo URL
        />
      </div>
    </div>
  );
}