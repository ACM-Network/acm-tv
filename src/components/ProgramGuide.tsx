"use client";

import React from 'react';
import { Radio } from 'lucide-react';
import { BroadcastState } from '../types';
import NextProgramCard from './NextProgramCard';

interface ProgramGuideProps {
  broadcastState: BroadcastState | null;
}

export default function ProgramGuide({ broadcastState }: ProgramGuideProps) {
  if (!broadcastState) {
    return (
      <div className="bg-signal-surface border border-signal-border rounded-md p-8 flex items-center justify-center text-signal-text-secondary">
        <div className="w-6 h-6 border-2 border-signal-border border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    );
  }

  const { currentProgram, upNext, laterTonight, playbackPosition } = broadcastState;
  const currentProgramDef = currentProgram.program;

  // Convert seconds to readable MM:SS or HH:MM:SS
  const formatSeconds = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rs = s % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
    }
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (playbackPosition / currentProgramDef.duration) * 100;

  return (
    <div className="space-y-4 lg:h-full lg:flex lg:flex-col">
      {/* Tab Header (Informational) */}
      <div className="flex items-center justify-between border-b border-signal-border pb-2 flex-shrink-0">
        <h3 className="text-sm font-bold text-signal-text-primary tracking-tight flex items-center gap-2">
          <Radio className="w-4 h-4 text-signal-red animate-pulse-live" />
          <span>BROADCAST DESK</span>
        </h3>
        <span className="text-xs text-signal-text-secondary font-mono uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-sm bg-signal-red animate-pulse-live"></span>
          Feed Active
        </span>
      </div>

      {/* NOW PLAYING Section */}
      <div className="bg-signal-surface border border-signal-border rounded-md p-4 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-signal-amber tracking-widest uppercase font-mono">
            NOW PLAYING
          </span>
          <span className="px-1.5 py-0.5 rounded-sm bg-signal-black border border-signal-border text-[9px] font-bold text-signal-text-secondary uppercase">
            {currentProgramDef.type}
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="text-base font-bold text-signal-text-primary leading-tight">
            {currentProgramDef.title}
          </h4>
          <span className="inline-block text-xs font-semibold text-signal-text-secondary bg-signal-black border border-signal-border px-2 py-0.5 rounded-sm">
            {currentProgramDef.category}
          </span>
          <p className="text-xs text-signal-text-secondary leading-relaxed pt-1 line-clamp-2">
            {currentProgramDef.description}
          </p>
        </div>

        {/* Runtime info */}
        <div className="space-y-1 pt-2 border-t border-signal-border">
          <div className="flex justify-between items-center text-xs font-mono text-signal-text-tertiary">
            <span>{formatSeconds(playbackPosition)}</span>
            <span>{formatSeconds(currentProgramDef.duration)}</span>
          </div>
          <div className="w-full h-1 bg-signal-black border border-signal-border rounded-sm overflow-hidden">
            <div 
              className="h-full bg-signal-amber transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* UP NEXT Section */}
      <div className="flex-shrink-0 space-y-1">
        <span className="text-[10px] font-bold text-signal-text-secondary tracking-widest uppercase block px-1 font-mono">
          UP NEXT
        </span>
        <NextProgramCard upNext={upNext} />
      </div>

      {/* LATER TONIGHT Section */}
      <div className="space-y-2 flex-1 flex flex-col min-h-0">
        <span className="text-[10px] font-bold text-signal-text-secondary tracking-widest uppercase block px-1 flex-shrink-0 font-mono">
          LATER TONIGHT
        </span>
        
        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[350px] lg:max-h-none custom-scrollbar">
          {laterTonight.map((item) => {
            return (
              <div 
                key={item.instanceId}
                className="flex items-center gap-3 p-2 rounded-md bg-signal-surface border border-signal-border hover:bg-signal-surface-hover hover:border-signal-border-active transition-colors"
              >
                {/* Small thumbnail */}
                <div className="relative w-16 aspect-video bg-signal-black rounded-sm overflow-hidden flex-shrink-0 border border-signal-border">
                  <img 
                    src={item.program.thumbnail || "/branding/acm-tv-bug.svg"} 
                    alt={item.program.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-signal-text-tertiary bg-signal-black/80 px-1 rounded-sm">
                    {Math.round(item.program.duration / 60)}m
                  </span>
                </div>

                {/* Show Title */}
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-signal-text-primary truncate leading-snug">
                    {item.program.title}
                  </h5>
                  <div className="flex items-center gap-2 mt-0.5 font-mono">
                    <span className="text-[9px] text-signal-text-secondary font-semibold truncate uppercase">
                      {item.program.category}
                    </span>
                    <span className="w-1 h-1 rounded-sm bg-signal-border"></span>
                    <span className="text-[9px] font-bold text-signal-amber">
                      {item.startTimeFormatted}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
