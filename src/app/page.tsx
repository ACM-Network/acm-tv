"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tv, Play, Radio, Calendar, Flame, Library, Activity, Sparkles } from 'lucide-react';
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
      
      // Update flagship channel state
      try {
        const flagState = getBroadcastState(flagshipChannel, now);
        setFlagshipState(flagState);
      } catch (e) {
        console.error("Flagship state error:", e);
      }

      // Update all channels states
      const states: { [key: string]: BroadcastState } = {};
      channels.forEach(ch => {
        try {
          states[ch.id] = getBroadcastState(ch, now);
        } catch (e) {
          // Ignore
        }
      });
      setNetworkStates(states);
    };

    setTimeout(() => {
      setIsMounted(true);
      updateAllStates();
    }, 0);

    const interval = setInterval(updateAllStates, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/25 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Get all unique programs across channels for the Library highlights
  const featuredPrograms = channels.flatMap(c => c.programs).slice(0, 3);

  return (
    <div className="pb-16 space-y-16">
      
      {/* 1. Cinematic Hero Billboard */}
      <section className="relative h-[80vh] min-h-[550px] max-h-[800px] flex items-center overflow-hidden border-b border-zinc-900">
        {/* Background glow orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-red-600/5 to-transparent rounded-full blur-[140px] pointer-events-none"></div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {/* Cinematic Backdrop Image */}
        <div className="absolute inset-0 bg-black">
          <img 
            src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600" 
            alt="ACM Cinematic Billboard"
            className="w-full h-full object-cover opacity-35 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold text-xs tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VIRTUAL LIVE BROADCAST FEEDS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.05] max-w-4xl">
            ACM TV<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
              Entertainment Without Limits
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 max-w-2xl font-medium leading-relaxed">
            Experience television reimagined. No catalog navigation, no endless searching. A completely synchronized, global real-time network feed. Everyone watches the same frame, at the same millisecond.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link 
              href="/live" 
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-sm transition-all shadow-xl shadow-amber-500/15 hover:shadow-amber-500/30 active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>TUNE IN LIVE</span>
            </Link>
            <Link 
              href="/schedule" 
              className="inline-flex items-center gap-2.5 px-6 py-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800/80 text-white font-black text-sm transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>VIEW GUIDE</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* 2. Flagship Channel Live Now */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Radio className="w-5.5 h-5.5 text-red-500 animate-pulse" />
              <span>ON THE AIR NOW</span>
            </h2>
            <span className="text-xs font-semibold text-zinc-500">Flagship Feed</span>
          </div>

          <LiveNowCard channel={flagshipChannel} currentProgram={flagshipState?.currentProgram || null} />
        </section>

        {/* 3. Live Across The Network Grid */}
        <section className="space-y-6">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Activity className="w-5.5 h-5.5 text-amber-500" />
              <span>ACM NETWORK CHANNELS</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Select a feed to tune in directly to that broadcast.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((ch) => {
              const chState = networkStates[ch.id];
              const progName = chState?.currentProgram?.program.title || "Loading schedule...";
              const catName = chState?.currentProgram?.program.category || "General Broadcast";
              const timeRange = chState?.currentProgram 
                ? `${chState.currentProgram.startTimeFormatted} - ${chState.currentProgram.endTimeFormatted}` 
                : "--:--";

              // Color classes based on channel
              const borderColors: { [key: string]: string } = {
                'acm-tv': 'hover:border-amber-500/50',
                'acm-movies': 'hover:border-blue-500/50',
                'acm-music': 'hover:border-pink-500/50',
                'acm-trailers': 'hover:border-emerald-500/50',
                'acm-rcu': 'hover:border-orange-500/50',
              };

              return (
                <Link 
                  key={ch.id} 
                  href={`/live?channel=${ch.id}`}
                  className={`group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 hover:bg-zinc-900/70 transition-all duration-300 flex flex-col justify-between ${borderColors[ch.id] || 'hover:border-zinc-700'}`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                        {ch.name} Network
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 text-[9px] font-bold text-zinc-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        LIVE
                      </span>
                    </div>

                    {/* Program Info */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-amber-500 tracking-wider uppercase block">
                        {catName}
                      </span>
                      <h4 className="text-sm font-bold text-white leading-snug group-hover:text-amber-500 transition-colors truncate">
                        {progName}
                      </h4>
                      <p className="text-xs text-zinc-400 font-medium">
                        {timeRange}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-950 mt-4 flex items-center justify-between text-xs font-bold text-zinc-500">
                    <span>{ch.tagline}</span>
                    <span className="text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Tune in</span>
                      <Play className="w-3 h-3 fill-current" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Network Info & Technology Showcase */}
        <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]"></div>
          
          <div className="max-w-3xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[9px] tracking-widest uppercase">
              TECHNOLOGY FOCUS
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Global UTC-Reference Real-Time Frame Synchronization
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-medium">
              Unlike traditional streaming galleries which buffering introduces offsets, ACM TV schedules and calculates media position on a global UTC clock reference. Every single frame played in London is synced down to the same second in Tokyo. Seamlessly switching programs, idents, and bumpers automatically.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4">
              <div className="border-l-2 border-amber-500 pl-4 space-y-1">
                <span className="text-2xl font-black text-white block">5</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Live Channels</span>
              </div>
              <div className="border-l-2 border-amber-500 pl-4 space-y-1">
                <span className="text-2xl font-black text-white block">&lt; 1s</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Drift Sync</span>
              </div>
              <div className="border-l-2 border-amber-500 pl-4 space-y-1">
                <span className="text-2xl font-black text-white block">100%</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">UTC Engine</span>
              </div>
              <div className="border-l-2 border-amber-500 pl-4 space-y-1">
                <span className="text-2xl font-black text-white block">No-Code</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Admin JSON</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
