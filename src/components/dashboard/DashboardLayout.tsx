"use client";

import React from 'react';
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardSidebar } from './DashboardSidebar';
import { Toaster } from 'sonner'; // Import Toaster for notifications

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNavbar />
      <div className="flex flex-1 pt-16"> {/* pt-16 to account for fixed navbar height */}
        <DashboardSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
};