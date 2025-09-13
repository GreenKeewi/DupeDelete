import { Button } from "@/components/ui/button"; // Assuming this path

export function Hero1() {
  return (
    <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Your Awesome Product
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              A brief description of your product and its benefits.
            </p>
          </div>
          <div className="space-x-4">
            {/* Changed Link to <a> and href to #pricing for scrolling */}
            <a href="#pricing" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="gap-4 w-full sm:px-4 sm:py-2 sm:text-sm"
              >
                Get Started
              </Button>
            </a>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}