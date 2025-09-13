"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Trash2, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button"; // Added missing import

export const DashboardSidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/cleanup", icon: Trash2, label: "Cleanup" },
    { href: "/dashboard/pricing", icon: DollarSign, label: "Pricing" },
    { href: "/dashboard/account", icon: User, label: "Account" },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border p-4 pt-8 flex flex-col sticky top-16 h-[calc(100vh-64px)]">
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-lg py-6",
                pathname === item.href
                  ? "bg-muted hover:bg-muted text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
    </aside>
  );
};