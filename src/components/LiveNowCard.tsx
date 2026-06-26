"use client";

import React from 'react';
import Link from 'next/link';
import { Play, Clock, Tv } from 'lucide-react';
import { Channel, ProgramInstance } from '../types';

interface LiveNowCardProps {
  channel: Channel;
  currentProgram: ProgramInstance | null;
  compact?: boolean;
}

export default function LiveNowCard({ channel, currentProgram, compact = false }: LiveNowCardProps) {
  if (!currentProgram) {
    return (
      <div className="bg-signal-surface border border-signal-border rounded-md p-8 flex items-center justify-center text-signal-text-secondary">
        <div className="w-6 h-6 border-2 border-signal-border border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    );
  }

  const { program, startTimeFormatted, endTimeFormatted } = currentProgram;

  if (compact) {
    return (
      <div className="bg-signal-surface border border-signal-border rounded-md p-3 flex items-center justify-between hover:bg-signal-surface-hover transition-colors">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative h-12 w-20 flex-shrink-0 rounded-sm overflow-hidden bg-signal-black border border-signal-border">
            <img 
              src={program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=200"} 
              alt={program.title}
              className="h-full w-full object-cover opacity-80"
            />
            <span className="absolute bottom-1 right-1 text-[8px] font-mono text-signal-text-tertiary">LIVE</span>
          </div>
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-signal-red uppercase tracking-widest mb-0.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-signal-red animate-pulse-live"></span>
              On Air Now
            </span>
            <h4 className="text-sm font-bold text-signal-text-primary truncate">{program.title}</h4>
            <p className="text-xs text-signal-text-tertiary font-mono">{startTimeFormatted} - {endTimeFormatted}</p>
          </div>
        </div>
        <Link 
          href="/live" 
          className="ml-4 px-3 py-1.5 rounded-sm bg-signal-amber-dim border border-signal-border-active text-signal-amber font-bold text-xs transition-colors flex items-center gap-1 flex-shrink-0 hover:bg-signal-surface-hover"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>TUNE IN</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-signal-surface border border-signal-border rounded-md p-4 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6 hover:border-signal-border-active transition-colors">
      {/* Program Thumbnail */}
      <div className="relative w-full md:w-64 aspect-video md:aspect-[16/10] rounded-sm overflow-hidden border border-signal-border bg-signal-black flex-shrink-0">
        <img 
          src={program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400"} 
          alt={program.title}
          className="w-full h-full object-cover opacity-75"
        />
        
        {/* Badges on Thumbnail */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-signal-red-dim border border-signal-red/40 text-[9px] font-bold text-signal-red tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-sm bg-signal-red animate-pulse-live"></span>
            LIVE
          </span>
          <span className="px-1.5 py-0.5 rounded-sm bg-signal-surface-raised border border-signal-border text-[9px] font-bold text-signal-text-secondary uppercase">
            {program.type}
          </span>
        </div>

        <div className="absolute bottom-2 right-2 text-xs font-mono font-bold text-signal-text-primary bg-signal-black/80 border border-signal-border px-1.5 py-0.5 rounded-sm flex items-center gap-1">
          <Clock className="w-3 h-3 text-signal-amber" />
          <span>{Math.round(program.duration / 60)} min</span>
        </div>
      </div>

      {/* Program Info */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-sm bg-signal-amber-dim border border-signal-border-active text-[10px] font-bold text-signal-amber tracking-wider uppercase">
              {channel.name}
            </span>
            <span className="text-xs text-signal-text-secondary font-semibold">{program.category}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-signal-text-primary tracking-tight leading-tight">
            {program.title}
          </h3>

          <p className="text-sm text-signal-text-secondary font-medium leading-relaxed line-clamp-2">
            {program.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-signal-text-tertiary bg-signal-black border border-signal-border rounded-sm p-2 mt-2">
            <div className="flex items-center gap-2">
              <Tv className="w-3 h-3 text-signal-amber" />
              <span>Start: <strong className="text-signal-text-primary">{startTimeFormatted}</strong></span>
            </div>
            <div className="flex items-center gap-2 border-l border-signal-border pl-4">
              <Clock className="w-3 h-3 text-signal-text-secondary" />
              <span>End: <strong className="text-signal-text-primary">{endTimeFormatted}</strong></span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-signal-border mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-signal-text-tertiary font-mono">
            Block: <strong className="text-signal-text-secondary">Continuous 24h Loop</strong>
          </div>
          <Link 
            href="/live" 
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm bg-signal-amber-dim border border-signal-border-active text-signal-amber font-bold text-xs transition-colors hover:bg-signal-surface-hover"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>WATCH LIVE NOW</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
