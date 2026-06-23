"use client";

import React from 'react';
import { Info, Mail, Phone, MapPin, ShieldAlert, Cpu, Heart, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Page Header */}
      <div className="space-y-3.5 border-b border-zinc-900 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-amber-500" />
          <span>Network Manifesto</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
          About ACM TV
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl leading-relaxed font-medium">
          A premium, real-time virtual television network built to unify the video viewing experience on a global scale.
        </p>
      </div>

      {/* Grid: Concept and Technology */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Core Concept */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl w-fit">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            The Virtual Channel Concept
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            ACM TV is not a traditional on-demand streaming gallery. We believe in the shared magic of broadcast television—the feeling of knowing that thousands of viewers are watching the exact same climax, singing the same chorus, or laughing at the same joke at the exact same moment. 
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            By mapping video durations to a deterministic global clock, we recreate the authentic live TV experience in a browser-native format, requiring zero expensive stream transcoders or server-side media processors.
          </p>
        </div>

        {/* Global Sync Technology */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl w-fit">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            UTC Synchronization Engine
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            To coordinate playback worldwide, we synchronize the schedule calculation against a static reference point in Coordinated Universal Time (UTC). 
          </p>
          <div className="space-y-2 pt-2 text-xs font-mono bg-black/40 border border-zinc-900 rounded-xl p-4 text-zinc-400 leading-relaxed">
            <p><span className="text-amber-500">Epoch:</span> 2026-01-01T00:00:00Z</p>
            <p><span className="text-amber-500">Time Diff:</span> UTC Now - Epoch</p>
            <p><span className="text-amber-500">Location:</span> Time Diff % Total Duration</p>
            <p><span className="text-amber-500">Auto Seek:</span> player.seekTo(Location)</p>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pt-1">
            This math ensures that regardless of timezones, drift from tab inactivity, or latency spikes, the player immediately realigns to the network clock.
          </p>
        </div>

      </div>

      {/* Network Guidelines Checklist */}
      <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <h3 className="text-xl font-black text-white tracking-tight">
          ACM Network Compliance Features
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            "Autoplay compliance via initial muted playback",
            "Emergency standby fallbacks in case of media outage",
            "Automatic frame-resynchronization within 1 second",
            "Multi-provider conversion for Google Drive/MP4 links",
            "Automatic brand ident and promo schedule weaving",
            "Fully deterministic schedule loops on local clocks"
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-zinc-300">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="border-t border-zinc-900 pt-8 space-y-6">
        <h3 className="text-xl font-black text-white tracking-tight">
          Get in Touch
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-xl font-medium">
          Interested in distributing content on ACM Networks, requesting advertising slots, or submitting custom network idents? Feel free to contact our broadcast operations desk.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-2">
            <Mail className="w-5 h-5 text-amber-500" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Email Broadcast Desk</h4>
            <span className="text-xs text-zinc-400 block break-all font-semibold select-all">broadcast@acmtv.network</span>
          </div>

          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-2">
            <Phone className="w-5 h-5 text-amber-500" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Call Operations Desk</h4>
            <span className="text-xs text-zinc-400 block font-semibold">+1 (800) 555-ACMTV</span>
          </div>

          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-2">
            <MapPin className="w-5 h-5 text-amber-500" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Network Address</h4>
            <span className="text-xs text-zinc-400 block leading-relaxed font-semibold">Realm Plaza, Los Angeles, CA</span>
          </div>
        </div>
      </section>

    </div>
  );
}
