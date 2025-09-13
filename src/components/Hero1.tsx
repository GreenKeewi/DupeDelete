"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScrollToSection } from "@/hooks/use-scroll-to-section"; // Import the new hook

export const Hero1 = () => {
  const scrollToSection = useScrollToSection(); // Use the new hook

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 items-center lg:grid-cols-2">
          <div className="flex flex-col gap-4 text-center lg:text-left">
            <h1 className="text-4xl lg:text-6xl tracking-tighter font-bold max-w-xl text-balance">
              Effortlessly Clean Your Image Library
            </h1>
            <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl">
              DupeDelete helps you quickly find and remove duplicate images, freeing up space and organizing your collection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-center lg:justify-start">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="gap-4 w-full sm:px-4 sm:py-2 sm:text-sm">
                  Get Started
                </Button>
              </Link>
              <Link 
                href="/#pricing-section" 
                className="w-full sm:w-auto"
                onClick={(e) => scrollToSection(e, 'pricing-section')} // Use the hook here
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-4 w-full sm:px-4 sm:py-2 sm:text-sm"
                >
                  Pricing
                </Button>
              </Link>
            </div>
          </div>
          <div className="bg-muted rounded-md aspect-square flex items-center justify-center text-muted-foreground p-6">
            <span className="text-sm">Preview coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};