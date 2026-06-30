"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Clock } from 'lucide-react';
import { getRuntimeChannels } from '@/utils/scheduleEngine';
import { Channel } from '@/types';
import EPG from '@/components/EPG';

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

      {/* Full Electronic Program Guide */}
      <div className="mt-8">
        <EPG channels={channels} />
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
