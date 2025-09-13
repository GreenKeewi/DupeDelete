"use client";

import Link from "next/link";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionContextProvider"; // Import useSession

export const Hero1 = () => {
  const router = useRouter();
  const { user, isLoading } = useSession(); // Get user and loading state from session

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    // If not on the home page, navigate to home and then scroll
    if (window.location.pathname !== '/') {
      router.push(`/#${sectionId}`);
    } else {
      const targetElement = document.getElementById(sectionId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleUpgradeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading) {
      // Do nothing if session is still loading
      return;
    }
    if (!user) {
      // If not logged in, redirect to login page with a return URL to pricing
      router.push(`/login?redirect_to=${encodeURIComponent('/pricing')}`);
    } else {
      // If logged in, go directly to the pricing page
      router.push('/pricing');
    }
  };

  return (
    <div className="w-full">
      <div className="container mx-auto px-4">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div>
            <Link href="#how-it-works" onClick={(e) => handleScrollToSection(e, 'how-it-works')}>
              <Button variant="secondary" size="sm" className="gap-4">
                Learn how DupeDelete works <MoveRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
              Clean Your Folders in Seconds
            </h1>
            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              Stop wasting storage on duplicate images. DupeDelete scans your folder, shows duplicate images in a checklist, and lets you keep what you want — all in just a few clicks.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link href="/cleanup" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-4 w-full 
                           sm:px-4 sm:py-2 sm:text-sm 
                           md:px-6 md:py-3 md:text-base"
              >
                Clean up to 100 images free
              </Button>
            </Link>
            <Button 
              size="lg" 
              className="gap-4 w-full 
                         sm:px-4 sm:py-2 sm:text-sm 
                         md:px-6 md:py-3 md:text-base"
              onClick={handleUpgradeClick}
              disabled={isLoading} // Disable button while session is loading
            >
              {isLoading ? "Loading..." : user ? "Upgrade for unlimited cleaning" : "Login to Upgrade"} <MoveRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};