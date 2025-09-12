import { MadeWithDyad } from "@/components/made-with-dyad";
import { Navbar } from "@/components/Navbar";
import { Hero1 } from "@/components/Hero1";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center">
        <Hero1 />
      </main>
      <MadeWithDyad />
    </div>
  );
}