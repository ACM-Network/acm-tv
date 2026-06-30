"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Play, Activity, Radio, Tv, Clock, CheckCircle2, ChevronRight, Calendar } from 'lucide-react';
import { Channel, BroadcastState, ProgramInstance } from '@/types';
import { getBroadcastState, getRuntimeChannels, getDailyTimeline, formatLocalTime } from '@/utils/scheduleEngine';
import LiveHeroCarousel from '@/components/LiveHeroCarousel';

export default function Home() {
  const channels: Channel[] = getRuntimeChannels();
  
  // States
  const [networkStates, setNetworkStates] = useState<{ [key: string]: BroadcastState }>({});
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const updateAllStates = () => {
      const now = Date.now();
      setCurrentTimeMs(now);
      const states: { [key: string]: BroadcastState } = {};
      channels.forEach(ch => {
        try { states[ch.id] = getBroadcastState(ch, now); } catch {}
      });
      setNetworkStates(states);
    };

    setTimeout(() => {
      setIsMounted(true);
      updateAllStates();
    }, 0);

    const interval = setInterval(updateAllStates, 5000); // 5s interval for progress bars
    return () => clearInterval(interval);
  }, [channels]);

  // Derived Data
  const acmOwnedIds = ['acm-tv', 'acm-movies', 'acm-music'];
  const featuredChannels = channels.filter(c => acmOwnedIds.includes(c.id));
  const otherChannels = channels.filter(c => !acmOwnedIds.includes(c.id));

  // Pre-calculate upcoming timeline for "Coming Up Next" & "Highlights"
  const allTimelines = useMemo(() => {
    if (!isMounted) return {};
    const timelines: { [key: string]: ProgramInstance[] } = {};
    channels.forEach(ch => {
      timelines[ch.id] = getDailyTimeline(ch, currentTimeMs);
    });
    return timelines;
  }, [channels, isMounted]); // Only recalculate on mount/channels change, not every tick

  // Coming Up Next (Starts within next 2 hours)
  const comingUpNext = useMemo(() => {
    const nextList: { channel: Channel, instance: ProgramInstance }[] = [];
    channels.forEach(ch => {
      const timeline = allTimelines[ch.id] || [];
      const upcoming = timeline.find(inst => inst.startTime > currentTimeMs && inst.program.type === 'content');
      if (upcoming && (upcoming.startTime - currentTimeMs) < 2 * 60 * 60 * 1000) {
        nextList.push({ channel: ch, instance: upcoming });
      }
    });
    return nextList.sort((a, b) => a.instance.startTime - b.instance.startTime).slice(0, 4);
  }, [channels, allTimelines, currentTimeMs]);

  // Today's Highlights (e.g. Movies in the evening)
  const highlights = useMemo(() => {
    const h: { title: string, category: string, channel: Channel, instance: ProgramInstance }[] = [];
    channels.forEach(ch => {
      const timeline = allTimelines[ch.id] || [];
      const primeTime = timeline.find(inst => {
        const hour = new Date(inst.startTime).getHours();
        return inst.program.type === 'content' && inst.program.duration > 1800 && hour >= 18 && hour <= 23 && inst.startTime > currentTimeMs;
      });
      if (primeTime) {
        h.push({
          title: "Prime Time Tonight",
          category: primeTime.program.category,
          channel: ch,
          instance: primeTime
        });
      }
    });
    return h.slice(0, 3);
  }, [channels, allTimelines, currentTimeMs]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-signal-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-signal-border-active border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-signal-black min-h-screen space-y-16">
      
      {/* 1. Live Hero Carousel (Kept exactly as requested) */}
      <LiveHeroCarousel channels={channels} networkStates={networkStates} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* 2. Featured ACM Network (Core Channels) */}
        <section className="space-y-6">
          <div className="border-b border-signal-border pb-3 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Tv className="w-6 h-6 text-signal-amber" />
              Featured Networks
            </h2>
            <span className="text-xs font-mono text-signal-text-tertiary hidden sm:block">ACM Global Broadcasting</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredChannels.map(ch => {
              const state = networkStates[ch.id];
              const prog = state?.currentProgram?.program;
              
              let progressPercent = 0;
              if (state?.currentProgram) {
                const total = state.currentProgram.endTime - state.currentProgram.startTime;
                const elapsed = currentTimeMs - state.currentProgram.startTime;
                progressPercent = Math.max(0, Math.min(100, (elapsed / total) * 100));
              }

              return (
                <Link 
                  key={ch.id} 
                  href={`/live?channel=${ch.id}`}
                  className="group relative bg-signal-surface border border-signal-border rounded-lg overflow-hidden flex flex-col justify-between h-[280px] hover:border-signal-amber transition-all duration-300 shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-signal-black via-signal-black/80 to-transparent z-10" />
                  
                  {prog?.thumbnail && (
                    <img 
                      src={prog.thumbnail} 
                      alt="Background" 
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700 blur-sm"
                    />
                  )}

                  <div className="relative z-20 p-6 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                      <div className="px-3 py-1.5 bg-signal-black/80 backdrop-blur-md border border-signal-border rounded-sm">
                        <span className="text-lg font-black text-white uppercase tracking-wider">{ch.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-signal-red/20 border border-signal-red/50 text-signal-red rounded-sm backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse"></span>
                        <span className="text-[10px] font-bold font-mono tracking-widest">LIVE</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-signal-amber uppercase tracking-widest">{prog?.category || ch.tagline}</span>
                        <h3 className="text-xl font-bold text-white leading-tight drop-shadow-md line-clamp-2 mt-1">
                          {prog?.title || "Sign Off"}
                        </h3>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-signal-text-tertiary uppercase">
                          <span>{state?.currentProgram?.startTimeFormatted || "--:--"}</span>
                          <span>{state?.currentProgram?.endTimeFormatted || "--:--"}</span>
                        </div>
                        <div className="w-full h-1 bg-signal-black/50 rounded-full overflow-hidden border border-signal-border/50">
                          <div className="h-full bg-signal-amber transition-all duration-1000 ease-linear" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                        <span className="text-[10px] font-mono text-signal-text-secondary uppercase">Click to Tune In</span>
                        <Play className="w-4 h-4 text-signal-amber fill-current" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 3. Live Across The Network */}
        <section className="space-y-6">
          <div className="border-b border-signal-border pb-3 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Radio className="w-6 h-6 text-signal-amber" />
              Live Broadcasts
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {channels.map(ch => {
              const state = networkStates[ch.id];
              const prog = state?.currentProgram?.program;
              let progressPercent = 0;
              if (state?.currentProgram) {
                const total = state.currentProgram.endTime - state.currentProgram.startTime;
                const elapsed = currentTimeMs - state.currentProgram.startTime;
                progressPercent = Math.max(0, Math.min(100, (elapsed / total) * 100));
              }

              return (
                <Link 
                  key={ch.id} 
                  href={`/live?channel=${ch.id}`}
                  className="group flex flex-col justify-between bg-signal-surface border border-signal-border rounded-md p-4 hover:border-signal-amber hover:bg-signal-surface-raised transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-signal-black border border-signal-border rounded-sm">
                      <span className="text-xs font-black text-white uppercase">{ch.name.split(' ')[1] || ch.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse"></span>
                      <span className="text-[9px] font-bold font-mono text-signal-red tracking-widest">LIVE</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-signal-amber transition-colors">
                      {prog?.title || ch.name}
                    </h4>
                    <p className="text-[10px] font-mono text-signal-text-tertiary uppercase truncate">
                      {prog?.category || "Broadcast Event"}
                    </p>
                  </div>

                  <div className="mt-auto space-y-2">
                    <div className="w-full h-0.5 bg-signal-black overflow-hidden">
                      <div className="h-full bg-signal-amber transition-all duration-1000 ease-linear" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-signal-text-secondary uppercase">
                      <span>{state?.currentProgram?.startTimeFormatted}</span>
                      <span className="group-hover:text-white transition-colors">TUNE TX &rarr;</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Scheduling & Highlights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Coming Up Next */}
          <section className="bg-signal-surface border border-signal-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-signal-amber" />
              Coming Up Next
            </h3>
            <div className="space-y-0 divide-y divide-signal-border">
              {comingUpNext.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between group">
                  <div>
                    <div className="text-[10px] font-mono text-signal-amber uppercase tracking-wider mb-1">
                      {formatLocalTime(item.instance.startTime)} — {item.channel.name}
                    </div>
                    <h4 className="text-sm font-bold text-signal-text-primary group-hover:text-white transition-colors">
                      {item.instance.program.title}
                    </h4>
                  </div>
                  <Link 
                    href={`/program/${item.instance.program.id}?channel=${item.channel.id}`}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-signal-black border border-signal-border rounded-sm text-[10px] font-mono text-signal-text-secondary hover:text-white transition-all"
                  >
                    Details
                  </Link>
                </div>
              ))}
              {comingUpNext.length === 0 && (
                <div className="text-sm text-signal-text-tertiary font-mono py-4">No major events scheduled in the next 2 hours.</div>
              )}
            </div>
          </section>

          {/* Today's Highlights */}
          <section className="bg-signal-surface border border-signal-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-signal-amber" />
              Broadcast Highlights
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {highlights.map((h, idx) => (
                <Link 
                  key={idx}
                  href={`/program/${h.instance.program.id}?channel=${h.channel.id}`}
                  className="flex items-center gap-4 p-3 bg-signal-black border border-signal-border hover:border-signal-amber/50 rounded-sm group transition-colors"
                >
                  <div className="w-16 h-12 bg-signal-surface border border-signal-border flex items-center justify-center overflow-hidden flex-shrink-0">
                     <img src={h.instance.program.thumbnail} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono bg-signal-surface px-1.5 py-0.5 text-signal-amber uppercase tracking-widest rounded-sm mb-1 inline-block">
                      {h.title}
                    </span>
                    <h4 className="text-sm font-bold text-signal-text-primary group-hover:text-white line-clamp-1">{h.instance.program.title}</h4>
                    <p className="text-[10px] font-mono text-signal-text-secondary mt-0.5 uppercase">{h.channel.name} @ {formatLocalTime(h.instance.startTime)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </div>

        {/* 5. Network Information Dashboard */}
        <section className="bg-signal-black border border-signal-border rounded-lg p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-signal-amber opacity-5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-signal-border pb-4">
              <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-5 h-5 text-signal-amber" />
                  Network Operations
                </h3>
                <p className="text-xs text-signal-text-tertiary font-mono uppercase mt-1">Live Telemetry & Diagnostics</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-signal-surface border border-signal-border rounded-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[10px] font-mono text-signal-text-primary uppercase tracking-widest">Systems Nominal</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-signal-text-secondary uppercase">Active Channels</span>
                <span className="text-3xl font-black text-white font-mono block">{channels.length}</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-signal-text-secondary uppercase">Sync Engine</span>
                <span className="text-xl font-bold text-signal-amber block uppercase tracking-wide mt-1">UTC-Bound</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-signal-text-secondary uppercase">Uptime</span>
                <span className="text-xl font-bold text-white block uppercase tracking-wide mt-1">24 × 7</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-signal-text-secondary uppercase">Bandwidth</span>
                <span className="text-xl font-bold text-white block uppercase tracking-wide mt-1">Adaptive</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Explore Schedule Banner */}
        <section>
          <Link 
            href="/schedule"
            className="group relative block w-full bg-signal-surface border border-signal-border hover:border-signal-amber rounded-lg overflow-hidden transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-signal-amber/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
              <div className="space-y-3">
                <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">
                  Explore The Full Schedule
                </h2>
                <p className="text-sm md:text-base text-signal-text-secondary font-mono">
                  View every channel, every program, and every time slot in our Electronic Program Guide.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2 px-6 py-4 bg-signal-amber text-signal-black font-bold uppercase tracking-widest rounded-sm group-hover:shadow-[0_0_20px_rgba(255,176,0,0.4)] transition-all">
                  Open EPG
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
        </section>

      </div>
    </div>
  );
}
