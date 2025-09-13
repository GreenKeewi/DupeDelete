"use client";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // You could optionally fetch more details about the session here if needed
      // For now, we'll just show a success toast. The webhook handles DB updates.
      toast.success("Your subscription payment was successful!", { id: "payment-success" });
    } else {
      toast.error("Payment success could not be verified. Please check your dashboard.", { id: "payment-error" });
    }
  }, [sessionId]);

  return (
    <main className="container mx-auto p-4 md:p-10 min-h-[calc(100vh-128px)] flex flex-col items-center justify-center text-center">
      <CheckCircle className="h-24 w-24 text-primary mb-6" />
      <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Thank you for your purchase. Your plan has been activated, and you can now enjoy unlimited cleaning.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/dashboard"> {/* Assuming a dashboard route exists */}
          <Button size="lg">Go to Dashboard</Button>
        </Link>
        <Link href="/cleanup">
          <Button size="lg" variant="outline">Start Cleaning Now</Button>
        </Link>
      </div>
    </main>
  );
}