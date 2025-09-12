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
import { ThemeSwitcher } from "./ThemeSwitcher"; // Import the new ThemeSwitcher

export const Navbar = () => {
  return (
    <nav className="bg-background shadow-sm border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex-1">
          <Link href="/" className="text-xl font-bold text-foreground">
            DupeDelete
          </Link>
        </div>
        <div className="flex-none flex items-center space-x-4"> {/* Added flex and items-center for alignment */}
          <ul className="flex items-center space-x-4">
            <li>
              <Link href="#" className="text-foreground hover:text-primary-foreground">
                Link
              </Link>
            </li>
            <li>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 text-foreground hover:text-primary-foreground">
                    Parent <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40">
                  <DropdownMenuItem>
                    <Link href="#" className="block w-full text-left">Link 1</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="#" className="block w-full text-left">Link 2</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          </ul>
          <ThemeSwitcher /> {/* Add the ThemeSwitcher here */}
        </div>
      </div>
    </nav>
  );
};