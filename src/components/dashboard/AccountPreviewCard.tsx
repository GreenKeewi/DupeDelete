"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { useSubscription } from "@/hooks/use-subscription";
import { User, Settings, CreditCard, Trash2, Loader2 } from "lucide-react";

export const AccountPreviewCard = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const { plan, isPro, isBasic, isFree, isLoading: isSubscriptionLoading } = useSubscription();

  const isLoading = isSessionLoading || isSubscriptionLoading;

  return (
    <Card className="flex-1 p-6 min-h-[300px]">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Your Account
        </CardTitle>
        <CardDescription className="mt-2">
          Quick overview and actions for your DupeDelete account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground mt-2">Loading account info...</p>
          </div>
        ) : (
          <>
            <p className="text-lg font-medium text-foreground">
              Email: <span className="text-muted-foreground">{user?.email || "N/A"}</span>
            </p>
            <p className="text-lg font-medium text-foreground">
              Plan: <span className="text-primary font-semibold">{isPro ? "Pro" : isBasic ? "Basic" : "Free"}</span>
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <Link href="/dashboard/account">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" /> Edit Account
                </Button>
              </Link>
              <Link href="/dashboard/account">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="mr-2 h-4 w-4" /> Manage Subscription
                </Button>
              </Link>
              {/* <Button variant="destructive" className="w-full justify-start">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button> */}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};