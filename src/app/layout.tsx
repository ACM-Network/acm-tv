import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACM TV | Entertainment Without Limits",
  description: "Experience the next generation of broadcasting with ACM TV. A global virtual television network playing premium content, movie trailers, RCU promos, and music videos in absolute real-time sync.",
  keywords: ["ACM TV", "Live Broadcast", "Virtual Television", "OTT Network", "Realm Cinematic Universe", "Movie Trailers"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-black text-white antialiased min-h-screen flex flex-col scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {/* Navigation Bar */}
        <Navigation />
        
        {/* Main Content Area */}
        <main className="flex-grow pt-16">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </body>
    </html>
  );
}

