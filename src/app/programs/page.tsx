"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Film, Clock, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { getRuntimeChannels } from '@/utils/scheduleEngine';
import { Channel, Program } from '@/types';

interface ProgramWithChannel extends Program {
  channelId: string;
  channelName: string;
}

export default function ProgramsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const channels: Channel[] = getRuntimeChannels();

  // Flatten programs from all channels and attach channel metadata
  const allPrograms = useMemo(() => {
    const list: ProgramWithChannel[] = [];
    
    channels.forEach(ch => {
      // Helper to push items from program arrays
      const addPrograms = (progs: Program[]) => {
        progs.forEach(p => {
          // Check if already in list to avoid duplicates
          if (!list.some(existing => existing.id === p.id)) {
            list.push({
              ...p,
              channelId: ch.id,
              channelName: ch.name
            });
          }
        });
      };

      addPrograms(ch.programs);
      if (ch.idents) addPrograms(ch.idents);
      if (ch.promos) addPrograms(ch.promos);
    });

    return list;
  }, [channels]);

  // Types list
  const programTypes = ['all', 'content', 'trailer', 'song', 'promo', 'ident'];

  // Filtered list
  const filteredPrograms = useMemo(() => {
    return allPrograms.filter(prog => {
      const matchesSearch = 
        prog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === 'all' || prog.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [allPrograms, searchQuery, selectedType]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="space-y-3.5 border-b border-zinc-900 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase tracking-wider">
          <Film className="w-3.5 h-3.5 text-amber-500" />
          <span>Broadcast Repository</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
          Program Library
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl leading-relaxed font-medium">
          Browse the listing of films, music videos, RCU featurettes, and channel idents running across the ACM TV broadcast networks.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/40 border border-zinc-900 rounded-3xl p-5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search programs, categories, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {programTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                selectedType === type
                  ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Program Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.map((prog) => (
          <div
            key={prog.id}
            className="group flex flex-col justify-between overflow-hidden bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 shadow-xl transition-all duration-300 hover:border-zinc-700/80 hover:-translate-y-0.5 hover:shadow-amber-500/[0.01]"
          >
            <div className="space-y-4">
              {/* Media Thumbnail */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-zinc-900">
                <img
                  src={prog.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=300"}
                  alt={prog.title}
                  className="w-full h-full object-cover opacity-70 group-hover:scale-[1.02] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                
                {/* Type Tag */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-black/75 border border-zinc-800 text-[8px] font-black text-amber-500 uppercase tracking-widest">
                    {prog.type}
                  </span>
                </div>

                {/* Duration Bumper */}
                <div className="absolute bottom-2 right-2 text-[9px] font-mono font-bold text-zinc-300 bg-black/85 border border-zinc-900 px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>{Math.round(prog.duration / 60)} min</span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400">
                    {prog.channelName}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold truncate">
                    {prog.category}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white leading-snug group-hover:text-amber-500 transition-colors">
                  {prog.title}
                </h4>

                <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-3">
                  {prog.description}
                </p>
              </div>
            </div>

            {/* Tune In Action Footer */}
            <div className="pt-4 border-t border-zinc-950 mt-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500">Live Network Media</span>
              <Link
                href={`/live?channel=${prog.channelId}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white font-bold text-xs transition-colors"
              >
                <span>Tune in Feed</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <div className="text-center py-16 text-zinc-500 bg-zinc-950/20 border border-zinc-900 rounded-3xl">
          <ShieldAlert className="w-10 h-10 mx-auto text-zinc-800 mb-3 animate-pulse" />
          <h4 className="text-base font-bold text-zinc-400">No programs found</h4>
          <p className="text-xs text-zinc-600 mt-1">Try modifying your search keywords or checking another category filter.</p>
        </div>
      )}

    </div>
  );
}
