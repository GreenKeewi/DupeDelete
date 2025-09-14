"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { fetchJson } from "@/lib/api-utils"; // Import fetchJson

interface UseCheckoutOptions {
  user: User | null;
  onLoadingChange?: (loading: boolean) => void;
}

export const useCheckout = ({ user, onLoadingChange }: UseCheckoutOptions) => {
  const router = useRouter();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const initiateCheckout = async (plan: "basic" | "pro", interval: "monthly" | "yearly") => {
    if (!user) {
      toast.info("Please log in to subscribe.", { id: "login-redirect" });
      // Store the intended plan in local storage before redirecting
      localStorage.setItem('pendingCheckoutPlan', plan);
      localStorage.setItem('pendingCheckoutInterval', interval);
      router.push(`/login?redirect_to=${encodeURIComponent('/dashboard/pricing')}`);
      return;
    }

    setIsCheckoutLoading(true);
    onLoadingChange?.(true);
    toast.loading(`Initiating ${plan} ${interval} plan checkout...`, { id: "checkout" });

    try {
      const { url } = await fetchJson<{ url: string }>("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, interval, userId: user.id }),
      });

      if (url) {
        router.push(url);
      } else {
        throw new Error("No checkout URL received.");
      }
    } catch (error) {
      console.error("Stripe checkout error:", error);
      toast.error((error as Error).message || "Failed to start checkout. Please try again.", { id: "checkout" });
      setIsCheckoutLoading(false);
      onLoadingChange?.(false);
    }
  };

  return { initiateCheckout, isCheckoutLoading };
};