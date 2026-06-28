import React from 'react';
import Link from 'next/link';
import { Shield, FileText, AlertCircle, Scale, ArrowRight } from 'lucide-react';
import { legalConfig } from '@/config/legal';

const legalCards = [
  {
    href: '/legal/privacy',
    title: 'Privacy Policy',
    description: 'Learn how we collect, use, and protect your data while you use the platform.',
    icon: Shield,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10'
  },
  {
    href: '/legal/terms',
    title: 'Terms & Conditions',
    description: 'The rules, guidelines, and agreements that govern your use of ACM TV.',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    href: '/legal/disclaimer',
    title: 'Disclaimer',
    description: 'Important information regarding our role as a media aggregator and stream reference platform.',
    icon: AlertCircle,
    color: 'text-signal-amber',
    bgColor: 'bg-signal-amber/10'
  },
  {
    href: '/legal/copyright',
    title: 'Copyright / DMCA',
    description: 'Information for copyright holders, and our procedure for addressing infringement claims.',
    icon: Scale,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  }
];

export default function LegalIndexPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="space-y-3 border-b border-signal-border pb-6">
        <h2 className="text-2xl font-bold text-signal-text-primary tracking-tight">
          Overview
        </h2>
        <p className="text-sm text-signal-text-secondary leading-relaxed">
          Welcome to the {legalConfig.siteOwner} Legal Center. We believe in absolute transparency regarding how our platform operates, what content we host versus reference, and how your data is handled. Please select a document below to review our policies in detail.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {legalCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link 
              key={card.href} 
              href={card.href}
              className="group block p-6 bg-signal-black border border-signal-border rounded-lg hover:border-signal-amber/50 hover:bg-signal-surface-raised transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-md ${card.bgColor} ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-signal-text-tertiary group-hover:text-signal-amber group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-lg font-bold text-signal-text-primary mb-2 group-hover:text-signal-amber transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-signal-text-secondary leading-relaxed">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-8 p-6 bg-signal-black border-l-2 border-signal-amber rounded-r-lg">
        <h4 className="text-sm font-bold text-signal-text-primary mb-2">Need to contact us directly?</h4>
        <p className="text-sm text-signal-text-secondary mb-4">
          If you have questions not covered by our legal documentation, you can reach out to our team.
        </p>
        <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-signal-amber hover:text-amber-400 transition-colors">
          Go to Contact Center <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
