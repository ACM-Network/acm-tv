"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Clock } from 'lucide-react';
import { getRuntimeChannels } from '@/utils/scheduleEngine';
import { Channel } from '@/types';
import TimelineGuide from '@/components/TimelineGuide';

function ScheduleClientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const channels: Channel[] = getRuntimeChannels();
  
  const activeChannel = channels.find(c => c.id === (searchParams.get('channel') || 'acm-tv')) || channels[0];

  const handleChannelSwitch = (channelId: string) => {
    router.push(`/schedule?channel=${channelId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-signal-black min-h-screen">
      
      {/* Header Pane */}
      <div className="space-y-4 border-b border-signal-border pb-4">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-signal-surface border border-signal-border text-signal-text-secondary font-mono text-[10px] uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5 text-signal-amber" />
          <span>TIMETABLE MATRIX</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-signal-text-primary tracking-tight">
          System Broadcast Schedule
        </h1>
        <p className="text-sm text-signal-text-tertiary max-w-xl font-mono">
          Global 24-hour cycle matrix. Displaying sequential payload execution for selected routing nodes. Auto-adjusted to client local timezone.
        </p>
      </div>

      {/* Channel Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {channels.map((ch) => {
          const isActive = activeChannel.id === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => handleChannelSwitch(ch.id)}
              className={`flex flex-col items-center text-center p-2 rounded-sm border transition-all ${
                isActive
                  ? 'border-signal-border-active bg-signal-amber-dim text-signal-amber'
                  : 'bg-signal-surface border-signal-border hover:bg-signal-surface-raised hover:border-signal-border-active text-signal-text-secondary'
              }`}
            >
              <span className={`text-[10px] font-mono uppercase tracking-wider block ${isActive ? 'text-signal-amber font-bold' : 'text-signal-text-secondary'}`}>
                {ch.name}
              </span>
              <span className="text-[8px] text-signal-text-tertiary font-mono mt-1 uppercase block truncate max-w-full">
                {ch.tagline}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline Panel */}
      <div className="bg-signal-surface border border-signal-border rounded-md p-6">
        <div className="flex items-center justify-between border-b border-signal-border pb-3 mb-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-signal-text-primary uppercase tracking-wide">
              TX_NODE: {activeChannel.name}
            </h3>
            <p className="text-[10px] text-signal-text-tertiary font-mono uppercase">{activeChannel.tagline}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-signal-text-secondary font-mono bg-signal-black border border-signal-border px-2 py-1 rounded-sm">
            <Clock className="w-3.5 h-3.5 text-signal-amber" />
            <span>CYL: 24H_LOOP</span>
          </div>
        </div>

        <TimelineGuide channel={activeChannel} />
      </div>

    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-signal-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-signal-border-active border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    }>
      <ScheduleClientContent />
    </Suspense>
  );
}
