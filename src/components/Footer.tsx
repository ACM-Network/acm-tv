import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Tv } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900/60 pt-16 pb-8 text-zinc-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Upper footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <div className="w-40">
              <img 
                src="/branding/acm-tv-logo.svg" 
                alt="ACM TV Logo" 
                className="w-full object-contain filter opacity-80"
              />
            </div>
            <p className="text-xs text-zinc-400 font-medium max-w-sm leading-relaxed">
              ACM TV is a global virtual television network delivering real-time cinematic content, trailer blocks, and media showcases in absolute sync to viewers worldwide.
            </p>
            <div className="text-xs text-amber-500/80 font-bold tracking-wider uppercase">
              &quot;Entertainment Without Limits&quot;
            </div>
          </div>

          {/* Network Expansion Links */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-black text-white tracking-widest uppercase">
              ACM NETWORKS
            </h4>
            <ul className="text-xs space-y-2.5 font-semibold">
              <li>
                <Link href="/live?channel=acm-tv" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-amber-500" />
                  <span>ACM TV (Live Feed)</span>
                </Link>
              </li>
              <li>
                <Link href="/live?channel=acm-movies" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-blue-500" />
                  <span>ACM Movies</span>
                </Link>
              </li>
              <li>
                <Link href="/live?channel=acm-music" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-pink-500" />
                  <span>ACM Music</span>
                </Link>
              </li>
              <li>
                <Link href="/live?channel=acm-trailers" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-emerald-500" />
                  <span>ACM Trailers</span>
                </Link>
              </li>
              <li>
                <Link href="/live?channel=acm-rcu" className="hover:text-amber-500 transition-colors flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-orange-500" />
                  <span>ACM RCU Promos</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-black text-white tracking-widest uppercase">
              NETWORK DESK
            </h4>
            <ul className="text-xs space-y-2.5 font-semibold leading-relaxed">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-zinc-600" />
                <span className="hover:text-zinc-300 cursor-pointer">broadcast@acmtv.network</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-zinc-600" />
                <span>+1 (800) 555-ACMTV</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-zinc-600 mt-0.5" />
                <span>Realm Plaza, Suite 404<br />Los Angeles, CA 90028</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Lower footer copyright */}
        <div className="pt-8 border-t border-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
          <div>
            © {new Date().getFullYear()} ACM TV Network. All Rights Reserved. Synchronized under UTC-0 Reference Feed.
          </div>
          <div className="flex gap-6 font-semibold">
            <span className="hover:text-zinc-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-zinc-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-300 cursor-pointer">FCC Public Files</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
