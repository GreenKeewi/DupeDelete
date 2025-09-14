import { MadeWithDyad } from "@/components/made-with-dyad";
import Hero1 from "@/components/Hero1"; // Changed to default import
import { Feature1 } from "@/components/Feature1";
import { Testimonials1 } from "@/components/Testimonials1";
import { PricingSection } from "@/components/PricingSection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      <main className="flex-1 flex flex-col items-center justify-center">
        <Hero1 />
        <Feature1 />
        <Testimonials1 />
        <div className="mt-20">
          <PricingSection />
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
}