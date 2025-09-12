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

export const Navbar = () => {
  return (
    <nav className="bg-background shadow-sm border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex-1">
          <Link href="/" className="text-xl font-bold text-foreground">
            DupeDelete
          </Link>
        </div>
        <div className="flex-none">
          <ul className="flex items-center space-x-4">
            <li>
              <Link href="/pricing" className="text-foreground hover:text-primary-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/login">
                <Button variant="ghost" className="text-foreground hover:text-primary-foreground">
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