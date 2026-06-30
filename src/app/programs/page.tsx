"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Film, Clock, Heart, Play, Calendar } from 'lucide-react';
import { getRuntimeChannels } from '@/utils/scheduleEngine';
import { Channel, Program } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';

interface ProgramWithChannel extends Program {
  channelId: string;
  channelName: string;
}

export default function ProgramsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const { isFavorite, toggleFavorite, isMounted } = useFavorites();

  const channels: Channel[] = getRuntimeChannels();

  const allPrograms = useMemo(() => {
    const list: ProgramWithChannel[] = [];
    channels.forEach(ch => {
      const addPrograms = (progs: Program[]) => {
        progs.forEach(p => {
          if (!list.some(existing => existing.id === p.id)) {
            list.push({ ...p, channelId: ch.id, channelName: ch.name });
          }
        });
      };
      addPrograms(ch.programs);
      if (ch.idents) addPrograms(ch.idents);
      if (ch.promos) addPrograms(ch.promos);
    });
    return list;
  }, [channels]);

  const featuredProgram = allPrograms[0];

  const programTypes = ['all', 'content', 'trailer', 'song', 'promo', 'ident'];

  const filteredPrograms = useMemo(() => {
    return allPrograms.filter(prog => {
      const matchesSearch = 
        prog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === 'all' || prog.type === selectedType;
      const matchesChannel = selectedChannel === 'all' || prog.channelId === selectedChannel;
      const matchesFav = showOnlyFavorites ? isFavorite(prog.id) : true;

      return matchesSearch && matchesType && matchesChannel && matchesFav;
    });
  }, [allPrograms, searchQuery, selectedType, selectedChannel, showOnlyFavorites, isFavorite]);

  return (
    <div className="min-h-screen bg-signal-black text-signal-text-primary pb-20">
      
      {/* Hero Section */}
      {featuredProgram && (
        <div className="relative w-full h-[50vh] md:h-[60vh] flex flex-col justify-end">
          <div className="absolute inset-0 bg-signal-black/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-signal-black via-signal-black/80 to-transparent z-10" />
          <img 
            src={featuredProgram.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200"}
            alt={featuredProgram.title}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          
          <div className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-8 pb-12 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 bg-signal-amber text-signal-black text-[10px] font-bold font-mono uppercase rounded-sm">Featured</span>
              <span className="px-2 py-1 bg-signal-surface/80 backdrop-blur-sm border border-signal-border text-signal-text-secondary text-[10px] font-mono uppercase rounded-sm">{featuredProgram.channelName}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-lg mb-4">{featuredProgram.title}</h1>
            <p className="max-w-2xl text-sm md:text-base text-signal-text-secondary line-clamp-2 mb-6 drop-shadow-md">
              {featuredProgram.description}
            </p>
            <div className="flex items-center gap-4">
              <Link 
                href={`/program/${featuredProgram.id}?channel=${featuredProgram.channelId}`}
                className="flex items-center gap-2 px-6 py-3 bg-signal-amber hover:bg-signal-amber-glow text-signal-black rounded-sm font-bold uppercase tracking-wider transition-all"
              >
                <Film className="w-5 h-5 fill-current" />
                <span>View Details</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        
        {/* Filters Bar */}
        <div className="sticky top-16 z-30 bg-signal-black/90 backdrop-blur-xl border-b border-signal-border py-4 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-signal-text-tertiary" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-signal-surface border border-signal-border focus:border-signal-amber/50 rounded-sm pl-9 pr-3 py-2.5 text-sm text-signal-text-primary placeholder-signal-text-tertiary focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="bg-signal-surface border border-signal-border text-xs font-mono uppercase px-3 py-2.5 rounded-sm focus:outline-none focus:border-signal-amber/50 cursor-pointer"
              >
                <option value="all">All Channels</option>
                {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-signal-surface border border-signal-border text-xs font-mono uppercase px-3 py-2.5 rounded-sm focus:outline-none focus:border-signal-amber/50 cursor-pointer"
              >
                {programTypes.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
              </select>

              <button 
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-mono uppercase transition-colors border ${
                  showOnlyFavorites 
                    ? 'bg-signal-red/10 border-signal-red text-signal-red' 
                    : 'bg-signal-surface border-signal-border text-signal-text-secondary hover:text-signal-text-primary hover:border-signal-border-active'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                Favorites
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono text-signal-text-tertiary uppercase">
            <span>{filteredPrograms.length} items found</span>
            <span className="w-1 h-1 bg-signal-border rounded-full" />
            <span>Sorted by relevance</span>
          </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {filteredPrograms.map((prog) => (
            <Link
              href={`/program/${prog.id}?channel=${prog.channelId}`}
              key={prog.id}
              className="group relative flex flex-col bg-signal-surface border border-signal-border rounded-md overflow-hidden hover:border-signal-amber/50 hover:shadow-2xl hover:shadow-signal-amber/10 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative w-full aspect-[2/3] bg-signal-black overflow-hidden">
                <img
                  src={prog.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=300"}
                  alt={prog.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-signal-black via-signal-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                
                {/* Badges */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                  <span className="px-1.5 py-0.5 bg-signal-black/90 backdrop-blur-md border border-signal-border text-[9px] font-mono text-signal-text-secondary uppercase rounded-sm">
                    {prog.channelName}
                  </span>
                  
                  {isMounted && (
                    <button 
                      onClick={(e) => { e.preventDefault(); toggleFavorite(prog.id); }}
                      className={`p-1.5 rounded-sm backdrop-blur-md border transition-colors ${
                        isFavorite(prog.id) ? 'bg-signal-red/20 border-signal-red text-signal-red' : 'bg-signal-black/50 border-signal-border text-signal-text-tertiary hover:text-white hover:border-signal-border-active'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFavorite(prog.id) ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-3 space-y-1 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h4 className="text-sm font-bold text-white line-clamp-2 drop-shadow-md">{prog.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-signal-text-secondary uppercase opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> 2026</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(prog.duration / 60)}M</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPrograms.length === 0 && (
          <div className="text-center py-20 bg-signal-surface/30 border border-signal-border border-dashed rounded-md mt-8">
            <Search className="w-10 h-10 mx-auto text-signal-text-tertiary mb-4" />
            <h4 className="text-lg font-bold text-signal-text-primary uppercase">No Results Found</h4>
            <p className="text-sm text-signal-text-secondary mt-2">Adjust your filters or try a different search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
