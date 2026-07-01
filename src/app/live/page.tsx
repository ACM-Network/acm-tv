"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tv, Info, ExternalLink } from 'lucide-react';
import { getRuntimeChannels, getBroadcastState } from '@/utils/scheduleEngine';
import { Channel, BroadcastState } from '@/types';
import TVPlayer from '@/components/TVPlayer';
import ProgramGuide from '@/components/ProgramGuide';
import ChannelSwitcher from '@/components/ChannelSwitcher';

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
    <div className="w-full mx-auto max-w-[1920px] md:px-6 lg:px-8 md:py-8 bg-[#0a0a0a] min-h-screen selection:bg-red-500/30">
      
      {/* Main Live Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-6 items-start w-full">
        
        {/* Left 2 Columns: Video Player & Metadata Pane */}
        <div className="lg:col-span-2 flex flex-col">
          
          {/* Player Shell (Edge-to-edge on mobile) */}
          <div className="w-full z-10 sticky top-0 md:static md:bg-black md:border md:border-white/10 md:rounded-2xl md:p-1 md:shadow-2xl overflow-hidden">
            <TVPlayer 
              key={activeChannel.id}
              channel={activeChannel} 
              onStateChange={handleStateChange} 
            />
          </div>

          {/* Telemetry Data Pane */}
          {isStateMatching && broadcastState?.currentProgram && (
            <div className="bg-white/5 backdrop-blur-xl border-y md:border border-white/10 md:rounded-2xl p-5 md:p-8 mt-0 md:mt-6 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-transparent to-transparent opacity-50" />
              
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-white/10 pb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {activeChannel.channelNumber && (
                      <span className="px-2 py-1 bg-black/40 backdrop-blur-md rounded-md border border-white/10 text-[11px] font-medium text-white/70 tracking-wider">
                        CH {activeChannel.channelNumber}
                      </span>
                    )}
                    <span className="px-2 py-1 text-[11px] font-bold uppercase tracking-widest bg-red-600/20 backdrop-blur-md rounded-md border border-red-500/30 text-red-100">
                      {activeChannel.name}
                    </span>
                    {(activeChannel.category || broadcastState.currentProgram.program.category) && (
                      <span className="text-[11px] text-white/50 font-medium uppercase tracking-widest">
                        {activeChannel.category || broadcastState.currentProgram.program.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                    {broadcastState.currentProgram.program.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-xs font-medium text-white/80 shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {broadcastState.currentProgram.startTimeFormatted} - {broadcastState.currentProgram.endTimeFormatted}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 group">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    Original Stream Source
                  </span>
                  <a 
                    href={broadcastState.currentProgram.subProgram?.videoUrl || broadcastState.currentProgram.program.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate max-w-[200px] sm:max-w-[300px]">
                      {broadcastState.currentProgram.subProgram?.videoUrl || broadcastState.currentProgram.program.videoUrl}
                    </span>
                  </a>
                </div>

                <p className="text-base sm:text-lg text-white/70 leading-relaxed font-light">
                  {broadcastState.currentProgram.program.description || activeChannel.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column / Bottom on Mobile: EPG Panel & Channel Router */}
        <div className="lg:col-span-1 flex flex-col gap-4 p-4 md:p-0">
          {/* Channel Routing Selector */}
          <ChannelSwitcher channels={channels} activeChannelId={activeChannel.id} />

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl min-h-[400px] md:min-h-[600px]">
            <ProgramGuide broadcastState={isStateMatching ? broadcastState : null} />
          </div>
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
