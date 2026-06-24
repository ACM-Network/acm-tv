"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Tv, Clock, Radio, Info } from 'lucide-react';
import { getRuntimeChannels } from '@/utils/scheduleEngine';
import { Channel } from '@/types';
import TimelineGuide from '@/components/TimelineGuide';

function ScheduleClientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const channels: Channel[] = getRuntimeChannels();
  
  // Find current channel based on search params, default to acm-tv
  const channelIdParam = searchParams.get('channel') || 'acm-tv';
  const initialChannel = channels.find(c => c.id === channelIdParam) || channels[0];
  
  const activeChannel = channels.find(c => c.id === (searchParams.get('channel') || 'acm-tv')) || channels[0];

  const handleChannelSwitch = (channelId: string) => {
    router.push(`/schedule?channel=${channelId}`);
  };

  // Color classes for active state
  const textColors: { [key: string]: string } = {
    'acm-tv': 'text-amber-500',
    'acm-movies': 'text-blue-500',
    'acm-music': 'text-pink-500',
    'acm-trailers': 'text-emerald-500',
    'acm-rcu': 'text-orange-500',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="space-y-3.5 border-b border-zinc-900 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>Daily Tuner Guide</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
          TV Broadcast Schedule
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl leading-relaxed font-medium">
          Browse the global 24-hour synchronized feed timetable. Times are automatically adjusted to match your local timezone system clock.
        </p>
      </div>

      {/* Channel Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {channels.map((ch) => {
          const isActive = activeChannel.id === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => handleChannelSwitch(ch.id)}
              className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                isActive
                  ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/[0.02]'
                  : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700/80'
              }`}
            >
              <span className={`text-xs font-black uppercase tracking-wider block ${isActive ? textColors[ch.id] || 'text-amber-500' : 'text-zinc-300'}`}>
                {ch.name}
              </span>
              <span className="text-[9px] text-zinc-500 font-medium mt-1 uppercase block truncate max-w-full">
                {ch.tagline}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline guide */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white leading-tight">
              {activeChannel.name} Timetable
            </h3>
            <p className="text-xs text-zinc-500 font-semibold">{activeChannel.tagline}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>24h Loop Format</span>
          </div>
        </div>

        <TimelineGuide channel={activeChannel} />
      </div>

    </div>
  );
}

// Suspense wrapper to handle useSearchParams client-side de-optimization in Next.js App Router
export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/25 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    }>
      <ScheduleClientContent />
    </Suspense>
  );
}
