"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tv, Info, ExternalLink } from 'lucide-react';
import { getRuntimeChannels, getBroadcastState } from '@/utils/scheduleEngine';
import { Channel, BroadcastState } from '@/types';
import TVPlayer from '@/components/TVPlayer';
import ProgramGuide from '@/components/ProgramGuide';

const getUnixTimeMs = () => Date.now();

function LiveTVClientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const channels: Channel[] = getRuntimeChannels();
  
  const activeChannel = channels.find(c => c.id === (searchParams.get('channel') || 'acm-tv')) || channels[0];
  const [broadcastState, setBroadcastState] = useState<BroadcastState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBroadcastState(getBroadcastState(activeChannel, getUnixTimeMs()));
    }, 0);
    return () => clearTimeout(timer);
  }, [activeChannel]);

  const handleChannelSwitch = (channelId: string) => {
    router.push(`/live?channel=${channelId}`);
  };

  const handleStateChange = (state: BroadcastState) => {
    if (state.channelId === activeChannel.id) {
      setBroadcastState(state);
    }
  };

  const isStateMatching = broadcastState && broadcastState.channelId === activeChannel.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-signal-black min-h-screen">
      
      {/* 1. Channel Routing Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-signal-border pb-4">
        <span className="text-xs font-mono text-signal-text-tertiary uppercase tracking-widest mr-2 flex items-center gap-2">
          <Tv className="w-4 h-4 text-signal-amber" />
          <span>ROUTER:</span>
        </span>
        {channels.map((ch) => {
          const isActive = activeChannel.id === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => handleChannelSwitch(ch.id)}
              className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-all border ${
                isActive
                  ? 'bg-signal-amber-dim border-signal-border-active text-signal-amber'
                  : 'bg-signal-surface text-signal-text-secondary border-signal-border hover:text-signal-text-primary hover:border-signal-border-active'
              }`}
            >
              {ch.name}
            </button>
          );
        })}
      </div>

      {/* 2. Main Live Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Columns: Video Player & Metadata Pane */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Player Shell */}
          <div className="bg-signal-surface border border-signal-border rounded-md p-2">
            <TVPlayer 
              key={activeChannel.id}
              channel={activeChannel} 
              onStateChange={handleStateChange} 
            />
          </div>

          {/* Telemetry Data Pane */}
          {isStateMatching && broadcastState?.currentProgram && (
            <div className="bg-signal-surface border border-signal-border rounded-md p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-signal-border pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {activeChannel.channelNumber && (
                      <span className="px-1.5 py-0.5 bg-signal-black border border-signal-border text-[10px] font-mono text-signal-text-secondary">
                        CH {activeChannel.channelNumber}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-signal-amber-dim border border-signal-border text-signal-amber">
                      {activeChannel.name}
                    </span>
                    {(activeChannel.category || broadcastState.currentProgram.program.category) && (
                      <span className="text-[10px] text-signal-text-tertiary font-mono uppercase tracking-wide">
                        {activeChannel.category || broadcastState.currentProgram.program.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-signal-text-primary tracking-tight">
                    {broadcastState.currentProgram.program.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-signal-black border border-signal-border text-xs font-mono text-signal-text-secondary">
                    UTC {broadcastState.currentProgram.startTimeFormatted} - {broadcastState.currentProgram.endTimeFormatted}
                  </span>
                </div>
              </div>

              <p className="text-sm text-signal-text-secondary leading-relaxed font-mono">
                {broadcastState.currentProgram.program.description || activeChannel.description}
              </p>

              {/* Feed Details */}
              <div className="pt-4 flex flex-wrap gap-6 items-center justify-between text-xs text-signal-text-tertiary">
                <div className="flex items-center gap-2 font-mono">
                  <Info className="w-4 h-4 text-signal-text-tertiary" />
                  <span>RES: 1080p | FPS: 60 | CODEC: H.264</span>
                </div>
                
                <div className="flex gap-4 font-mono text-signal-text-secondary">
                  <a 
                    href={broadcastState.currentProgram.program.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-signal-amber transition-colors flex items-center gap-1"
                  >
                    <span>SOURCE_URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: EPG Panel */}
        <div className="lg:col-span-1 bg-signal-surface border border-signal-border rounded-md p-4 h-full min-h-[600px]">
          <ProgramGuide broadcastState={isStateMatching ? broadcastState : null} />
        </div>

      </div>

    </div>
  );
}

export default function LiveTVPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-signal-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-signal-border-active border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    }>
      <LiveTVClientContent />
    </Suspense>
  );
}
