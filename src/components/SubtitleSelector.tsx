"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Check } from 'lucide-react';

export interface SubtitleTrack {
  id: string | number;
  label: string;
  language: string;
  url: string;
  enabled: boolean;
}

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  onSelectTrack: (trackId: string | number | null) => void;
}

export default function SubtitleSelector({
  tracks,
  onSelectTrack
}: SubtitleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTrack = tracks.find(t => t.enabled);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-full transition-all flex items-center justify-center cursor-pointer text-white hover:text-gray-300 hover:bg-white/10"
        title="Subtitles"
      >
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-64 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50 text-left pointer-events-auto transform transition-all animate-slide-up origin-bottom-right">
          <div className="px-4 py-3 bg-white/5 border-b border-white/10">
            <span className="text-sm font-semibold text-white tracking-wide">Subtitles</span>
          </div>

          <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar space-y-1">
            <button
              onClick={() => {
                onSelectTrack(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !activeTrack
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={!activeTrack ? 'font-semibold' : ''}>Off</span>
              {!activeTrack && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>

            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  onSelectTrack(track.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  track.enabled
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex flex-col text-left gap-0.5">
                  <span className={track.enabled ? 'font-semibold' : ''}>{track.label}</span>
                  {track.language && (
                    <span className="text-[10px] text-white/40 font-normal uppercase tracking-wider">
                      {track.language}
                    </span>
                  )}
                </span>
                {track.enabled && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
