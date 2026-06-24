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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center animate-pulse text-zinc-400">
        Syncing live broadcast feed...
      </div>
    );
  }

  const { program, startTimeFormatted, endTimeFormatted } = currentProgram;

  if (compact) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="relative h-12 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-black border border-zinc-800">
            <img 
              src={program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=200"} 
              alt={program.title}
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent"></div>
            <span className="absolute bottom-1 right-1 text-[8px] font-mono text-zinc-300">LIVE</span>
          </div>
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
              On Air Now
            </span>
            <h4 className="text-sm font-bold text-white truncate">{program.title}</h4>
            <p className="text-xs text-zinc-400 font-medium">{startTimeFormatted} - {endTimeFormatted}</p>
          </div>
        </div>
        <Link 
          href="/live" 
          className="ml-4 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all flex items-center gap-1 flex-shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>TUNE IN</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 shadow-2xl transition-all duration-300 hover:border-zinc-700/80 hover:shadow-amber-500/[0.02]">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] group-hover:bg-amber-500/15 transition-all"></div>

      {/* Program Thumbnail */}
      <div className="relative w-full md:w-80 aspect-video md:aspect-[16/10] rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 flex-shrink-0">
        <img 
          src={program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400"} 
          alt={program.title}
          className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
        
        {/* Badges on Thumbnail */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600 border border-red-500/40 text-[9px] font-black text-white tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            LIVE
          </span>
          <span className="px-2 py-0.5 rounded bg-black/60 border border-zinc-800 text-[9px] font-bold text-zinc-300 uppercase">
            {program.type}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 text-xs font-mono font-bold text-white bg-black/80 border border-zinc-800 px-2 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{Math.round(program.duration / 60)} min</span>
        </div>
      </div>

      {/* Program Info */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 tracking-wider uppercase">
              {channel.name} Exclusive
            </span>
            <span className="text-xs text-zinc-500 font-semibold">{program.category}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            {program.title}
          </h3>

          <p className="text-sm text-zinc-400 font-medium leading-relaxed line-clamp-3">
            {program.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-zinc-400 bg-black/30 border border-zinc-900 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-amber-500" />
              <span>Broadcast Start: <strong className="text-zinc-200">{startTimeFormatted}</strong></span>
            </div>
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Concludes: <strong className="text-zinc-200">{endTimeFormatted}</strong></span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-900 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            Current Schedule Block: <strong className="text-zinc-400">Continuous 24h Loop</strong>
          </div>
          <Link 
            href="/live" 
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-sm transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>WATCH LIVE NOW</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
