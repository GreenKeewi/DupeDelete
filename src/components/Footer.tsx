"use client";

import Link from "next/link";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-background border-t border-border py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Built for simplicity. Powered by Next.js + Stripe.
        </p>
        <p>&copy; {currentYear} DupeDelete. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};