"use client";

import { PricingSection } from "@/components/PricingSection";

export default function PricingPage() {
  return (
    <div className="container mx-auto p-4 md:p-10 min-h-[calc(100vh-128px)] flex flex-col items-center justify-center">
      <PricingSection />
    </div>
  );
}