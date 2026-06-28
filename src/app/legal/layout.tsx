'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, FileText, AlertCircle, Scale, Building2 } from 'lucide-react';
import { legalConfig } from '@/config/legal';

const legalLinks = [
  { href: '/legal', label: 'Legal Center', icon: Building2, exact: true },
  { href: '/legal/privacy', label: 'Privacy Policy', icon: Shield },
  { href: '/legal/terms', label: 'Terms & Conditions', icon: FileText },
  { href: '/legal/disclaimer', label: 'Disclaimer', icon: AlertCircle },
  { href: '/legal/copyright', label: 'Copyright / DMCA', icon: Scale },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-signal-black">
      
      {/* Hero Section */}
      <div className="bg-signal-surface border-b border-signal-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-bold text-signal-text-primary tracking-tight mb-4">
              {legalConfig.siteOwner} Legal Center
            </h1>
            <p className="text-base sm:text-lg text-signal-text-secondary leading-relaxed font-mono">
              Transparency, compliance, and user rights. Everything you need to know about how {legalConfig.siteOwner} operates and protects your experience.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-signal-black border border-signal-border rounded text-[11px] font-mono text-signal-text-tertiary">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-amber" />
                Policy Version {legalConfig.policyVersion}
              </span>
              <span className="text-[11px] font-mono text-signal-text-tertiary">
                Last Updated: {legalConfig.lastUpdatedDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-2" aria-label="Legal documents navigation">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-signal-text-tertiary mb-4 ml-3">
                Legal Documents
              </h3>
              <ul className="space-y-1">
                {legalLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = link.exact 
                    ? pathname === link.href 
                    : pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                          isActive
                            ? 'bg-signal-amber-dim border border-signal-border-active text-signal-amber'
                            : 'text-signal-text-secondary hover:text-signal-amber hover:bg-signal-surface'
                        }`}
                      >
                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-signal-amber' : 'text-signal-text-tertiary group-hover:text-signal-amber'}`} />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Document Content */}
          <main className="flex-1 min-w-0 max-w-4xl">
            <div className="bg-signal-surface border border-signal-border rounded-xl p-6 sm:p-10 shadow-2xl">
              {children}
            </div>
          </main>
          
        </div>
      </div>
    </div>
  );
}

