"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionContextProvider"; // Import useSession
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { toast } from "sonner";

export const Navbar = () => {
  const router = useRouter();
  const { user, isLoading } = useSession(); // Get user and loading state from session

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    if (window.location.pathname !== '/') {
      router.push(`/#${sectionId}`);
    } else {
      const targetElement = document.getElementById(sectionId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out.");
    } else {
      toast.success("Logged out successfully!");
      router.push("/"); // Redirect to home page after logout
    }
  };

  return (
    <nav className="bg-background shadow-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex-1">
          <Link href="/" className="text-xl font-bold text-foreground">
            DupeDelete
          </Link>
        </div>
        <div className="flex-none">
          <ul className="flex items-center space-x-4">
            <li>
              <Link href="/#pricing-section" onClick={(e) => handleScrollToSection(e, 'pricing-section')}>
                <Button variant="ghost" className="text-foreground hover:text-primary-foreground">
                  Pricing
                </Button>
              </Link>
            </li>
            {isLoading ? (
              // Show a loading state for auth buttons
              <li>
                <Button variant="secondary" disabled>Loading...</Button>
              </li>
            ) : user ? (
              // User is logged in
              <>
                <li>
                  <Link href="/dashboard"> {/* Assuming a dashboard route */}
                    <Button variant="ghost" className="text-foreground hover:text-primary-foreground">
                      Dashboard
                    </Button>
                  </Link>
                </li>
                <li>
                  <Button onClick={handleLogout} className="text-primary-foreground">
                    Logout
                  </Button>
                </li>
              </>
            ) : (
              // User is not logged in
              <>
                <li>
                  <Link href="/login">
                    <Button variant="secondary" className="text-foreground hover:text-primary-foreground">
                      Login
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/login">
                    <Button className="text-primary-foreground">
                      Sign Up
                    </Button>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};