import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FirstVisitNotice from "@/components/FirstVisitNotice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACM TV | Signal Broadcast",
  description: "Experience the next generation of broadcasting with ACM TV. Global UTC-synchronized virtual television network.",
  keywords: ["ACM TV", "Live Broadcast", "Virtual Television", "OTT Network"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-signal-black text-signal-text-primary antialiased min-h-screen flex flex-col selection:bg-signal-amber-glow selection:text-white">
        {/* Navigation Bar */}
        <Navigation />
        
        {/* Main Content Area */}
        <main className="flex-grow pt-16">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
        
        {/* Global Overlays */}
        <FirstVisitNotice />
      </body>
    </html>
  );
}
