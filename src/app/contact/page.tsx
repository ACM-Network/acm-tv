import React from 'react';
import { legalConfig } from '@/config/legal';
import { Mail, MessageSquare, Bug, Lightbulb, Scale, Briefcase, ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | ACM TV',
  description: 'Get in touch with ACM TV. Reach our broadcast desk, engineering team, or legal team for enquiries, bug reports, feature requests, or copyright matters.',
};


const contactOptions = [
  {
    title: 'General Enquiries',
    description: 'Have a question about how the platform works? Looking for a specific channel? Reach out to our broadcast desk.',
    icon: MessageSquare,
    email: legalConfig.contactEmail,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10'
  },
  {
    title: 'Bug Reports',
    description: 'Experiencing playback issues, synchronization drift, or visual glitches? Let our engineering team know.',
    icon: Bug,
    email: legalConfig.supportEmail,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10'
  },
  {
    title: 'Feature Requests',
    description: 'Have an idea for a new feature or an enhancement to the schedule guide? We are always open to feedback.',
    icon: Lightbulb,
    email: legalConfig.supportEmail,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10'
  },
  {
    title: 'Copyright Requests',
    description: 'Are you a copyright holder with concerns about a referenced stream? Contact our designated agent.',
    icon: Scale,
    email: legalConfig.copyrightEmail,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10'
  },
  {
    title: 'Business Enquiries',
    description: 'Interested in partnering with ACM TV, advertising, or adding your original channel to our platform?',
    icon: Briefcase,
    email: legalConfig.businessEmail,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10'
  }
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-signal-black">
      
      {/* Header Section */}
      <div className="border-b border-signal-border bg-signal-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-signal-amber/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-signal-text-primary tracking-tight">
              Get in Touch
            </h1>
            <p className="mt-4 text-lg text-signal-text-secondary max-w-2xl mx-auto">
              Our broadcast desk and engineering teams are ready to assist you. Select the category that best matches your inquiry below.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {contactOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <div 
                key={index}
                className="group relative flex flex-col p-8 bg-signal-surface border border-signal-border rounded-2xl hover:border-signal-amber/50 hover:bg-signal-surface-raised transition-all duration-300"
              >
                <div className={`p-4 rounded-xl inline-flex w-fit mb-6 ${option.bgColor} ${option.color}`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-signal-text-primary mb-3">
                  {option.title}
                </h3>
                <p className="text-sm text-signal-text-secondary leading-relaxed flex-grow mb-8">
                  {option.description}
                </p>
                
                <a 
                  href={`mailto:${option.email}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-signal-text-primary group-hover:text-signal-amber transition-colors mt-auto pt-6 border-t border-signal-border/50"
                >
                  <Mail className="w-4 h-4 text-signal-text-tertiary group-hover:text-signal-amber transition-colors" />
                  <span className="font-mono">{option.email}</span>
                  <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            );
          })}
        </div>
        
        {/* Physical Location Notice */}
        <div className="mt-16 p-8 sm:p-12 bg-signal-surface-raised border border-signal-border rounded-2xl text-center max-w-3xl mx-auto">
          <h4 className="text-sm font-bold uppercase tracking-widest text-signal-text-tertiary mb-2">
            Physical Headquarters
          </h4>
          <p className="text-base text-signal-text-secondary leading-relaxed mb-6">
            While our network operates virtually across global nodes, our physical operations and legal entities are headquartered in Los Angeles.
          </p>
          <div className="inline-block p-4 border border-signal-border bg-signal-black rounded-lg text-sm font-mono text-signal-text-primary">
            {legalConfig.organizationName}<br />
            Realm Plaza<br />
            Los Angeles, CA
          </div>
        </div>
      </div>
      
    </div>
  );
}
