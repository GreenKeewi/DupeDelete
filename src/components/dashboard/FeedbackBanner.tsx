"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquareText } from "lucide-react";

export const FeedbackBanner = () => {
  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <MessageSquareText className="h-8 w-8 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">We want your feedback!</h3>
          <p className="text-sm text-muted-foreground">Help us improve DupeDelete by sharing your thoughts.</p>
        </div>
      </div>
      <Link 
        href="https://insigh.to/b/dupedelete" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="w-full md:w-auto"
      >
        <Button variant="default" className="w-full">
          Give Feedback
        </Button>
      </Link>
    </div>
  );
};