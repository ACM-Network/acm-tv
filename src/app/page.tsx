"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Play, Activity, Sparkles } from 'lucide-react';
import { Channel, BroadcastState, Program } from '@/types';
import { getBroadcastState, getRuntimeChannels, findProgramById } from '@/utils/scheduleEngine';
import LiveNowCard from '@/components/LiveNowCard';
import LiveHeroCarousel from '@/components/LiveHeroCarousel';
import HorizontalCarousel from '@/components/HorizontalCarousel';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useFavorites } from '@/hooks/useFavorites';

export default function Home() {
  const channels: Channel[] = getRuntimeChannels();
  const flagshipChannel = channels.find(c => c.id === 'acm-tv') || channels[0];

  const [flagshipState, setFlagshipState] = useState<BroadcastState | null>(null);
  const [networkStates, setNetworkStates] = useState<{ [key: string]: BroadcastState }>({});
  const [isMounted, setIsMounted] = useState(false);

  const { history } = useWatchHistory();
  const { favorites } = useFavorites();

  useEffect(() => {
    const updateAllStates = () => {
      const now = Date.now();
      try {
        setFlagshipState(getBroadcastState(flagshipChannel, now));
      } catch (e) {}

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

    const interval = setInterval(updateAllStates, 5000);
    return () => clearInterval(interval);
  }, [channels, flagshipChannel]);

  // Aggregate all programs for carousels
  const allPrograms = useMemo(() => {
    const list: (Program & { channelId: string; channelName: string })[] = [];
    channels.forEach(ch => {
      const addPrograms = (progs: Program[]) => {
        progs.forEach(p => {
          if (!list.some(existing => existing.id === p.id)) {
            list.push({ ...p, channelId: ch.id, channelName: ch.name });
          }
        });
      };
      if (ch.programs) addPrograms(ch.programs);
      if (ch.idents) addPrograms(ch.idents);
      if (ch.promos) addPrograms(ch.promos);
    });
    return list;
  }, [channels]);

  // Build Carousel Data
  const continueWatchingItems = useMemo(() => {
    return history.map(h => {
      const p = findProgramById(h.programId, flagshipChannel);
      return { ...p, channelId: h.channelId, percentageWatched: h.percentageWatched };
    });
  }, [history, flagshipChannel]);

  const favoriteItems = useMemo(() => {
    return favorites.map(id => {
      const p = findProgramById(id, flagshipChannel);
      const chId = allPrograms.find(x => x.id === id)?.channelId || flagshipChannel.id;
      return { ...p, channelId: chId };
    });
  }, [favorites, flagshipChannel, allPrograms]);

  const currentlyLiveItems = useMemo(() => {
    return Object.entries(networkStates)
      .map(([chId, state]) => {
        if (state.currentProgram) {
          const ch = channels.find(c => c.id === chId);
          return {
            ...state.currentProgram.program,
            channelId: chId,
            channelName: ch?.name || chId
          };
        }
        return null;
      })
      .filter(Boolean) as (Program & { channelId: string; channelName: string })[];
  }, [networkStates, channels]);

  const trendingItems = useMemo(() => {
    // Just a slice for demonstration
    return allPrograms.slice(0, 10);
  }, [allPrograms]);

  const recentlyAddedItems = useMemo(() => {
    return allPrograms.slice(10, 20);
  }, [allPrograms]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-signal-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-signal-border-active border-t-signal-amber rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-16 space-y-2 bg-signal-black min-h-screen">
      
      {/* 1. Live Hero Carousel */}
      <LiveHeroCarousel channels={channels} networkStates={networkStates} />

      <div className="max-w-[1600px] mx-auto space-y-4">
        
        {/* New Horizontal Carousels */}
        {continueWatchingItems.length > 0 && (
          <HorizontalCarousel title="Continue Watching" items={continueWatchingItems} />
        )}
        
        {favoriteItems.length > 0 && (
          <HorizontalCarousel title="Your Favorites" items={favoriteItems} showFavorites />
        )}

        <HorizontalCarousel title="Currently Live" items={currentlyLiveItems} showFavorites />
        
        <HorizontalCarousel title="Trending Now" items={trendingItems} showFavorites />
        
        <HorizontalCarousel title="Recently Added" items={recentlyAddedItems} showFavorites />

      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12 mt-12">
        {/* Legacy Grids */}
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
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
