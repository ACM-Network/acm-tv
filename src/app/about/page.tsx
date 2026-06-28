import React from 'react';
import { Tv, Cpu, Globe, Rocket, Zap, Heart } from 'lucide-react';
import { legalConfig } from '@/config/legal';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | ACM TV',
  description: 'Learn about ACM TV — the global UTC-synchronized virtual television network merging the nostalgia of linear TV with modern web technologies.',
};


export default function AboutPage() {
  return (
    <div className="min-h-screen bg-signal-black">
      
      {/* Hero Section */}
      <div className="bg-signal-surface border-b border-signal-border relative overflow-hidden">
        {/* Abstract Background Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full max-h-96 bg-signal-amber/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-signal-black border border-signal-amber/30 text-signal-amber rounded-full text-xs font-mono uppercase tracking-widest">
              <Tv className="w-4 h-4" />
              <span>About The Network</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-signal-text-primary tracking-tight leading-tight">
              Redefining the Virtual Broadcast Experience.
            </h1>
            <p className="text-lg sm:text-xl text-signal-text-secondary leading-relaxed max-w-2xl">
              {legalConfig.siteOwner} is a global, deterministic virtual television network. We merge the nostalgic experience of linear TV surfing with modern web technologies.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-24">
        
        {/* Section: What is ACM TV */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-signal-text-primary">What is {legalConfig.siteOwner}?</h2>
            <p className="text-base text-signal-text-secondary leading-relaxed">
              In an era dominated by endless VOD (Video on Demand) scrolling and algorithmic paralysis, {legalConfig.siteOwner} offers a curated, synchronized viewing experience. When you tune in to a channel on our network, you are watching the exact same frame of video, at the exact same millisecond, as every other viewer around the world.
            </p>
            <p className="text-base text-signal-text-secondary leading-relaxed">
              We aggregate premium publicly available streams and combine them with our own original programming, wrapped in a seamless, ultra-fast interface designed to feel like a high-end broadcast console.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-signal-border bg-signal-surface-raised aspect-video flex items-center justify-center group">
            <div className="absolute inset-0 bg-gradient-to-tr from-signal-amber/20 to-transparent opacity-50" />
            <Globe className="w-32 h-32 text-signal-border-active group-hover:text-signal-amber transition-colors duration-700" />
          </div>
        </section>

        {/* Section: Content Ecosystem */}
        <section className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold text-signal-text-primary">The Content Ecosystem</h2>
            <p className="text-base text-signal-text-secondary leading-relaxed">
              Our directory is categorized into distinct pillars to ensure transparency and quality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Originals */}
            <div className="p-8 bg-signal-surface border border-signal-border rounded-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-signal-amber/10 blur-[50px]" />
              <Heart className="w-8 h-8 text-signal-amber" />
              <h3 className="text-2xl font-bold text-signal-text-primary">ACM Originals</h3>
              <p className="text-sm text-signal-text-secondary leading-relaxed">
                Channels curated, assembled, and broadcasted natively by {legalConfig.organizationName} using our UTC deterministic engine.
              </p>
              <ul className="space-y-2 mt-4 pt-4 border-t border-signal-border/50">
                <li className="flex items-center gap-2 text-sm text-signal-text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-amber" /> ACM TV (Flagship)
                </li>
                <li className="flex items-center gap-2 text-sm text-signal-text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-amber" /> ACM Movies
                </li>
                <li className="flex items-center gap-2 text-sm text-signal-text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-amber" /> ACM Music
                </li>
                <li className="flex items-center gap-2 text-sm text-signal-text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-amber" /> ACM RCU
                </li>
              </ul>
            </div>

            {/* Third Party */}
            <div className="p-8 bg-signal-surface border border-signal-border rounded-xl space-y-4">
              <Globe className="w-8 h-8 text-signal-text-tertiary" />
              <h3 className="text-2xl font-bold text-signal-text-primary">Third-Party Affiliates</h3>
              <p className="text-sm text-signal-text-secondary leading-relaxed">
                Publicly accessible streams aggregated into our guide for your convenience.
              </p>
              <p className="text-sm text-signal-text-tertiary leading-relaxed p-4 bg-signal-black border border-signal-border rounded-lg mt-4">
                These channels, along with their respective movies, shows, logos, and branding, remain the exclusive property of their original copyright owners. {legalConfig.organizationName} does not host or claim ownership over these external streams.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Technology Stack */}
        <section className="p-10 rounded-2xl bg-signal-surface-raised border border-signal-border grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-3xl font-bold text-signal-text-primary">The Architecture</h2>
            <p className="text-base text-signal-text-secondary leading-relaxed">
              Built on a foundation of modern web technologies, {legalConfig.siteOwner} achieves synchronized playback without the need for expensive, centralized transcoder arrays.
            </p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-signal-amber">
                <Cpu className="w-5 h-5" />
                <h4 className="font-bold">UTC Synchronization</h4>
              </div>
              <p className="text-sm text-signal-text-secondary">Using Coordinated Universal Time as an immutable anchor, our player calculates the exact millisecond offset required for every video file locally on your device.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-signal-amber">
                <Zap className="w-5 h-5" />
                <h4 className="font-bold">Edge Delivery</h4>
              </div>
              <p className="text-sm text-signal-text-secondary">Our application wrapper is incredibly lightweight, allowing for near-instant load times and rapid channel surfing capabilities.</p>
            </div>
          </div>
        </section>

        {/* Section: Future Vision */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <Rocket className="w-12 h-12 text-signal-amber mx-auto" />
          <h2 className="text-3xl font-bold text-signal-text-primary">Our Future Vision</h2>
          <p className="text-base text-signal-text-secondary leading-relaxed">
            We are continuously expanding the capabilities of our broadcast engine. Our roadmap includes interactive schedule guides, cross-platform app deployments, and fostering partnerships with independent creators to provide a revolutionary new medium for digital broadcasting.
          </p>
        </section>

      </div>
    </div>
  );
}
