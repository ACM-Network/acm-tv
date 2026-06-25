"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tv, Info, ExternalLink } from 'lucide-react';
import { getRuntimeChannels } from '@/utils/scheduleEngine';
import { Channel, BroadcastState } from '@/types';
import TVPlayer from '@/components/TVPlayer';
import ProgramGuide from '@/components/ProgramGuide';

function LiveTVClientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const channels: Channel[] = getRuntimeChannels();
  
  const activeChannel = channels.find(c => c.id === (searchParams.get('channel') || 'acm-tv')) || channels[0];
  const [broadcastState, setBroadcastState] = useState<BroadcastState | null>(null);

  const handleChannelSwitch = (channelId: string) => {
    router.push(`/live?channel=${channelId}`);
  };

  const handleStateChange = (state: BroadcastState) => {
    setBroadcastState(state);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Channel Selector Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-900 pb-5">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2 flex items-center gap-1">
          <Tv className="w-3.5 h-3.5" />
          <span>Tuner:</span>
        </span>
        {channels.map((ch) => {
          const isActive = activeChannel.id === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => handleChannelSwitch(ch.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                isActive
                  ? ''
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-900'
              }`}
              style={isActive ? {
                borderColor: ch.themeColor || '#f59e0b',
                color: ch.themeColor || '#f59e0b',
                backgroundColor: ch.themeColor ? `${ch.themeColor}10` : 'rgba(245, 158, 11, 0.05)'
              } : undefined}
            >
              {ch.name}
            </button>
          );
        })}
      </div>

      {/* 2. Main Live Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Columns: Video Player & Description */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TV Player */}
          <TVPlayer 
            channel={activeChannel} 
            onStateChange={handleStateChange} 
          />

          {/* Current Program Details */}
          {broadcastState?.currentProgram && (
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 animate-fade-in">
                    {activeChannel.channelNumber && (
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-400">
                        Ch {activeChannel.channelNumber}
                      </span>
                    )}
                    <span 
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: activeChannel.themeColor ? `${activeChannel.themeColor}10` : 'rgba(245, 158, 11, 0.1)',
                        borderColor: activeChannel.themeColor ? `${activeChannel.themeColor}30` : 'rgba(245, 158, 11, 0.2)',
                        color: activeChannel.themeColor || '#f59e0b'
                      }}
                    >
                      {activeChannel.name}
                    </span>
                    {(activeChannel.category || broadcastState.currentProgram.program.category) && (
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wide">
                        {activeChannel.category || broadcastState.currentProgram.program.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    {broadcastState.currentProgram.program.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 font-mono">
                    UTC {broadcastState.currentProgram.startTimeFormatted} - {broadcastState.currentProgram.endTimeFormatted}
                  </span>
                </div>
              </div>

              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                {broadcastState.currentProgram.program.description || activeChannel.description}
              </p>

              {/* Feed Details & Share link */}
              <div className="pt-6 border-t border-zinc-900 flex flex-wrap gap-6 items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-2 font-mono">
                  <Info className="w-4 h-4 text-zinc-600" />
                  <span>Broadcast Quality: 1080p HD</span>
                </div>
                
                <div className="flex gap-4 font-bold text-zinc-400">
                  <a 
                    href={broadcastState.currentProgram.program.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-amber-500 transition-colors flex items-center gap-1"
                  >
                    <span>Direct Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Combined Program Guide */}
        <div className="lg:col-span-1 bg-zinc-950/20 border border-zinc-900 rounded-3xl p-6 shadow-2xl">
          <ProgramGuide broadcastState={broadcastState} />
        </div>

      </div>

    </div>
  );
}

// Suspense wrapper to handle useSearchParams client-side de-optimization in Next.js App Router
export default function LiveTVPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/25 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    }>
      <LiveTVClientContent />
    </Suspense>
  );
}
