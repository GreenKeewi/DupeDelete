"use client";

import Link from "next/link";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-background border-t border-border py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Built with ❤️. Powered by Next.js + Stripe.
        </p>
        <p className="mb-2">
          <Link 
            href="https://insigh.to/b/dupedelete" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline text-xs"
          >
            Give Feedback
          </Link>
        </p>
        <p>&copy; {currentYear} DupeDelete. All rights reserved.</p>
      </div>
    </footer>
  );
};