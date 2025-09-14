"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const Hero1 = () => {
  // The handleUpgradeClick function and any related logic have been removed
  // as they were causing an immediate redirect to the login page.

  return (
    <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <div className="container px-4 md:px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Unlock Your Potential with Our Platform
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-200">
            Experience seamless integration, powerful tools, and unparalleled support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* The onClick={handleUpgradeClick} has been removed from this Link */}
            <Link href="/#pricing-section" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="gap-4 w-full
                           sm:px-4 sm:py-2 sm:text-sm
                           bg-white text-blue-600 hover:bg-gray-100"
              >
                Get Started
              </Button>
            </Link>
            <Link href="/contact" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="gap-4 w-full
                           sm:px-4 sm:py-2 sm:text-sm
                           border-white text-white hover:bg-white hover:text-blue-600"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero1;