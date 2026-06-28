import React from 'react';
import { legalConfig } from '@/config/legal';
import { Info, HelpCircle, Eye, Handshake } from 'lucide-react';

export default function DisclaimerPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="border-b border-signal-border pb-6">
        <h2 className="text-2xl font-bold text-signal-text-primary tracking-tight mb-2">
          Platform Disclaimer
        </h2>
        <p className="text-sm text-signal-text-secondary font-mono">
          Last Updated: {legalConfig.lastUpdatedDate}
        </p>
      </div>

      <div className="prose prose-invert prose-signal max-w-none space-y-8">
        
        <section className="bg-signal-surface-raised border border-signal-border rounded-md p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Info className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-signal-text-primary mb-3">
              Independent Media Aggregation
            </h3>
            <p className="text-sm text-signal-text-secondary leading-relaxed max-w-2xl">
              {legalConfig.siteOwner} operates as an independent media aggregation and content discovery platform. Our primary goal is to provide a synchronized, unified viewing interface for publicly accessible broadcast signals from around the world.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <Handshake className="w-5 h-5 text-signal-amber" />
            Content Ownership Acknowledgement
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            We hold deep respect for content creators and broadcasting networks. We wish to be absolutely clear regarding intellectual property:
          </p>
          <ul className="list-disc list-inside text-sm text-signal-text-secondary space-y-2 ml-2">
            <li><strong>ACM Original Content:</strong> Channels specifically branded under the ACM umbrella (such as ACM TV, ACM Movies, ACM Music, and ACM RCU) feature programming curated or owned by {legalConfig.organizationName}.</li>
            <li><strong>Third-Party Content:</strong> Unless explicitly identified as an ACM original, {legalConfig.siteOwner} does not own the television channels, movies, songs, trailers, logos, images, posters, metadata, or branding displayed on this platform.</li>
          </ul>
          <p className="text-sm text-signal-text-secondary leading-relaxed mt-2">
            All such third-party assets remain the exclusive property of their respective copyright owners.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <Eye className="w-5 h-5 text-signal-amber" />
            Transparent Referencing
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            {legalConfig.siteOwner} does not host, upload, rebroadcast, or redistribute third-party media files on our own servers.
          </p>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            Instead, our platform references publicly accessible streaming sources (such as HLS `.m3u8` feeds or MP4 links) for the convenience of our users. We act as a specialized web browser that organizes and synchronizes these existing public signals.
          </p>
          <div className="p-4 border-l-4 border-signal-green bg-signal-green/10 rounded-r-md mt-4">
            <p className="text-sm text-signal-text-primary font-medium">
              Commitment to Transparency
            </p>
            <p className="text-sm text-signal-text-secondary mt-1">
              Whenever available, the original source stream URL used by {legalConfig.siteOwner} is transparently displayed within the player settings or the corresponding channel page, ensuring viewers can identify the origin of the broadcast.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-signal-amber" />
            Rights Holders Inquiries
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            We are committed to cooperating with intellectual property owners. If you are a copyright holder and have concerns about how your publicly available stream is referenced on our platform, please review our <a href="/legal/copyright" className="text-signal-amber hover:underline">Copyright Policy</a> for instructions on submitting a request. We handle all inquiries promptly and professionally.
          </p>
        </section>

      </div>
    </div>
  );
}
