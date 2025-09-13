import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  return (
    <main className="container mx-auto p-4 md:p-10 min-h-[calc(100vh-128px)] flex flex-col items-center justify-center text-center">
      <CheckCircle className="h-24 w-24 text-primary mb-6" />
      <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Thank you for your purchase. Your plan has been activated, and you can now enjoy unlimited cleaning.
      </p>
      <Link href="/cleanup">
        <Button size="lg">Start Cleaning Now</Button>
      </Link>
    </main>
  );
}