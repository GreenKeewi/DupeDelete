"use client";

import { useSession } from "@/components/SessionContextProvider";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, CreditCard, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, isLoading: isSessionLoading } = useSession();
  const { plan, status, currentPeriodEnd, isLoading: isSubscriptionLoading } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (!isSessionLoading && !user) {
      router.push("/login?redirect_to=/dashboard/account");
    }
  }, [user, isSessionLoading, router]);

  if (isSessionLoading || isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading account details...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleManageSubscription = async () => {
    toast.info("Redirecting to Stripe customer portal...", { id: "manage-sub" });
    // In a real application, you would call an API route here
    // that creates a Stripe Customer Portal session and redirects the user.
    // For this example, we'll just show a placeholder toast.
    toast.success("Stripe Customer Portal integration coming soon!", { id: "manage-sub" });
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-foreground mb-6">Account Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Profile Information
          </CardTitle>
          <CardDescription>Manage your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email || ""} disabled className="mt-1" />
          </div>
          {/* Add more profile fields if available (e.g., first name, last name) */}
          {/* <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" type="text" value={user.user_metadata.first_name || ""} className="mt-1" />
          </div> */}
          <Button disabled>Save Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Subscription Details
          </CardTitle>
          <CardDescription>View and manage your current plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Plan</Label>
            <p className="text-lg font-semibold text-primary mt-1">{plan === 'free' ? 'Free' : plan.replace('_', ' ').replace('monthly', 'Monthly').replace('yearly', 'Yearly').toUpperCase()}</p>
          </div>
          <div>
            <Label>Status</Label>
            <p className="text-lg font-semibold text-muted-foreground mt-1 capitalize">{status}</p>
          </div>
          {currentPeriodEnd && (
            <div>
              <Label className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Current Period Ends
              </Label>
              <p className="text-lg font-semibold text-muted-foreground mt-1">{currentPeriodEnd.toLocaleDateString()}</p>
            </div>
          )}
          <Button onClick={handleManageSubscription} disabled={plan === 'free'}>
            Manage Subscription on Stripe
          </Button>
        </CardContent>
      </Card>

      {/* Add a section for deleting account if desired */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> Danger Zone
          </CardTitle>
          <CardDescription>Actions that cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Delete My Account</Button>
        </CardContent>
      </Card> */}
    </div>
  );
}