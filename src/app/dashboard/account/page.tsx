"use client";

import { useSession } from "@/components/SessionContextProvider";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, CreditCard, CalendarDays, Trash2 } from "lucide-react"; // Import Trash2
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Form imports
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define Zod schema for profile form
const ProfileFormSchema = z.object({
  first_name: z.string().max(50, { message: "First name must not be longer than 50 characters." }).optional(),
  last_name: z.string().max(50, { message: "Last name must not be longer than 50 characters." }).optional(),
});

type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

export default function AccountPage() {
  const { user, isLoading: isSessionLoading } = useSession();
  const { plan, status, currentPeriodEnd, isBasic, isPro, isLoading: isSubscriptionLoading } = useSubscription();
  const router = useRouter();
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [profileData, setProfileData] = useState<{ first_name: string | null; last_name: string | null } | null>(null);
  const [isProfileDataLoading, setIsProfileDataLoading] = useState(true);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false); // New state for cancellation

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
    },
    mode: "onChange",
  });

  // Fetch profile data on component mount or user change
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setIsProfileDataLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching profile for account page:", error);
          toast.error("Failed to load profile data.");
          setProfileData(null);
        } else if (data) {
          setProfileData(data);
          form.reset({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
          });
        } else {
          setProfileData(null);
          form.reset({ first_name: "", last_name: "" });
        }
        setIsProfileDataLoading(false);
      }
    };
    fetchProfile();
  }, [user, form]);

  useEffect(() => {
    if (!isSessionLoading && !user) {
      router.push("/login?redirect_to=/dashboard/account");
    }
  }, [user, isSessionLoading, router]);

  if (isSessionLoading || isSubscriptionLoading || isProfileDataLoading) {
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

  const onSubmit = async (values: ProfileFormValues) => {
    setIsProfileUpdating(true);
    toast.loading("Updating profile...", { id: "update-profile" });

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name,
        last_name: values.last_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.", { id: "update-profile" });
    } else {
      toast.success("Profile updated successfully!", { id: "update-profile" });
      router.refresh(); // Trigger a refresh to update data across the app
    }
    setIsProfileUpdating(false);
  };

  const handleManageSubscription = async () => {
    toast.info("Redirecting to Stripe customer portal...", { id: "manage-sub" });
    // In a real application, you would call an API route here
    // that creates a Stripe Customer Portal session and redirects the user.
    // For this example, we'll just show a placeholder toast.
    toast.success("Stripe Customer Portal integration coming soon!", { id: "manage-sub" });
  };

  const handleCancelSubscription = async () => {
    if (!user) {
      toast.error("You must be logged in to cancel a subscription.");
      return;
    }

    setIsCancellingSubscription(true);
    toast.loading("Cancelling your subscription...", { id: "cancel-sub" });

    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel subscription.");
      }

      toast.success("Subscription cancelled successfully!", { id: "cancel-sub" });
      router.refresh(); // Refresh to update subscription status
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error(error.message || "Failed to cancel subscription. Please try again.", { id: "cancel-sub" });
    } finally {
      setIsCancellingSubscription(false);
    }
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email || ""} disabled className="mt-1" />
              </div>
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isProfileUpdating || !form.formState.isDirty}>
                {isProfileUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Profile
              </Button>
            </form>
          </Form>
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
          <Button onClick={handleManageSubscription} disabled={plan === 'free' || isCancellingSubscription}>
            Manage Subscription on Stripe
          </Button>
          {(isBasic || isPro) && ( // Only show cancel button if on a paid plan
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCancellingSubscription}
              className="w-full"
            >
              {isCancellingSubscription ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Cancel Subscription
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}