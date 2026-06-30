'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tv, Menu, X } from 'lucide-react';
import GlobalSearch from './GlobalSearch';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/live', label: 'Live TV' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/programs', label: 'Programs' },
  { href: '/about', label: 'About' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Hide navigation on /live page entirely for immersive experience
  if (pathname === '/live') return null;

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled 
          ? 'bg-signal-surface/90 backdrop-blur-md border-signal-border shadow-lg shadow-black/20' 
          : 'bg-signal-black border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-sm bg-signal-surface-raised border border-signal-border group-hover:border-signal-amber transition-colors">
              <Tv className="w-4 h-4 text-signal-amber" />
              <div className="absolute inset-0 bg-signal-amber-glow opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
            </div>
            <span className="text-[15px] font-bold tracking-wide text-signal-text-primary">
              ACM<span className="text-signal-amber ml-0.5">TV</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'text-signal-text-primary bg-signal-surface-raised border-b-2 border-signal-amber'
                      : 'text-signal-text-secondary hover:text-signal-text-primary hover:bg-signal-surface'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <GlobalSearch />

            {/* Live indicator */}
            <div className="hidden md:flex items-center gap-3">
            <Link
              href="/live"
              className="group flex items-center gap-2 px-4 py-2 rounded-sm bg-signal-surface hover:bg-signal-surface-hover border border-signal-border transition-all"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse-live" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-signal-text-primary group-hover:text-signal-amber transition-colors">
                Watch Live
              </span>
            </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-sm bg-signal-surface border border-signal-border hover:bg-signal-surface-hover transition-colors text-signal-text-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu - Slide down with CSS */}
      <div 
        id="mobile-nav-menu"
        aria-hidden={!mobileMenuOpen}
        className={`md:hidden absolute top-16 left-0 right-0 bg-signal-surface border-b border-signal-border overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <div className="px-4 py-4 space-y-2">
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-colors border-l-2 ${
                  isActive
                    ? 'text-signal-amber bg-signal-surface-raised border-signal-amber'
                    : 'text-signal-text-secondary hover:text-signal-text-primary hover:bg-signal-surface-hover border-transparent'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          
          <div className="pt-2 mt-2 border-t border-signal-border">
            <Link
              href="/live"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-sm bg-signal-surface-raised border border-signal-border"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse-live" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-signal-text-primary">
                Watch Live feed
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
