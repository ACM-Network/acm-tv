"use client";

import React from 'react';
import { CalendarDays, Clock, Play, Radio, Volume2 } from 'lucide-react';
import { BroadcastState, ProgramInstance } from '../types';
import NextProgramCard from './NextProgramCard';

interface ProgramGuideProps {
  broadcastState: BroadcastState | null;
}

export default function ProgramGuide({ broadcastState }: ProgramGuideProps) {
  if (!broadcastState) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center animate-pulse text-zinc-400">
        Loading program guide metadata...
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
    <div className="space-y-6 lg:h-full lg:flex lg:flex-col">
      {/* Tab Header (Informational) */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-shrink-0">
        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          <span>BROADCAST DESK</span>
        </h3>
        <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Feed Active
        </span>
      </div>

      {/* NOW PLAYING Section */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase">
            NOW PLAYING
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-bold text-zinc-300 uppercase">
            {currentProgramDef.type}
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-lg font-black text-white leading-tight">
            {currentProgramDef.title}
          </h4>
          <span className="inline-block text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-2.5 py-1 rounded">
            {currentProgramDef.category}
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed pt-1">
            {currentProgramDef.description}
          </p>
        </div>

        {/* Runtime info */}
        <div className="space-y-2 pt-2 border-t border-zinc-900">
          <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
            <span>{formatSeconds(playbackPosition)}</span>
            <span>{formatSeconds(currentProgramDef.duration)}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* UP NEXT Section */}
      <div className="flex-shrink-0 space-y-2">
        <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase block px-1">
          UP NEXT
        </span>
        <NextProgramCard upNext={upNext} />
      </div>

      {/* LATER TONIGHT Section */}
      <div className="space-y-3 flex-1 flex flex-col min-h-0">
        <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase block px-1 flex-shrink-0">
          LATER TONIGHT
        </span>
        
        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[350px] lg:max-h-none scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {laterTonight.map((item, index) => {
            return (
              <div 
                key={item.instanceId}
                className="flex items-center gap-3.5 p-3 rounded-xl bg-zinc-900/20 border border-zinc-900/60 hover:bg-zinc-900/40 hover:border-zinc-800/80 transition-all duration-200"
              >
                {/* Small thumbnail */}
                <div className="relative w-16 aspect-video bg-zinc-950 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-900">
                  <img 
                    src={item.program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=200"} 
                    alt={item.program.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-zinc-400">
                    {Math.round(item.program.duration / 60)}m
                  </span>
                </div>

                {/* Show Title */}
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-zinc-200 truncate leading-snug group-hover:text-white">
                    {item.program.title}
                  </h5>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-zinc-500 font-semibold truncate">
                      {item.program.category}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                    <span className="text-[9px] font-bold text-amber-500/80">
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
