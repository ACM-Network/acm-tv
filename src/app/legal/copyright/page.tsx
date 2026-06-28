import React from 'react';
import { legalConfig } from '@/config/legal';
import { Scale, FileSignature, Clock, Mail } from 'lucide-react';

export default function CopyrightPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="border-b border-signal-border pb-6">
        <h2 className="text-2xl font-bold text-signal-text-primary tracking-tight mb-2 flex items-center gap-2">
          <Scale className="w-6 h-6 text-signal-amber" />
          Copyright & DMCA Policy
        </h2>
        <p className="text-sm text-signal-text-secondary font-mono">
          Last Updated: {legalConfig.lastUpdatedDate}
        </p>
      </div>

      <div className="prose prose-invert prose-signal max-w-none space-y-8">
        
        <section>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            {legalConfig.organizationName} respects the intellectual property rights of creators and broadcasting organizations. It is our policy to respond promptly and professionally to clear, good-faith notices of alleged copyright infringement.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-signal-amber" />
            Filing a Notice of Infringement
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            If you are a copyright owner or an authorized agent thereof, and you believe that a stream referenced on {legalConfig.siteOwner} infringes upon your copyrights, you may submit a notification. To help us process your request efficiently, please provide the following information in writing:
          </p>
          
          <div className="bg-signal-black border border-signal-border rounded-md p-5 space-y-3">
            <ul className="list-decimal list-inside text-sm text-signal-text-secondary space-y-2 ml-2">
              <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the copyright interest.</li>
              <li>Identification of the copyrighted work claimed to have been infringed.</li>
              <li>Identification of the material that is claimed to be infringing, including the specific channel name and the exact stream URL currently being referenced by our platform.</li>
              <li>Information reasonably sufficient to permit us to contact you, such as an address, telephone number, and email address.</li>
              <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <Mail className="w-5 h-5 text-signal-amber" />
            Designated Agent Contact
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            Please submit your notice to our designated Copyright Agent via email:
          </p>
          <div className="inline-block p-4 border border-signal-border rounded-md bg-signal-surface-raised">
            <p className="text-sm font-mono text-signal-text-primary mb-1">Copyright Agent</p>
            <p className="text-sm font-mono text-signal-amber">{legalConfig.copyrightEmail}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-signal-amber" />
            Review & Removal Process
          </h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            Upon receipt of a valid, complete notice:
          </p>
          <ol className="list-decimal list-inside text-sm text-signal-text-secondary space-y-2 ml-2">
            <li><strong>Review:</strong> Our team will review the claim to verify the stream reference in question.</li>
            <li><strong>Action:</strong> If the claim is substantiated, we will promptly remove the referenced stream URL from our aggregation engine, disabling access to it through {legalConfig.siteOwner}.</li>
            <li><strong>Timeline:</strong> We strive to process and respond to all valid requests within 48 to 72 business hours.</li>
            <li><strong>Notification:</strong> We will notify the submitting party once the removal action has been completed.</li>
          </ol>
        </section>

        <section className="space-y-4 pt-4 border-t border-signal-border">
          <p className="text-sm text-signal-text-tertiary leading-relaxed italic">
            Please note that because {legalConfig.siteOwner} acts only as an aggregator referencing publicly available streams, removing a link from our directory does not remove the actual media from its original host server. You may still need to contact the underlying streaming host to have the content permanently taken down.
          </p>
        </section>

      </div>
    </div>
  );
}
