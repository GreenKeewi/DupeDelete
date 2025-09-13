"use client";

import Link from "next/link";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-background border-t border-<think>**Diagnosing Component Failures**

I've just finished a thorough analysis of the five TypeScript errors plaguing my `Footer` component. The root cause is definitively those rogue `<think>` and `</think>` tags that somehow snuck into the `Footer.tsx` file during code generation. Removing these will be the key to resolving the compilation failures. The subsequent errors in `layout.tsx` are mere symptoms, stemming from the invalid `Footer` component definition. With the faulty tags gone, `Footer.tsx` should export a correctly formed React functional component, and the `layout.tsx` errors should vanish. I plan to perform a targeted removal of these tags from `Footer.tsx` next.


</think>border py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
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