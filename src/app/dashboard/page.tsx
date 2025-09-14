"use client";

import { FeedbackBanner } from "@/components/dashboard/FeedbackBanner";
import { DropzoneCard } from "@/components/dashboard/DropzoneCard";
import { AccountPreviewCard } from "@/components/dashboard/AccountPreviewCard";
import { useSession } from "@/components/SessionContextProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react"; // Import useState
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // Import supabase

export default function DashboardOverviewPage() {
  const { user, isLoading: isSessionLoading } = useSession();
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (!isSessionLoading && !user) {
      router.push("/login?redirect_to=/dashboard");
    }
  }, [user, isSessionLoading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setIsProfileLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching profile:", error);
          setFirstName(null);
        } else if (data) {
          setFirstName(data.first_name);
        } else {
          setFirstName(null); // No profile found
        }
        setIsProfileLoading(false);
      } else {
        setFirstName(null);
        setIsProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user]); // Re-fetch when user object changes

  const isLoading = isSessionLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const welcomeName = firstName || user.email?.split('@')[0] || 'user';

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-foreground mb-6">Welcome back, {welcomeName}!</h1> {/* Added welcome message */}
      <FeedbackBanner />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DropzoneCard />
        <AccountPreviewCard />
      </div>
    </div>
  );
}