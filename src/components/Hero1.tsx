import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Hero1 = () => (
  <div className="w-full">
    <div className="container mx-auto px-4">
      <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
        <div>
          <Button variant="secondary" size="sm" className="gap-4">
            Learn how DupeDelete works <MoveRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-4 flex-col">
          <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
            Clean Your Folders in Seconds
          </h1>
          <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
            Stop wasting storage on duplicate files. DupeDelete scans your folder, shows duplicates in a checklist, and lets you keep what you want — all in just a few clicks.
          </p>
        </div>
        <div className="flex flex-row gap-3">
          <Button size="lg" variant="default" className="gap-4"> {/* Changed to default variant to use primary color */}
            Clean up to 100 files free
          </Button>
          <Button size="lg" className="gap-4 bg-accent text-accent-foreground hover:bg-accent/90"> {/* Applied accent color directly */}
            Upgrade for unlimited cleaning <MoveRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
);