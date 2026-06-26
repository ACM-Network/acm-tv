"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
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
      <div className="bg-signal-surface border border-signal-border rounded-md p-4 text-center text-signal-text-secondary text-sm font-mono">
        NO UPCOMING PROGRAM
      </div>
    );
  }

  const { program, startTimeFormatted } = upNext;

  return (
    <div className="group relative bg-signal-surface border border-signal-border rounded-md p-4 hover:bg-signal-surface-hover transition-colors">
      <div className="flex justify-between items-start gap-4">
        {/* Title & Metadata */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded-sm bg-signal-black border border-signal-border text-[10px] font-bold text-signal-text-secondary uppercase tracking-widest">
              {program.type}
            </span>
            <span className="text-[10px] text-signal-text-secondary font-semibold truncate uppercase">
              {program.category}
            </span>
          </div>

          <h4 className="text-sm font-bold text-signal-text-primary leading-snug truncate group-hover:text-signal-amber transition-colors">
            {program.title}
          </h4>

          {/* Description */}
          <p className="text-xs text-signal-text-secondary font-medium leading-relaxed line-clamp-1">
            {program.description}
          </p>
        </div>

        {/* Start Time Bumper Badge */}
        <div className="flex-shrink-0 text-right space-y-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-signal-amber-dim border border-signal-border-active text-xs font-mono font-bold text-signal-amber">
            <Clock className="w-3 h-3" />
            <span>{startTimeFormatted}</span>
          </span>
          <span className="block text-[10px] font-bold text-signal-text-tertiary font-mono tracking-tight mt-1">
            {countdown}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-signal-border flex items-center justify-between text-xs text-signal-text-secondary">
        <span className="font-mono">DUR: {Math.round(program.duration / 60)}M</span>
        <span className="flex items-center gap-1 text-signal-amber font-mono font-bold">
          <span>DETAILS</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
