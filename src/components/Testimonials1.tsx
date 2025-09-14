"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Testimonials1 = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const testimonials = [
    {
      title: "A Game Changer for My Photo Library!",
      text: "I had thousands of photos scattered across my drives, and DupeDelete helped me clean up duplicates in minutes. My storage is so much lighter now, and finding photos is a breeze!",
      name: "Sarah J.",
      initials: "SJ",
    },
    {
      title: "Incredibly Easy to Use",
      text: "The interface is intuitive, and the comparison tool is fantastic for reviewing similar images. I finally have an organized image collection without the headache.",
      name: "Michael P.",
      initials: "MP",
    },
    {
      title: "Saved Me Hours of Manual Work",
      text: "Before DupeDelete, I dreaded organizing my design assets. Now, it's a breeze to identify and remove redundant files. Highly recommend for any creative professional!",
      name: "Emily R.",
      initials: "ER",
    },
    {
      title: "Accurate and Efficient",
      text: "I was skeptical, but DupeDelete found duplicates I didn't even know I had, thanks to its advanced detection methods. It's incredibly accurate and fast.",
      name: "David L.",
      initials: "DL",
    },
    {
      title: "Worth Every Penny",
      text: "Upgraded to the Pro plan and haven't looked back. Unlimited cleaning is essential for my large photography projects, and the priority support is a bonus.",
      name: "Jessica T.",
      initials: "JT",
    },
    {
      title: "Finally, a Clean Desktop!",
      text: "My desktop used to be a graveyard of duplicate screenshots and downloads. DupeDelete brought order to the chaos. Simple, effective, and a huge relief!",
      name: "Alex K.",
      initials: "AK",
    },
    {
      title: "Essential Tool for Digital Hoarders",
      text: "If you're like me and accumulate files, this tool is a must-have. It's like having a personal assistant for your digital clutter.",
      name: "Chris B.",
      initials: "CB",
    },
  ];

  useEffect(() => {
    if (!api) {
      return;
    }

    const timer = setTimeout(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent(current + 1);
      }
    }, 4000); // Auto-scroll every 4 seconds

    return () => clearTimeout(timer); // Cleanup on unmount or re-render
  }, [api, current, testimonials.length]); // Added testimonials.length to dependencies

  return (
    <div className="w-full py-20 p-8 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <h2 className="text-3xl md:text-5xl tracking-tighter lg:max-w-xl font-regular text-left">
            Trusted by thousands to keep their digital life tidy.
          </h2>
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem className="lg:basis-1/2" key={index}>
                  <div className="bg-muted rounded-md h-full lg:col-span-2 p-6 aspect-video flex justify-between flex-col">
                    <UserIcon className="w-8 h-8 stroke-1 text-primary" />
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col">
                        <h3 className="text-xl tracking-tight">
                          {testimonial.title}
                        </h3>
                        <p className="text-muted-foreground max-w-xs text-base">
                          {testimonial.text}
                        </p>
                      </div>
                      <p className="flex flex-row gap-2 text-sm items-center">
                        <span className="text-muted-foreground">By</span>{" "}
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{testimonial.initials}</AvatarFallback>
                        </Avatar>
                        <span>{testimonial.name}</span>
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
};