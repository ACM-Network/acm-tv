"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Heart } from 'lucide-react';
import { Program } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';

interface HorizontalCarouselProps {
  title: string;
  items: (Program & { channelId?: string; channelName?: string; percentageWatched?: number })[];
  showFavorites?: boolean;
}

export default function HorizontalCarousel({ title, items, showFavorites = false }: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isFavorite, toggleFavorite, isMounted } = useFavorites();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth + 100 : clientWidth - 100;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4 px-4 md:px-8">
        <h2 className="text-xl font-bold text-signal-text-primary tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-1 rounded-sm bg-signal-surface border border-signal-border hover:bg-signal-surface-hover hover:border-signal-border-active transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-signal-text-secondary" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-1 rounded-sm bg-signal-surface border border-signal-border hover:bg-signal-surface-hover hover:border-signal-border-active transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-signal-text-secondary" />
          </button>
        </div>
      </div>

      <div className="relative group/carousel">
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-4 md:px-8 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, idx) => (
            <Link
              key={`${item.id}-${idx}`}
              href={`/program/${item.id}?channel=${item.channelId || 'acm-movies'}`}
              className="relative flex-none w-[200px] sm:w-[240px] md:w-[280px] aspect-video rounded-sm overflow-hidden group snap-start bg-signal-black border border-signal-border hover:border-signal-amber transition-colors duration-300"
            >
              <img 
                src={item.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400"}
                alt={item.title}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-signal-black via-signal-black/40 to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />
              
              <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
                {item.channelName && (
                  <span className="px-1.5 py-0.5 bg-signal-black/90 backdrop-blur-md border border-signal-border text-[9px] font-mono text-signal-text-secondary uppercase rounded-sm">
                    {item.channelName}
                  </span>
                )}
                
                {showFavorites && isMounted && (
                  <button 
                    onClick={(e) => { e.preventDefault(); toggleFavorite(item.id); }}
                    className={`p-1.5 rounded-sm backdrop-blur-md border ml-auto transition-colors ${
                      isFavorite(item.id) ? 'bg-signal-red/20 border-signal-red text-signal-red' : 'bg-signal-black/50 border-signal-border text-signal-text-tertiary hover:text-white hover:border-signal-border-active'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFavorite(item.id) ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>

              {/* Progress Bar for Continue Watching */}
              {item.percentageWatched !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-signal-surface/80">
                  <div 
                    className="h-full bg-signal-amber"
                    style={{ width: `${item.percentageWatched}%` }}
                  />
                </div>
              )}

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between transform translate-y-1 group-hover:translate-y-0 transition-transform">
                <h4 className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">{item.title}</h4>
                <div className="w-8 h-8 rounded-full bg-signal-amber flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all shadow-lg">
                  <Play className="w-4 h-4 fill-signal-black text-signal-black" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
