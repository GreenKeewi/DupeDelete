"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

export interface UserSubscriptionData {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  plan_id: string;
  current_period_end: string | null;
  created_at: string;
}

export interface UserSubscription {
  plan: 'free' | 'basic_monthly' | 'basic_yearly' | 'pro_monthly' | 'pro_yearly';
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'free';
  isPro: boolean;
  isBasic: boolean;
  isFree: boolean;
  currentPeriodEnd: Date | null;
  isLoading: boolean;
}

export const useSubscription = (): UserSubscription => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [subscription, setSubscription] = useState<UserSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (isSessionLoading) return;

      if (!user) {
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } else if (data) {
        setSubscription(data as UserSubscriptionData);
      } else {
        // If no subscription found, assume free plan
        setSubscription({
          id: '', // Placeholder, as it's not a real DB entry
          user_id: user.id,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          status: 'free',
          plan_id: 'free',
          current_period_end: null,
          created_at: new Date().toISOString(),
        });
      }
      setIsLoading(false);
    };

    fetchSubscription();

    // Listen for changes in auth state to refetch subscription
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id !== user?.id) { // Only refetch if user changes
        fetchSubscription();
      }
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, [user, isSessionLoading]);

  const plan = subscription?.plan_id || 'free';
  const status = subscription?.status === 'active' ? 'active' : 'free'; // Simplify status for frontend
  const isPro = plan.startsWith('pro') && status === 'active';
  const isBasic = plan.startsWith('basic') && status === 'active';
  const isFree = !isPro && !isBasic;
  const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  return {
    plan: plan as UserSubscription['plan'],
    status: status as UserSubscription['status'],
    isPro,
    isBasic,
    isFree,
    currentPeriodEnd,
    isLoading: isLoading || isSessionLoading,
  };
};