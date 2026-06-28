import React from 'react';
import { legalConfig } from '@/config/legal';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="border-b border-signal-border pb-6">
        <h2 className="text-2xl font-bold text-signal-text-primary tracking-tight mb-2 flex items-center gap-2">
          <FileText className="w-6 h-6 text-signal-amber" />
          Terms & Conditions
        </h2>
        <p className="text-sm text-signal-text-secondary font-mono">
          Last Updated: {legalConfig.lastUpdatedDate}
        </p>
      </div>

      <div className="prose prose-invert prose-signal max-w-none space-y-8">
        
        <section className="p-4 bg-signal-amber/10 border border-signal-amber/30 rounded-md">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-signal-amber flex-shrink-0 mt-0.5" />
            <p className="text-sm text-signal-text-secondary m-0">
              <strong>Acceptance of Terms:</strong> By accessing and using {legalConfig.siteOwner}, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">1. Use of {legalConfig.siteOwner}</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            {legalConfig.siteOwner} provides a virtual television network experience through web-based broadcast synchronization. You agree to use the service only for lawful purposes, and in a way that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">2. User Responsibilities</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            As a viewer of {legalConfig.siteOwner}, you agree that:
          </p>
          <ul className="list-none space-y-2 text-sm text-signal-text-secondary ml-0">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-signal-green mt-0.5" />
              <span>You will not attempt to disrupt the broadcast infrastructure or override synchronization logic.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-signal-green mt-0.5" />
              <span>You will not use automated scripts or scraping tools to extract broadcast metadata heavily without permission.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-signal-green mt-0.5" />
              <span>You understand that streaming quality depends on your local network connection.</span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">3. Intellectual Property</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            The {legalConfig.siteOwner} platform, including its original code, deterministic broadcast architecture, visual design (the "Signal" aesthetic), and originally produced channels (such as ACM TV, ACM Movies, ACM Music), are the intellectual property of {legalConfig.organizationName}.
          </p>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            For third-party media referenced by this platform, please refer to our <a href="/legal/disclaimer" className="text-signal-amber hover:underline">Disclaimer</a> and <a href="/legal/copyright" className="text-signal-amber hover:underline">Copyright Policy</a>. We make no claim of ownership over external channels or third-party assets.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">4. Availability & Modifications</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            We operate a continuous global broadcast. However, we reserve the right to:
          </p>
          <ul className="list-disc list-inside text-sm text-signal-text-secondary space-y-1 ml-2">
            <li>Modify or withdraw, temporarily or permanently, the platform (or any part thereof) with or without notice.</li>
            <li>Change the schedule, channel lineup, or underlying technology at any time.</li>
            <li>Limit access to certain geographical regions if required by external stream providers.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">5. External Links & Streams</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            Our platform contains links and stream references to websites and servers operated by third parties. We do not control these websites or servers, and we are not responsible for their content, privacy policies, or stability. Your use of such third-party streams is at your own risk.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">6. Limitation of Liability</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed uppercase tracking-wide font-mono opacity-80 border-l-4 border-signal-border pl-4">
            The service is provided "as is" and "as available". To the maximum extent permitted by law, {legalConfig.siteOwner} shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-signal-text-primary">7. Policy Updates</h3>
          <p className="text-sm text-signal-text-secondary leading-relaxed">
            We may revise these Terms from time to time. The most current version will always be available on this page. By continuing to access or use the platform after revisions become effective, you agree to be bound by the revised terms.
          </p>
        </section>

      </div>
    </div>
  );
}
