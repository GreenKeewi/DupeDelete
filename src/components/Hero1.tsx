"use client";

import Link from "next/link";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Hero1 = () => {
  const handleScrollToFeature = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetId = e.currentTarget.href.split('#')[1];
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      <div className="container mx-auto px-4">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div>
            <Link href="#how-it-works" onClick={handleScrollToFeature}>
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
              Stop wasting storage on duplicate files. DupeDelete scans your folder, shows duplicates in a checklist, and lets you keep what you want — all in just a few clicks.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4"> {/* Changed to flex-col on small, flex-row on sm+ */}
            <Link href="/cleanup" className="w-full sm:w-auto"> {/* Make link full width on small screens */}
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-4 w-full 
                           sm:px-4 sm:py-2 sm:text-sm 
                           md:px-6 md:py-3 md:text-base" // Responsive sizing
              >
                Clean up to 100 files free
              </Button>
            </Link>
            <Link href="/pricing" className="w-full sm:w-auto"> {/* Make link full width on small screens */}
              <Button 
                size="lg" 
                className="gap-4 w-full 
                           sm:px-4 sm:py-2 sm:text-sm 
                           md:px-6 md:py-3 md:text-base" // Responsive sizing
              >
                Upgrade for unlimited cleaning <MoveRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};