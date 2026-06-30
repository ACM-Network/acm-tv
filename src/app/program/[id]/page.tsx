"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Play, Heart, Share2, ArrowLeft, Clock, Calendar, Film, Info } from 'lucide-react';
import { getRuntimeChannels, findProgramById } from '@/utils/scheduleEngine';
import { useFavorites } from '@/hooks/useFavorites';
import Link from 'next/link';

export default function ProgramDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isFavorite, toggleFavorite, isMounted } = useFavorites();
  const [copied, setCopied] = useState(false);

  const channels = getRuntimeChannels();
  const fallbackChannel = channels[0];
  
  const program = useMemo(() => {
    return findProgramById(params.id, fallbackChannel);
  }, [params.id, fallbackChannel]);

  // Find the exact channel it belongs to, or use query param
  const channelId = searchParams.get('channel') || channels.find(c => 
    c.programs.some(p => p.id === program.id) ||
    (c.idents && c.idents.some(p => p.id === program.id)) ||
    (c.promos && c.promos.some(p => p.id === program.id))
  )?.id || fallbackChannel.id;

  const channel = channels.find(c => c.id === channelId) || fallbackChannel;

  const handleShare = () => {
    const timestamp = Date.now();
    const url = `${window.location.origin}/live?channel=${channel.id}&t=${timestamp}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!program) return null;

  return (
    <div className="min-h-screen bg-signal-black text-signal-text-primary pb-20">
      {/* Hero Backdrop */}
      <div className="relative w-full h-[60vh] md:h-[70vh]">
        <div className="absolute inset-0 bg-signal-black/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-signal-black via-signal-black/60 to-transparent z-10" />
        <img 
          src={program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200"}
          alt={program.title}
          className="w-full h-full object-cover opacity-60"
        />
        
        {/* Top Nav Back */}
        <div className="absolute top-20 left-4 md:left-8 z-20">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 bg-signal-black/50 hover:bg-signal-black/80 backdrop-blur-md rounded-sm border border-signal-border transition-colors text-signal-text-secondary hover:text-signal-text-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Back</span>
          </button>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 w-full z-20 p-4 md:p-12 flex flex-col md:flex-row gap-8 items-end">
          <div className="w-32 md:w-56 flex-shrink-0 rounded-md overflow-hidden border-2 border-signal-border shadow-2xl hidden sm:block transform translate-y-8">
            <img 
              src={program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400"}
              alt={program.title}
              className="w-full h-full object-cover aspect-[2/3]"
            />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-signal-amber text-signal-black text-[10px] font-bold font-mono uppercase rounded-sm">
                {program.type}
              </span>
              <span className="px-2 py-1 bg-signal-surface/80 backdrop-blur-sm border border-signal-border text-signal-text-secondary text-[10px] font-mono uppercase rounded-sm">
                {channel.name}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-lg">
              {program.title}
            </h1>
            
            <div className="flex items-center gap-4 text-[12px] font-mono text-signal-text-secondary uppercase">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(program.duration / 60)} MIN</span>
              <span className="flex items-center gap-1"><Film className="w-3 h-3" /> {program.category}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> 2026</span>
            </div>
            
            <p className="max-w-3xl text-sm md:text-base text-signal-text-primary/90 leading-relaxed drop-shadow-md line-clamp-3">
              {program.description}
            </p>

            <div className="flex items-center gap-3 pt-4">
              <Link 
                href={`/live?channel=${channel.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-signal-amber hover:bg-signal-amber-glow text-signal-black rounded-sm font-bold uppercase tracking-wider transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Watch Live</span>
              </Link>
              
              {isMounted && (
                <button 
                  onClick={() => toggleFavorite(program.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-sm border transition-all ${
                    isFavorite(program.id) 
                      ? 'bg-signal-red/10 border-signal-red text-signal-red' 
                      : 'bg-signal-surface/50 border-signal-border hover:bg-signal-surface text-signal-text-secondary hover:text-signal-text-primary backdrop-blur-sm'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite(program.id) ? 'fill-current' : ''}`} />
                </button>
              )}

              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-3 bg-signal-surface/50 hover:bg-signal-surface backdrop-blur-sm border border-signal-border rounded-sm text-signal-text-secondary hover:text-signal-text-primary transition-all relative"
              >
                <Share2 className="w-5 h-5" />
                {copied && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-signal-black border border-signal-border text-[10px] font-mono text-signal-amber rounded-sm whitespace-nowrap animate-fade-in">
                    Link Copied!
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 md:mt-24 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-wide flex items-center gap-2">
              <Info className="w-5 h-5 text-signal-amber" />
              Synopsis
            </h3>
            <p className="text-signal-text-secondary leading-relaxed">
              {program.description}
            </p>
          </section>
          
          <section className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-wide">Cast & Crew</h3>
            <div className="flex items-center gap-4 text-sm text-signal-text-secondary italic">
              Metadata block not yet populated by broadcast payload.
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-signal-surface border border-signal-border rounded-md p-6 space-y-4">
            <h4 className="text-sm font-bold uppercase text-signal-amber tracking-wider border-b border-signal-border pb-2">Broadcast Info</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-signal-text-tertiary">Network</span>
                <span className="font-mono text-signal-text-primary uppercase">{channel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-signal-text-tertiary">Node ID</span>
                <span className="font-mono text-signal-text-primary uppercase">{channel.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-signal-text-tertiary">Status</span>
                <span className="font-mono text-signal-amber uppercase">In Rotation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
