"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Close dropdown on clicking outside
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
      {/* Dropdown Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        title="Subtitles"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-xs font-bold tracking-wide hidden sm:inline">
          {activeTrack ? activeTrack.label : 'Subtitles'}
        </span>
      </button>

      {/* Dropdown Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-1.5 z-50 text-left pointer-events-auto"
          >
            {/* Header */}
            <div className="px-3 py-2 text-[10px] font-black text-zinc-500 tracking-widest uppercase border-b border-zinc-900 mb-1.5">
              💬 Subtitles
            </div>

            {/* List */}
            <div className="space-y-0.5">
              {/* "Off" option */}
              <button
                onClick={() => {
                  onSelectTrack(null);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  !activeTrack
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                }`}
              >
                <span>None / Off</span>
                {!activeTrack && (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </button>

              {/* Dynamic Tracks */}
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(track.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    track.enabled
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="flex flex-col text-left">
                    <span>{track.label}</span>
                    {track.language && (
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                        Lang: {track.language}
                      </span>
                    )}
                  </span>
                  {track.enabled && (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
