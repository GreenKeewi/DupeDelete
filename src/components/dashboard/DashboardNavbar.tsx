"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DashboardNavbar = () => {
  const { user, isLoading } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      toast.error("Failed to log out. Please try again.");
    } else {
      toast.success("Logged out successfully!");
      router.push("/login");
    }
  };

  return (
    <nav className="bg-background shadow-sm border-b border-border fixed top-0 left-0 right-0 z-50 h-16">
      <div className="container mx-auto flex items-center justify-between h-full px-4">
        <div className="flex-1">
          <Link href="/dashboard" className="text-xl font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" /> DupeDelete Dashboard
          </Link>
        </div>
        <div className="flex-none">
          <ul className="flex items-center space-x-4">
            {!isLoading && user && (
              <li>
                <Button variant="ghost" onClick={handleLogout} className="text-foreground hover:text-primary-foreground">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};