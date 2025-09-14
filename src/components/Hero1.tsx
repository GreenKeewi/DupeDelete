"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client'; // Import the Supabase client
import { useRouter } from 'next/navigation';

const Hero1 = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpgradeClick = () => {
    // The Link component already handles navigation to /#pricing-section
    // This function can be used for additional logic like analytics or
    // setting a flag if needed, but for now, the navigation is primary.
    console.log('Upgrade button clicked. User logged in:', !!user);
    // The pricing section will handle the subsequent login/payment flow.
  };

  return (
    <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container px-4 md:px-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-gray-900 dark:text-gray-50">
              Unlock Your Potential with Our Premium Plans
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl dark:text-gray-400">
              Choose the perfect plan to fit your needs and elevate your experience.
            </p>
          </div>
          <div className="space-x-4">
            <Link href="/#pricing-section" onClick={handleUpgradeClick} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="gap-4 w-full sm:px-4 sm:py-2 sm:text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                {user ? "Upgrade Your Plan" : "Get Started"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero1;