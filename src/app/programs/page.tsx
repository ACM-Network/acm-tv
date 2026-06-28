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

  // Computed inside the component for SSR safety and reactivity
  const channels: Channel[] = getRuntimeChannels();

  const allPrograms = useMemo(() => {
    const list: ProgramWithChannel[] = [];
    
    channels.forEach(ch => {
      const addPrograms = (progs: Program[]) => {
        progs.forEach(p => {
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

  const programTypes = ['all', 'content', 'trailer', 'song', 'promo', 'ident'];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-signal-black min-h-screen">
      
      {/* Page Header */}
      <div className="space-y-4 border-b border-signal-border pb-4">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-signal-surface border border-signal-border text-signal-text-secondary font-mono text-[10px] uppercase tracking-wider">
          <Film className="w-3.5 h-3.5 text-signal-amber" />
          <span>ASSET REPOSITORY</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-signal-text-primary tracking-tight">
          System Content Index
        </h1>
        <p className="text-sm text-signal-text-tertiary max-w-xl font-mono">
          Querying all indexed media payloads across broadcast networks. Search for specific featurettes, music tracks, or network idents.
        </p>
      </div>

      {/* Search & Filter Pane */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-signal-surface border border-signal-border rounded-md p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-signal-text-tertiary" />
          <input
            type="text"
            placeholder="QUERY METADATA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-signal-black border border-signal-border focus:border-signal-border-active rounded-sm pl-9 pr-3 py-2 text-sm text-signal-text-primary font-mono placeholder-signal-text-tertiary focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {programTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-all border ${
                selectedType === type
                  ? 'bg-signal-amber-dim text-signal-amber border-signal-border-active'
                  : 'bg-signal-black text-signal-text-secondary border-signal-border hover:text-signal-text-primary hover:border-signal-border-active'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.map((prog) => (
          <div
            key={prog.id}
            className="group flex flex-col justify-between bg-signal-surface border border-signal-border rounded-md p-3 hover:border-signal-border-active hover:bg-signal-surface-raised transition-all duration-150 min-h-[340px]"
          >
            <div className="space-y-3">
              <div className="relative w-full aspect-video rounded-sm overflow-hidden bg-signal-black border border-signal-border">
                <img
                  src={prog.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=300"}
                  alt={prog.title}
                  className="w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:opacity-100 group-hover:mix-blend-normal transition-all duration-300"
                />
                
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-signal-black/90 border border-signal-border text-[8px] font-mono text-signal-amber uppercase tracking-widest">
                    {prog.type}
                  </span>
                </div>

                <div className="absolute bottom-1.5 right-1.5 text-[9px] font-mono text-signal-text-secondary bg-signal-black/90 border border-signal-border px-1.5 py-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-signal-amber" />
                  <span>{Math.round(prog.duration / 60)}M</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-signal-black border border-signal-border text-[9px] font-mono text-signal-text-secondary uppercase">
                    {prog.channelName}
                  </span>
                  <span className="text-[10px] text-signal-text-tertiary font-mono truncate uppercase">
                    {prog.category}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-signal-text-primary line-clamp-1 group-hover:text-signal-amber transition-colors">
                  {prog.title}
                </h4>

                <p className="text-[11px] text-signal-text-secondary font-mono leading-relaxed line-clamp-3">
                  {prog.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-signal-border mt-3 flex items-center justify-between">
              <span className="text-[9px] font-mono text-signal-text-tertiary uppercase">ROUTING OK</span>
              <Link
                href={`/live?channel=${prog.channelId}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-signal-black border border-signal-border hover:border-signal-border-active text-signal-text-primary font-mono text-[10px] transition-colors"
              >
                <span>TUNE TX</span>
                <ArrowUpRight className="w-3 h-3 text-signal-amber" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <div className="text-center py-12 bg-signal-surface border border-signal-border rounded-md">
          <ShieldAlert className="w-8 h-8 mx-auto text-signal-red mb-3 animate-pulse" />
          <h4 className="text-sm font-bold text-signal-text-primary uppercase">NO METADATA MATCH</h4>
          <p className="text-[11px] text-signal-text-tertiary font-mono mt-2 uppercase">ADJUST QUERY PARAMETERS.</p>
        </div>
      )}

    </div>
  );
}
