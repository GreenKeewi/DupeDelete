import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SessionContextProvider } from "@/components/SessionContextProvider"; // Import SessionContextProvider
import { Toaster } from "@/components/ui/sonner"; // Import Toaster for notifications

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DupeDelete",
  description: "Clean your folders in seconds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <SessionContextProvider> {/* Wrap the entire app with SessionContextProvider */}
          <Navbar />
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
          <Toaster /> {/* Add Toaster for notifications */}
        </SessionContextProvider>
      </body>
    </html>
  );
}