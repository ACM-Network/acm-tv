'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ShieldAlert, X } from 'lucide-react';
import { legalConfig } from '@/config/legal';

export default function FirstVisitNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // We delay the check slightly to ensure client-side rendering is ready
    // and to allow the rest of the app to load before showing the modal.
    const checkNotice = () => {
      const acceptedVersion = localStorage.getItem('acmtv-legal-notice-version');
      if (acceptedVersion !== legalConfig.legalNoticeVersion) {
        setIsVisible(true);
      }
    };
    
    // Add a slight delay for a premium feel
    const timer = setTimeout(checkNotice, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('acmtv-legal-notice-version', legalConfig.legalNoticeVersion);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop with strong blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-signal-surface/90 border border-signal-border backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-labelledby="legal-notice-title"
            aria-modal="true"
          >
            {/* Top Amber Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-signal-amber to-amber-700" />
            
            <div className="p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-signal-amber/10 rounded-lg border border-signal-amber/20">
                    <ShieldAlert className="w-6 h-6 text-signal-amber" />
                  </div>
                  <div>
                    <h2 id="legal-notice-title" className="text-xl sm:text-2xl font-bold text-signal-text-primary tracking-tight">
                      Welcome to ACM TV
                    </h2>
                    <p className="text-xs text-signal-amber font-mono uppercase tracking-wider mt-1">
                      Version {legalConfig.legalNoticeVersion} Notice
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAccept}
                  className="text-signal-text-tertiary hover:text-signal-text-primary transition-colors p-1"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 text-sm sm:text-base text-signal-text-secondary leading-relaxed">
                <p>
                  {legalConfig.siteOwner} is an independent content discovery and premium viewing platform.
                </p>
                <p>
                  Unless explicitly identified as ACM original programming, {legalConfig.siteOwner} does not own, host, upload, or redistribute the television channels, movies, music, trailers, or other third-party media referenced by this network. <strong>Content remains the property of its respective copyright owners.</strong>
                </p>
                <p>
                  Where available, the publicly accessible source stream used by {legalConfig.siteOwner} is transparently displayed within the corresponding channel or content page.
                </p>
                <p className="text-signal-text-tertiary text-sm border-l-2 border-signal-border pl-4 italic">
                  By continuing to use {legalConfig.siteOwner}, you acknowledge that you have read and accepted our Privacy Policy, Terms & Conditions, Disclaimer, and Copyright Policy.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-signal-border/50">
                <Link
                  href="/legal"
                  onClick={() => {
                    // Let them read it without closing if they want, or we can close it on nav.
                    // Closing it so it doesn't block the legal page itself makes sense.
                    handleAccept();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-md border border-signal-border bg-signal-black/50 text-signal-text-secondary hover:text-signal-text-primary hover:bg-signal-black hover:border-signal-border-active transition-all text-sm font-medium text-center"
                >
                  View Legal Center
                </Link>
                <button
                  onClick={handleAccept}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-signal-amber text-black hover:bg-amber-400 transition-colors text-sm font-bold tracking-wide shadow-lg shadow-signal-amber/20"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
