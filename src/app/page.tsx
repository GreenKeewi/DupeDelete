import { MadeWithDyad } from "@/components/made-with-dyad";
import Hero1 from "@/components/Hero1";
import { Feature1 } from "@/components/Feature1";
import { Testimonials1 } from "@/components/Testimonials1";
import { PricingSection } from "@/components/PricingSection"; // Import the actual PricingSection

export default function Home() {
  return (
    <main>
      {/* Header1 removed as it does not exist and Navbar is used globally */}
      <Hero1 />
      <Feature1 />
      <PricingSection /> {/* Render the PricingSection directly */}
      <Testimonials1 />
      <MadeWithDyad />
    </main>
  );
}