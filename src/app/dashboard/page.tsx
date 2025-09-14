import React from 'react';
import { redirect } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';

export default async function DashboardPage() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login'); // Redirect unauthenticated users to login
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-4">Welcome to Your Dashboard!</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        You are logged in as {user.email}. Your plan details will appear here.
      </p>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4">Your Current Plan</h2>
        <p className="text-gray-700 dark:text-gray-300">
          This is where your active subscription plan details will be displayed after a successful payment.
        </p>
        {/* Placeholder for plan details */}
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
          <p className="font-medium text-gray-800 dark:text-gray-200">Plan: Basic (Placeholder)</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Status: Active (Placeholder)</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Next Billing: YYYY-MM-DD (Placeholder)</p>
        </div>
      </div>
    </div>
  );
}