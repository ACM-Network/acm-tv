"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Radio, Calendar, Activity, Sparkles } from 'lucide-react';
import { Channel, BroadcastState } from '@/types';
import { getBroadcastState, getRuntimeChannels } from '@/utils/scheduleEngine';
import LiveNowCard from '@/components/LiveNowCard';

const channels: Channel[] = getRuntimeChannels();
const flagshipChannel = channels.find(c => c.id === 'acm-tv') || channels[0];

export default function Home() {
  const [flagshipState, setFlagshipState] = useState<BroadcastState | null>(null);
  const [networkStates, setNetworkStates] = useState<{ [key: string]: BroadcastState }>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const updateAllStates = () => {
      const now = Date.now();
      
      try {
        const flagState = getBroadcastState(flagshipChannel, now);
        setFlagshipState(flagState);
      } catch (e) {
        console.error("Flagship state error:", e);
      }

      const states: { [key: string]: BroadcastState } = {};
      channels.forEach(ch => {
        try {
          states[ch.id] = getBroadcastState(ch, now);
        } catch {}
      });
      setNetworkStates(states);
    };

    setTimeout(() => {
      setIsMounted(true);
      updateAllStates();
    }, 0);

    const interval = setInterval(updateAllStates, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-signal-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-signal-border-active border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-12 bg-signal-black min-h-screen">
      
      {/* 1. Control Room Hero Billboard */}
      <section className="relative flex flex-col justify-end h-[60vh] min-h-[450px] border-b border-signal-border bg-signal-surface overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        <div className="absolute inset-0 bg-signal-black/80">
          <img 
            src="/media/artwork/spiderman_trailer_1.png" 
            alt="ACM Feed"
            className="w-full h-full object-cover opacity-20 object-center mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-signal-black via-signal-black/80 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full z-10 pb-12 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-signal-amber-dim border border-signal-border text-signal-amber text-xs font-mono uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Master Control Room</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-signal-text-primary leading-[1.1]">
            ACM TV<br />
            <span className="text-signal-text-secondary font-medium text-3xl sm:text-5xl">
              Global Sync Feed
            </span>
          </h1>

          <p className="text-base text-signal-text-tertiary max-w-2xl font-mono leading-relaxed">
            SYSTEM STATUS: ONLINE. Syncing all channels to global UTC reference. Everyone watches the same frame, at the same millisecond. No navigation required.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link 
              href="/live" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-signal-surface-raised border border-signal-border-active text-signal-text-primary font-bold text-sm transition-all hover:bg-signal-surface"
            >
              <Play className="w-4 h-4 fill-current text-signal-amber" />
              <span>TUNE IN MASTER</span>
            </Link>
            <Link 
              href="/schedule" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-signal-surface border border-signal-border hover:border-signal-border-active text-signal-text-secondary font-bold text-sm transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>SYSTEM SCHEDULE</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
        
        {/* 2. Flagship Channel Live Now */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-signal-border pb-2">
            <h2 className="text-lg font-bold text-signal-text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-signal-red animate-pulse"></span>
              Primary Feed [LIVE]
            </h2>
            <span className="text-xs font-mono text-signal-text-tertiary">TX: FLAGSHIP_01</span>
          </div>

          <div className="bg-signal-surface border border-signal-border rounded-lg p-1">
            <LiveNowCard channel={flagshipChannel} currentProgram={flagshipState?.currentProgram || null} />
          </div>
        </section>

        {/* 3. Live Across The Network Grid */}
        <section className="space-y-4">
          <div className="border-b border-signal-border pb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-signal-text-primary uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-signal-amber" />
              Auxiliary Feeds
            </h2>
            <span className="text-xs font-mono text-signal-text-tertiary">ROUTING: {channels.length} NODES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => {
              const chState = networkStates[ch.id];
              const progName = chState?.currentProgram?.program.title || "Awaiting telemetry...";
              const catName = chState?.currentProgram?.program.category || "General";
              const timeRange = chState?.currentProgram 
                ? `${chState.currentProgram.startTimeFormatted} - ${chState.currentProgram.endTimeFormatted}` 
                : "--:--:--";

              return (
                <Link 
                  key={ch.id} 
                  href={`/live?channel=${ch.id}`}
                  className="group bg-signal-surface border border-signal-border rounded-md p-4 hover:border-signal-border-active hover:bg-signal-surface-raised transition-all duration-150 flex flex-col justify-between h-40"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-signal-border pb-2">
                      <span className="text-xs font-mono text-signal-text-secondary uppercase tracking-wider">
                        {ch.name}
                      </span>
                      <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-signal-red-dim text-[10px] font-mono text-signal-red">
                        <span className="h-1.5 w-1.5 rounded-full bg-signal-red animate-pulse"></span>
                        TX_ON
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-signal-amber tracking-wider uppercase">
                          {catName}
                        </span>
                        <span className="text-[10px] text-signal-text-tertiary font-mono">
                          {timeRange}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-signal-text-primary truncate">
                        {progName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-signal-text-tertiary mt-2">
                    <span className="truncate max-w-[70%]">{ch.tagline}</span>
                    <span className="text-signal-amber flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>ENGAGE</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Telemetry Showcase */}
        <section className="bg-signal-surface border border-signal-border rounded-lg p-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-signal-amber-dim border border-signal-border text-signal-amber font-mono text-[10px] uppercase">
              System Diagnostics
            </div>
            <h3 className="text-2xl font-bold text-signal-text-primary uppercase tracking-wide">
              UTC Engine Synchronization
            </h3>
            <p className="text-sm text-signal-text-secondary font-mono leading-relaxed">
              Playback positions are calculated mathematically using a global UTC offset. No buffering drift. Instant frame-accurate switching across all global nodes.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-signal-border">
              <div className="space-y-1">
                <span className="text-xl font-mono text-signal-text-primary block">{channels.length}</span>
                <span className="text-[10px] text-signal-text-tertiary font-mono uppercase block">Active Streams</span>
              </div>
              <div className="space-y-1">
                <span className="text-xl font-mono text-signal-text-primary block">&lt; 1s</span>
                <span className="text-[10px] text-signal-text-tertiary font-mono uppercase block">Drift Sync</span>
              </div>
              <div className="space-y-1">
                <span className="text-xl font-mono text-signal-text-primary block">UTC</span>
                <span className="text-[10px] text-signal-text-tertiary font-mono uppercase block">Clock Ref</span>
              </div>
              <div className="space-y-1">
                <span className="text-xl font-mono text-signal-text-primary block">OK</span>
                <span className="text-[10px] text-signal-text-tertiary font-mono uppercase block">System Status</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
