import React from 'react';
import { legalConfig } from '@/config/legal';
import { ShieldCheck, Database, HardDrive, Info } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="border-b border-signal-border pb-6">
        <h2 className="text-2xl font-bold text-signal-text-primary tracking-tight mb-2">
          Privacy Policy
        </h2>
        <p className="text-sm text-signal-text-secondary font-mono">
          Last Updated: {legalConfig.lastUpdatedDate}
        </p>
      </div>

      <div className="prose prose-invert prose-signal max-w-none space-y-8">
        
        <section>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            At {legalConfig.siteOwner}, we believe in a transparent and minimally invasive broadcast experience. 
            This Privacy Policy explains how we handle data when you tune in to our network. We prioritize your privacy 
            and only utilize local data storage necessary to ensure seamless playback and synchronize our deterministic broadcast engine.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <Database className="w-5 h-5 text-signal-amber" />
            Information We Do Not Collect
          </h3>
          <div className="bg-signal-black border border-signal-border rounded-md p-4 space-y-2">
            <p className="text-sm text-signal-text-secondary">
              Unlike traditional streaming platforms, {legalConfig.siteOwner} operates without user accounts or tracking profiles. Therefore, we <strong>do not</strong> collect:
            </p>
            <ul className="list-disc list-inside text-sm text-signal-text-secondary space-y-1 ml-2">
              <li>Names, email addresses, or physical addresses</li>
              <li>Payment information or credit card data</li>
              <li>Viewing history tied to an identifiable profile</li>
              <li>Cross-site tracking identifiers</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-signal-amber" />
            Local Storage & Client-Side Data
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            To provide features such as muting preferences, subtitle toggles, and acknowledging our legal notices, {legalConfig.siteOwner} utilizes your browser's <code>localStorage</code>.
          </p>
          
          <div className="flex gap-4 p-4 bg-signal-surface-raised border-l-4 border-signal-amber rounded-r-md">
            <Info className="w-5 h-5 text-signal-amber flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-signal-text-primary">What is localStorage?</h4>
              <p className="text-sm text-signal-text-secondary">
                Local storage is a standard web technology that allows our application to save small pieces of configuration data directly on your device. This data never leaves your device and is never sent to our servers.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">Device & Network Information</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            When you connect to our broadcast servers to retrieve video streams, standard network logs may be generated. These logs typically include IP addresses, browser types, and timestamp data. This information is purely used for:
          </p>
          <ul className="list-disc list-inside text-sm text-signal-text-secondary space-y-1 ml-2">
            <li>Maintaining network security and preventing DDoS attacks.</li>
            <li>Routing traffic efficiently through Content Delivery Networks (CDNs).</li>
            <li>Diagnosing playback errors or synchronization drift.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">Third-Party Services & Streams</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            {legalConfig.siteOwner} aggregates publicly available stream URLs for third-party channels. When you tune into a third-party channel, your media player connects directly to the respective broadcaster's servers.
          </p>
          <div className="p-4 border border-signal-border rounded-md bg-signal-black">
            <p className="text-sm text-signal-text-secondary">
              <strong>Important:</strong> These third-party broadcasters may have their own privacy policies and data collection methods (such as logging IP addresses when delivering video chunks). We do not control their data practices.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">Children's Privacy</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            {legalConfig.siteOwner} is intended for a general audience. We do not knowingly collect personal information from children under the age of 13. Given our architecture, we do not collect personal information from any user, regardless of age.
          </p>
        </section>

        <section className="space-y-4 pt-4 border-t border-signal-border">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-signal-amber" />
            Contacting the Broadcast Desk
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            If you have any questions regarding this Privacy Policy or how your data is handled locally, you can reach our team at:
          </p>
          <p className="text-sm font-mono text-signal-amber bg-signal-black p-3 rounded-md border border-signal-border inline-block">
            {legalConfig.contactEmail}
          </p>
        </section>

      </div>
    </div>
  );
}
