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
import { useScrollToSection } from "@/hooks/use-scroll-to-section"; // Import the new hook

export const Navbar = () => {
  const scrollToSection = useScrollToSection(); // Use the new hook

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
              <Link href="/#pricing-section" onClick={(e) => scrollToSection(e, 'pricing-section')}>
                <Button variant="ghost" className="text-foreground hover:text-primary-foreground">
                  Pricing
                </Button>
              </Link>
            </li>
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
          </ul>
        </div>
      </div>
    </nav>
  );
};