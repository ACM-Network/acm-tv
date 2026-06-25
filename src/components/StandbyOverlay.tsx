"use client";

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Channel, ProgramInstance } from '../types';
import { motion } from 'framer-motion';

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

  return (
    <div className="absolute inset-0 z-40 bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Broadcast Style Color Bars (Stylized Background) */}
      <div className="absolute inset-0 opacity-15 grid grid-cols-7 h-full w-full pointer-events-none">
        <div className="bg-white"></div>
        <div className="bg-yellow-400"></div>
        <div className="bg-cyan-400"></div>
        <div className="bg-green-500"></div>
        <div className="bg-magenta-500 bg-pink-500"></div>
        <div className="bg-red-600"></div>
        <div className="bg-blue-600"></div>
      </div>
      
      {/* Static Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-50 via-zinc-950 to-black bg-[size:3px_3px]"></div>

      {/* Main Glassmorphic Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-lg w-full mx-4 p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 shadow-2xl shadow-black/80 text-center"
      >
        {/* Channel Bug/Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src={channel.logoUrl || "/branding/acm-tv-logo.svg"} 
            alt={channel.name} 
            className="h-12 object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]"
          />
        </div>

        {/* Offline / Standby Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest uppercase">
            {isOffAir ? "CHANNEL STANDBY" : "TEMPORARILY OFFLINE"}
          </span>
        </div>

        <h3 className="text-xl font-black text-white tracking-tight mb-3">
          {isOffAir ? "CHANNEL STANDBY" : "BROADCAST TEMPORARILY OFFLINE"}
        </h3>
        
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6 px-4">
          {isOffAir 
            ? "This broadcast channel is currently off the air. Program transmission will resume shortly."
            : "We are experiencing a brief interruption in the stream. We will resume the broadcast shortly. Thank you for your patience."
          }
        </p>

        {/* Current / Next Program Metadata */}
        <div className="bg-black/40 border border-zinc-800/50 rounded-xl p-4 mb-6 text-left space-y-2">
          {currentProgram && (
            <div>
              <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase block">Scheduled Now</span>
              <span className="text-sm font-semibold text-zinc-200 block truncate">{currentProgram.program.title}</span>
            </div>
          )}
          {upNext && !isOffAir && (
            <div className="border-t border-zinc-900 pt-2 mt-2">
              <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase block">Up Next</span>
              <span className="text-xs text-zinc-400 block truncate">
                {upNext.program.title} <span className="text-amber-500/80">({upNext.startTimeFormatted})</span>
              </span>
            </div>
          )}
        </div>

        {/* Retry Button */}
        {!isOffAir && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'RECONNECTING...' : 'RETRY CONNECTION'}
          </button>
        )}
      </motion.div>

      {/* Decorative corners */}
      <div className="absolute top-8 left-8 border-t-2 border-l-2 border-zinc-800 w-6 h-6 pointer-events-none"></div>
      <div className="absolute top-8 right-8 border-t-2 border-r-2 border-zinc-800 w-6 h-6 pointer-events-none"></div>
      <div className="absolute bottom-8 left-8 border-b-2 border-l-2 border-zinc-800 w-6 h-6 pointer-events-none"></div>
      <div className="absolute bottom-8 right-8 border-b-2 border-r-2 border-zinc-800 w-6 h-6 pointer-events-none"></div>
    </div>
  );
}
