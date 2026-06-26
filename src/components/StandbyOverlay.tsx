"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Channel, ProgramInstance } from '../types';

interface StandbyOverlayProps {
  channel: Channel;
  currentProgram: ProgramInstance | null;
  upNext: ProgramInstance | null;
  onRetry: () => void;
  isRetrying: boolean;
}

export default function StandbyOverlay({
  channel,
  currentProgram,
  upNext,
  onRetry,
  isRetrying
}: StandbyOverlayProps) {
  const isOffAir = !currentProgram?.program.videoUrl;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`absolute inset-0 z-40 bg-signal-black flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Broadcast Style Color Bars (Stylized Background) */}
      <div className="absolute inset-0 opacity-15 grid grid-cols-7 h-full w-full pointer-events-none">
        <div className="bg-white"></div>
        <div className="bg-yellow-400"></div>
        <div className="bg-cyan-400"></div>
        <div className="bg-green-500"></div>
        <div className="bg-magenta-500"></div>
        <div className="bg-red-600"></div>
        <div className="bg-blue-600"></div>
      </div>
      
      {/* Static Noise Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-signal-surface via-signal-black to-black bg-[size:3px_3px]"></div>

      {/* Main Panel */}
      <div className={`relative z-10 max-w-md w-full mx-4 p-6 rounded-md bg-signal-surface-raised border border-signal-border shadow-2xl text-center transform transition-all duration-300 ${mounted ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Channel Bug/Logo */}
        <div className="flex justify-center mb-4">
          <img 
            src={channel.logoUrl || "/branding/acm-tv-logo.svg"} 
            alt={channel.name} 
            className="h-10 object-contain"
          />
        </div>

        {/* Offline / Standby Badge */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-signal-red-dim border border-signal-red/30 text-signal-red mb-4">
          <div className="w-1.5 h-1.5 rounded-sm bg-signal-red animate-pulse-live" />
          <span className="text-[10px] font-bold font-mono tracking-widest uppercase">
            {isOffAir ? "STANDBY" : "OFFLINE"}
          </span>
        </div>

        <h3 className="text-lg font-bold text-signal-text-primary tracking-tight mb-2">
          {isOffAir ? "CHANNEL STANDBY" : "BROADCAST INTERRUPTED"}
        </h3>
        
        <p className="text-xs text-signal-text-secondary leading-relaxed mb-6 font-mono">
          {isOffAir 
            ? "Transmission will resume shortly."
            : "Attempting to re-establish connection."
          }
        </p>

        {/* Current / Next Program Metadata */}
        <div className="bg-signal-black border border-signal-border rounded-sm p-3 mb-6 text-left space-y-2 font-mono">
          {currentProgram && (
            <div>
              <span className="text-[10px] font-bold text-signal-amber tracking-wider uppercase block">Scheduled Now</span>
              <span className="text-xs font-semibold text-signal-text-primary block truncate">{currentProgram.program.title}</span>
            </div>
          )}
          {upNext && !isOffAir && (
            <div className="border-t border-signal-border pt-2 mt-2">
              <span className="text-[10px] font-bold text-signal-text-secondary tracking-wider uppercase block">Up Next</span>
              <span className="text-xs text-signal-text-secondary block truncate">
                {upNext.program.title} <span className="text-signal-text-tertiary">({upNext.startTimeFormatted})</span>
              </span>
            </div>
          )}
        </div>

        {/* Retry Button */}
        {!isOffAir && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm bg-signal-amber-dim border border-signal-border-active text-signal-amber font-bold text-xs font-mono transition-colors hover:bg-signal-surface-hover disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'RECONNECTING...' : 'RETRY CONNECTION'}
          </button>
        )}
      </div>

      {/* Decorative corners */}
      <div className="absolute top-8 left-8 border-t-2 border-l-2 border-signal-border-active w-4 h-4 pointer-events-none"></div>
      <div className="absolute top-8 right-8 border-t-2 border-r-2 border-signal-border-active w-4 h-4 pointer-events-none"></div>
      <div className="absolute bottom-8 left-8 border-b-2 border-l-2 border-signal-border-active w-4 h-4 pointer-events-none"></div>
      <div className="absolute bottom-8 right-8 border-b-2 border-r-2 border-signal-border-active w-4 h-4 pointer-events-none"></div>
    </div>
  );
}
