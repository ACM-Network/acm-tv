"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Headphones, Check, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AudioTrack {
  id: string | number;
  label: string;
  language: string;
  enabled: boolean;
}

interface AudioTrackSelectorProps {
  tracks: AudioTrack[];
  onSelectTrack: (trackId: string | number) => void;
  hasNativeSupport: boolean;
}

export default function AudioTrackSelector({
  tracks,
  onSelectTrack,
  hasNativeSupport
}: AudioTrackSelectorProps) {
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

  // Determine button/menu state
  const isDisabled = !hasNativeSupport || tracks.length <= 1;
  const activeTrack = tracks.find(t => t.enabled);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Dropdown Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Always allow opening the menu to show the fallback error if no native support
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border text-white transition-all flex items-center gap-1.5 cursor-pointer ${
          isDisabled && !isOpen
            ? 'opacity-50 border-zinc-800 text-zinc-400 hover:bg-zinc-900/60'
            : 'border-zinc-800 active:scale-95'
        }`}
        title={!hasNativeSupport ? "Audio Tracks (Unsupported)" : "Audio Tracks"}
      >
        <Headphones className="w-4 h-4" />
        <span className="text-xs font-bold tracking-wide hidden sm:inline">
          {activeTrack && hasNativeSupport ? activeTrack.label : 'Audio'}
        </span>
      </button>

      {/* Dropdown Menu Panel (rendered above controls bar since bar is at the bottom) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-1.5 z-50 text-left pointer-events-auto"
          >
            {/* Header / Title */}
            <div className="px-3 py-2 text-[10px] font-black text-zinc-500 tracking-widest uppercase border-b border-zinc-900 mb-1.5 flex items-center justify-between">
              <span>🔊 Audio Tracks</span>
              {!hasNativeSupport && (
                <span className="text-red-500 text-[8px] font-bold bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">
                  UNSUPPORTED
                </span>
              )}
            </div>

            {/* Content Cases */}
            {!hasNativeSupport ? (
              // Browser Fallback Message
              <div className="px-3 py-3 text-center space-y-2 select-none">
                <HelpCircle className="w-6 h-6 text-zinc-500 mx-auto" />
                <p className="text-[11px] font-semibold text-zinc-400 leading-normal">
                  Multiple audio tracks are not supported by this browser.
                </p>
                <div className="text-[9px] text-zinc-600 leading-normal">
                  Try Safari or a browser with native track support.
                </div>
              </div>
            ) : tracks.length <= 1 ? (
              // Only 1 track available
              <div className="px-3 py-2 text-[11px] text-zinc-400 select-none italic text-center">
                Single audio track file.
              </div>
            ) : (
              // Available Tracks List
              <div className="space-y-0.5">
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
                      {track.language && track.language !== 'und' && (
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                          Language: {track.language}
                        </span>
                      )}
                    </span>
                    {track.enabled && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
