import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CheckIcon } from 'lucide-react';

const features = [
  "Feature 1",
  "Feature 2",
  "Feature 3",
  "Feature 4",
];

export function PricingSection() {
  return (
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple, Transparent Pricing</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Choose the plan that's right for you. No hidden fees, no surprises.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-sm items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3 mt-10">
          <Card className="flex flex-col justify-between h-full">
            <CardHeader>
              <CardTitle>Basic</CardTitle>
              <CardDescription>Perfect for individuals getting started.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="text-4xl font-bold">$9</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">per month</div>
              <ul className="grid gap-2 text-sm">
                {features.slice(0, 2).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500" /> {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Get Started</Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between h-full border-2 border-primary">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>For growing teams needing more power.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="text-4xl font-bold">$29</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">per month</div>
              <ul className="grid gap-2 text-sm">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500" /> {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Go Pro</Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between h-full">
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>Custom solutions for large organizations.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="text-4xl font-bold">Custom</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">pricing</div>
              <ul className="grid gap-2 text-sm">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-500" /> {feature}
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-500" /> Dedicated Support
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline">Contact Sales</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}