"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PricingSection } from "@/components/PricingSection"; // Import the new PricingSection

export const Feature1 = () => (
  <div id="how-it-works" className="w-full py-20 lg:py-40">
    <div className="container mx-auto px-4">
      <div className="p-8 grid border rounded-lg py-8 grid-cols-1 gap-8 items-center lg:grid-cols-2">
        <div className="flex gap-10 flex-col">
          <div className="flex gap-4 flex-col">
            <div>
              <Badge variant="outline">How it works</Badge>
            </div>
            <div className="flex gap-2 flex-col">
              <h2 className="text-3xl lg:text-5xl tracking-tighter max-w-xl text-left font-regular">
                Clean your images in 3 simple steps
              </h2>
              <p className="text-lg leading-relaxed tracking-tight text-muted-foreground max-w-xl text-left">
                DupeDelete simplifies image management: upload your folder, review detected duplicate images, and download your cleaned collection.
              </p>
            </div>
          </div>
          <div className="grid lg:pl-6 grid-cols-1 sm:grid-cols-3 items-start lg:grid-cols-1 gap-6">
            <div className="flex flex-row gap-6 items-start">
              <Check className="w-4 h-4 mt-2 text-primary" />
              <div className="flex flex-col gap-1">
                <p>Upload your folder</p>
                <p className="text-muted-foreground text-sm">
                  Securely upload your local folder (as a zip) for a quick scan.
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-6 items-start">
              <Check className="w-4 h-4 mt-2 text-primary" />
              <div className="flex flex-col gap-1">
                <p>Review duplicate images</p>
                <p className="text-muted-foreground text-sm">
                  See a clear list of duplicate images and decide which ones to keep or delete.
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-6 items-start">
              <Check className="w-4 h-4 mt-2 text-primary" />
              <div className="flex flex-col gap-1">
                <p>Download cleaned images</p>
                <p className="text-muted-foreground text-sm">
                  Get a new, organized zip file with only the unique images you want.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted rounded-md aspect-square flex items-center justify-center text-muted-foreground p-6">
          <span className="text-sm">Preview coming soon</span>
        </div>
      </div>
      {/* Render the PricingSection directly below the Feature1 content */}
      <div className="mt-20"> {/* Add some margin for spacing */}
        <PricingSection />
      </div>
    </div>
  </div>
);