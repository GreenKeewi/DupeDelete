"use client";
import { PricingSection } from "@/components/PricingSection"; // Import the new component

export default function PricingPage() {
  return (
    <main className="container mx-auto p-4 md:p-10 min-h-[calc(100vh-128px)] flex flex-col items-center justify-center">
      <PricingSection />
    </main>
  );
}