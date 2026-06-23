"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, ShieldAlert } from 'lucide-react';
import { ProgramInstance } from '../types';

interface NextProgramCardProps {
  upNext: ProgramInstance | null;
}

export default function NextProgramCard({ upNext }: NextProgramCardProps) {
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!upNext) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diffMs = upNext.startTime - now;

      if (diffMs <= 0) {
        setCountdown('Starting now...');
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      let timeStr = '';
      if (hrs > 0) {
        timeStr += `${hrs}h ${mins}m`;
      } else if (mins > 0) {
        timeStr += `${mins}m ${secs.toString().padStart(2, '0')}s`;
      } else {
        timeStr += `${secs}s`;
      }

      setCountdown(`Starts in ${timeStr}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [upNext]);

  if (!upNext) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 text-center text-zinc-500 text-sm">
        No upcoming program scheduled.
      </div>
    );
  }

  const { program, startTimeFormatted } = upNext;

  return (
    <div className="group relative bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-5 hover:bg-zinc-900/60 hover:border-zinc-700/60 transition-all duration-300">
      <div className="flex justify-between items-start gap-4">
        {/* Title & Metadata */}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 text-[8px] font-black text-zinc-400 uppercase tracking-widest">
              {program.type}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold truncate">
              {program.category}
            </span>
          </div>

          <h4 className="text-base font-bold text-white leading-snug truncate group-hover:text-amber-500 transition-colors">
            {program.title}
          </h4>

          {/* Description */}
          <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2">
            {program.description}
          </p>
        </div>

        {/* Start Time Bumper Badge */}
        <div className="flex-shrink-0 text-right space-y-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{startTimeFormatted}</span>
          </span>
          <span className="block text-[10px] font-bold text-zinc-400 font-mono tracking-tight mt-1">
            {countdown}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
        <span className="font-mono">Est. Duration: {Math.round(program.duration / 60)} min</span>
        <span className="flex items-center gap-1 text-amber-500 font-bold group-hover:translate-x-1 transition-transform">
          <span>Schedule details</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
