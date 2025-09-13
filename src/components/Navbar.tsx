"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionContextProvider"; // Import useSession

export const Navbar = () => {
  const router = useRouter();
  const { user, isLoading } = useSession(); // Use the session context

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
            {!isLoading && user ? ( // Show Dashboard button if logged in
              <li>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-foreground hover:text-primary-foreground flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Button>
                </Link>
              </li>
            ) : ( // Show Login/Sign Up if not logged in
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