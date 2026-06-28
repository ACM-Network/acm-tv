'use client';

import Link from 'next/link';
import { Tv, Mail, MapPin, Phone } from 'lucide-react';
import { legalConfig } from '@/config/legal';

export default function Footer() {
  return (
    <footer className="bg-signal-black border-t border-signal-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand & Abstract */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-sm bg-signal-surface-raised border border-signal-border flex items-center justify-center">
                <Tv className="w-3 h-3 text-signal-amber" />
              </div>
              <span className="text-[13px] font-bold tracking-wide text-signal-text-primary">
                ACM<span className="text-signal-amber ml-0.5">TV</span>
              </span>
            </div>
            <p className="text-[12px] font-medium text-signal-text-secondary leading-relaxed max-w-sm">
              Global UTC-synchronized virtual television network. Broadcasting premium content, movie trailers, RCU promos, and music videos in absolute real-time sync.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-signal-green" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary">All Systems Nominal</span>
            </div>
          </div>

          {/* Navigation Links Group */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            
            {/* Products / Network */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary">
                Network
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'ACM Flagship', href: '/live?channel=acm-tv' },
                  { label: 'ACM Movies', href: '/live?channel=acm-movies' },
                  { label: 'ACM Music', href: '/live?channel=acm-music' },
                  { label: 'ACM RCU', href: '/live?channel=acm-rcu' },
                  { label: 'Programs Guide', href: '/programs' },
                  { label: 'Schedule', href: '/schedule' },
                ].map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] font-medium text-signal-text-secondary hover:text-signal-amber transition-colors inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary">
                Legal
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Legal Center', href: '/legal' },
                  { label: 'Privacy Policy', href: '/legal/privacy' },
                  { label: 'Terms & Conditions', href: '/legal/terms' },
                  { label: 'Disclaimer', href: '/legal/disclaimer' },
                  { label: 'Copyright / DMCA', href: '/legal/copyright' },
                ].map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] font-medium text-signal-text-secondary hover:text-signal-text-primary transition-colors inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support / Company */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary">
                Company
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'About ACM TV', href: '/about' },
                  { label: 'Contact Us', href: '/contact' },
                ].map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] font-medium text-signal-text-secondary hover:text-signal-text-primary transition-colors inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary">
                Broadcast Desk
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-signal-text-secondary">
                  <Mail className="w-3.5 h-3.5 mt-0.5 text-signal-text-tertiary flex-shrink-0" />
                  <span className="text-[12px] font-medium break-all">{legalConfig.contactEmail}</span>
                </div>
                <div className="flex items-start gap-2.5 text-signal-text-secondary">
                  <Phone className="w-3.5 h-3.5 mt-0.5 text-signal-text-tertiary flex-shrink-0" />
                  <span className="text-[12px] font-medium font-mono">+1 (800) 555-ACMTV</span>
                </div>
                <div className="flex items-start gap-2.5 text-signal-text-secondary">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-signal-text-tertiary flex-shrink-0" />
                  <span className="text-[12px] font-medium leading-snug">Realm Plaza<br/>Los Angeles, CA</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-signal-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-medium text-signal-text-tertiary">
            © {legalConfig.copyrightYear} {legalConfig.organizationName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="text-[11px] font-medium text-signal-text-tertiary/50">
              {legalConfig.siteOwner} Policy v{legalConfig.policyVersion}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
