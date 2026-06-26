"use client";

import React from 'react';
import { Info, Mail, Phone, MapPin, Cpu, Heart, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-signal-black min-h-screen">
      
      {/* Header */}
      <div className="space-y-4 border-b border-signal-border pb-4">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-signal-surface border border-signal-border text-signal-text-secondary font-mono text-[10px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-signal-amber" />
          <span>SYSTEM DOCS</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-signal-text-primary tracking-tight">
          ACM Network Architecture
        </h1>
        <p className="text-sm text-signal-text-tertiary max-w-xl font-mono">
          Technical specifications and concept manifest for the global deterministic broadcast platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Core Concept */}
        <div className="bg-signal-surface border border-signal-border rounded-md p-6 space-y-4">
          <div className="p-2 bg-signal-amber-dim border border-signal-border text-signal-amber rounded-sm w-fit">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-signal-text-primary uppercase tracking-wide">
            Shared Frame Paradigm
          </h3>
          <p className="text-xs text-signal-text-secondary font-mono leading-relaxed">
            Unlike conventional VOD buffering systems, ACM operates as a synchronized matrix. Viewers across geographic nodes receive the same video frame at identical milliseconds, recreating traditional transmission models without expensive backend transcoding arrays.
          </p>
        </div>

        {/* Global Sync Technology */}
        <div className="bg-signal-surface border border-signal-border rounded-md p-6 space-y-4">
          <div className="p-2 bg-signal-amber-dim border border-signal-border text-signal-amber rounded-sm w-fit">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-signal-text-primary uppercase tracking-wide">
            UTC Sync Engine
          </h3>
          <p className="text-xs text-signal-text-secondary font-mono leading-relaxed">
            Deterministic mapping is calculated locally using Coordinated Universal Time (UTC) as an immutable anchor.
          </p>
          <div className="space-y-1.5 text-[10px] font-mono bg-signal-black border border-signal-border rounded-sm p-3 text-signal-text-tertiary">
            <p><span className="text-signal-amber">CONST EPOCH =</span> "2026-01-01T00:00:00Z"</p>
            <p><span className="text-signal-amber">VAR delta =</span> CURRENT_UTC - EPOCH</p>
            <p><span className="text-signal-amber">VAR pos =</span> delta % LOOP_DUR</p>
            <p><span className="text-signal-amber">EXEC</span> player.seekTo(pos)</p>
          </div>
        </div>

      </div>

      {/* Network Guidelines Checklist */}
      <section className="bg-signal-surface border border-signal-border rounded-md p-6 space-y-5">
        <h3 className="text-lg font-bold text-signal-text-primary uppercase tracking-wide border-b border-signal-border pb-2">
          Compliance & Redundancy
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "Autoplay muting policies initialized",
            "Standby signals ready for TX failure",
            "Drift reconciliation < 1000ms",
            "Multi-source parser active (Drive/MP4)",
            "Automated ident interleaving",
            "Local deterministic looping verified"
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-signal-amber flex-shrink-0 mt-0.5" />
              <span className="text-[11px] font-mono text-signal-text-secondary">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-signal-surface border border-signal-border rounded-md p-6 space-y-5">
        <h3 className="text-lg font-bold text-signal-text-primary uppercase tracking-wide border-b border-signal-border pb-2">
          Control Center Link
        </h3>
        <p className="text-xs text-signal-text-tertiary font-mono">
          For payload injection requests or signal diagnostics, establish communication via designated ports.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-signal-black border border-signal-border rounded-sm p-4 space-y-1.5">
            <Mail className="w-4 h-4 text-signal-amber" />
            <h4 className="text-[10px] font-bold text-signal-text-secondary uppercase tracking-widest">COMMS_EMAIL</h4>
            <span className="text-[10px] text-signal-text-tertiary font-mono block break-all">broadcast@acmtv.network</span>
          </div>

          <div className="bg-signal-black border border-signal-border rounded-sm p-4 space-y-1.5">
            <Phone className="w-4 h-4 text-signal-amber" />
            <h4 className="text-[10px] font-bold text-signal-text-secondary uppercase tracking-widest">COMMS_VOICE</h4>
            <span className="text-[10px] text-signal-text-tertiary font-mono block">+1 (800) 555-ACMTV</span>
          </div>

          <div className="bg-signal-black border border-signal-border rounded-sm p-4 space-y-1.5">
            <MapPin className="w-4 h-4 text-signal-amber" />
            <h4 className="text-[10px] font-bold text-signal-text-secondary uppercase tracking-widest">PHYS_LOC</h4>
            <span className="text-[10px] text-signal-text-tertiary font-mono block">Realm Plaza, LA, CA</span>
          </div>
        </div>
      </section>

    </div>
  );
}
