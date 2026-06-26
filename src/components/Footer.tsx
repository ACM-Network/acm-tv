'use client';

import Link from 'next/link';
import { Tv, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-signal-black border-t border-signal-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          
          {/* Brand & Abstract */}
          <div className="md:col-span-5 space-y-4">
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

          {/* Network Channels */}
          <div className="md:col-span-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary mb-4">
              Network Channels
            </h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {[
                { label: 'ACM Flagship', href: '/live?channel=acm-tv' },
                { label: 'ACM Movies', href: '/live?channel=acm-movies' },
                { label: 'ACM Music', href: '/live?channel=acm-music' },
                { label: 'ACM Trailers', href: '/live?channel=acm-trailers' },
                { label: 'ACM RCU', href: '/live?channel=acm-rcu' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[12px] font-medium text-signal-text-secondary hover:text-signal-amber transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-signal-border-active" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact & Legal */}
          <div className="md:col-span-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary mb-4">
              Broadcast Desk
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-signal-text-secondary">
                <Mail className="w-3.5 h-3.5 mt-0.5 text-signal-text-tertiary" />
                <span className="text-[12px] font-medium">broadcast@acmtv.network</span>
              </div>
              <div className="flex items-start gap-2.5 text-signal-text-secondary">
                <Phone className="w-3.5 h-3.5 mt-0.5 text-signal-text-tertiary" />
                <span className="text-[12px] font-medium font-mono">+1 (800) 555-ACMTV</span>
              </div>
              <div className="flex items-start gap-2.5 text-signal-text-secondary">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-signal-text-tertiary" />
                <span className="text-[12px] font-medium leading-snug">Realm Plaza<br/>Los Angeles, CA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-signal-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-medium text-signal-text-tertiary">
            © {new Date().getFullYear()} ACM Network. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-[11px] font-medium text-signal-text-tertiary hover:text-signal-text-secondary transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-[11px] font-medium text-signal-text-tertiary hover:text-signal-text-secondary transition-colors">Terms of Service</Link>
            <Link href="#" className="text-[11px] font-medium text-signal-text-tertiary hover:text-signal-text-secondary transition-colors">FCC Compliance</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
